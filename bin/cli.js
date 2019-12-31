#!/usr/bin/env node
const cac = require("cac");
const pkg = require("../package.json");

const cli = cac("cli");

cli
    .command("create <name>", '创建一个路由文件和试图层文件')
    .action((name, options) => {
        require("../lib/create-router")(name, options)
    });

cli.parse();

cli.version(pkg.version);

cli.help();
