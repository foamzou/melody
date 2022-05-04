const fs = require('fs');

function asyncReadFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

function asyncWriteFile(filePath, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function asyncFileExisted(filePath) {
    return new Promise((resolve, reject) => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
}

function asyncMkdir(dirPath, options) {
    return new Promise((resolve, reject) => {
        fs.mkdir(dirPath, options, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function asyncUnlinkFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

module.exports = {
    asyncReadFile,
    asyncWriteFile,
    asyncFileExisted,
    asyncMkdir,
};