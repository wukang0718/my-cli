function upperCase (word) {
    if (/-|_/.test(word)) {
        let arr = word.split(/-|_/);
        return arr.map((item, index) => {
            if (index !== 0) {
                item = item[0].toUpperCase() + item.slice(1);
            }
            return item
        }).join("")
    } else {
        return word
    }
}

function to(asyncFun) {
    return asyncFun.then(data => [null, data])
        .catch(err => [err, null])
}

module.exports = {
    upperCase,
    to
};
