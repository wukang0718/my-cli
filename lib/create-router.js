const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const projectPath = process.cwd();
const {upperCase} = require("./utils");

class CreateRouter {
    constructor(name) {
        this.name = name;
        this.routerName = upperCase(name);
        this.routerPath = path.join(projectPath, './src/router/');
        this.viewPath = path.join(projectPath, "./src/views/");
    }

    init() {
        return Promise.all([this.createRouter(), this.createViews()])
    }

    createDir(dirPath) {
        return new Promise((resolve, reject) => {
            fs.mkdir(path.join(dirPath, this.name), err => {
                err ? reject(err) : resolve(path.join(dirPath, this.name))
            })
        })
    }

    routerTemplate() {
        const name = this.name;
        const routerName = this.routerName;
        return `
export default {
    path: "${routerName}",
    name: "${name}",
    component: () => import("../../views/${name}"),
    redirect: '${routerName}/index',
    children: [
        {
            path: 'index',
            name: '${name}-index',
            component: () => import("../../views/${name}/${name}")
        }
    ]
}
        `
    }

    vueIndexTemplate() {
        return `
<template>
    <keep-alive>
        <router-view/>
    </keep-alive>
</template>

<script>
    export default {
        name: "${this.name}-index"
    }
</script>

<style scoped lang="scss">

</style>
        `
    }

    vueTemplate() {
        return `
<template>
    <div>${this.name}</div>
</template>

<script>
    export default {
        name: "${this.name}"
    }
</script>

<style scoped lang="scss">

</style>
        `
    }

    writeRouteIndex() {
        return new Promise((resolve, reject) => {
            fs.readFile(path.join(this.routerPath, 'index.js'), (err, data) => {
                if (err) {
                    reject(err);
                }
                const routerName = this.routerName[0].toUpperCase() + this.routerName.slice(1);
                let fileData = data.toString().split("\n");

                let addImport = true;
                let routerNum = false;
                let routerIndex = 0;
                for (let i = 0; i < fileData.length; i++) {
                    /*
                    * 找到文件中的最后一个import的位置
                    * 插入一条新的import
                    * */
                    if (!/^import/.test(fileData[i]) && addImport) {
                        fileData.splice(i, 0, `import ${routerName} from "./${this.name}"`);
                        addImport = false;
                    }

                    if (addImport) {
                        // 如果还没有插入新的import语句先不走下面的插入
                        continue;
                    }
                    /*
                     * 找到子路由存放为位置
                     * 插入一个新的子路由
                     */
                    if (/(\"|\')?routes(\"|\')?: *\[/.test(fileData[i])) {
                        routerNum = 0;
                        routerIndex = i;
                    }

                    if (!routerIndex) {
                        continue;
                    }

                    if (/\[/.test(fileData[i])) {
                        routerNum++;
                    }

                    if (/\]/.test(fileData[i])) {
                        routerNum++;
                        if (routerNum % 2 === 0) {
                            // 循环到了routes结束就可以停止了
                            let routerArray = fileData.slice(routerIndex, i + 1);

                            let helloIndex = 0;
                            let helloOutIndex = 0;
                            let hasChild = false;
                            for (let index = 0; index < routerArray.length; index++) {
                                let item = routerArray[index];
                                if (/(\"|\')?path(\"|\')?:( )*(\"|\')\/hello(\"|\'),/.test(item)) {
                                    helloIndex = 1;
                                    helloOutIndex = 1;
                                }

                                if (helloIndex === 0) {
                                    continue
                                }
                                if (/\{/.test(item)) {
                                    helloOutIndex++;
                                }

                                if (/(\"|\')?children(\"|\')?: \[/.test(item)) {
                                    hasChild = true;
                                }
                                if (hasChild && /\]/.test(item)) {
                                    // 匹配到了children 并且匹配到了]
                                    let newRoute = routerArray[index - 1].replace(/\w+/, routerName);
                                    if (!routerArray[index - 1].endsWith(",")) {
                                        // 要在最后一个位置结尾加,
                                        routerArray[index - 1] = routerArray[index - 1] + ",";
                                    }
                                    routerArray.splice(index, 0, newRoute);
                                    break
                                }
                                if (/\}/.test(item)) {
                                    helloOutIndex++;

                                    if (helloOutIndex % 2 === 0 && !hasChild) {
                                        // 检查到了hello路由的外层大花括号 => 此时没有children数组
                                        let array = [];
                                        array.push(routerArray[index - 1].replace(/\S+/, "children: ["));
                                        array.push(routerArray[index - 1].replace(/\S+/, `    ${routerName}`));
                                        array.push(routerArray[index - 1].replace(/\S+/, "]"));
                                        if (!routerArray[index - 1].endsWith(",")) {
                                            // 要在最后一个位置结尾加,
                                            routerArray[index - 1] = routerArray[index - 1] + ",";
                                        }
                                        routerArray.splice(index, 0, ...array);
                                        break
                                    }
                                }
                            }
                            fileData.splice(routerIndex, i - routerIndex + 1, ...routerArray);
                            fs.writeFile(path.join(this.routerPath, 'index.js'), fileData.join("\n"), (err => {
                                err ? reject(err) : resolve()
                            }));
                            break
                        }
                    }
                }

            })
        })
    }

    createRouter() {
        return new Promise(async (resolve, reject) => {
            const res = await this.createDir(this.routerPath);
            Promise.all([
                fs.writeFile(path.join(res, 'index.js'), this.routerTemplate().trim(), (err) => {
                    if (err) {
                        reject(err);
                    }
                }),
                this.writeRouteIndex().catch(err => reject(err))
            ]).then(() => {
                resolve()
            }).catch(err => {
                reject(err)
            });

        })
    }

    createViews() {
        return new Promise(async (resolve, reject) => {
            const res = await this.createDir(this.viewPath);
            fs.writeFile(path.join(res, 'index.vue'), this.vueIndexTemplate().trim(), (err) => {
                err ? reject(err) : resolve()
            });
            fs.writeFile(path.join(res, this.name + '.vue'), this.vueTemplate().trim(), (err) => {
                err ? reject(err) : resolve()
            })
        })
    }

}

module.exports = function (name, options) {
    const createRouter = new CreateRouter(name, options);
    createRouter.init().then(() => {
        console.log(chalk.green("创建成功"));
    }).catch((err) => {
        console.error(chalk.red("创建失败"));
        console.error(chalk.red(err));
    });
};
