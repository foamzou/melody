const fs = require('fs');
const crypto = require('crypto');

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

const fsPromise = fs.promises;
async function asyncMoveFile(oldPath, newPath) {
    await fsPromise.copyFile(oldPath, newPath)
    await fsPromise.unlink(oldPath);
}

function asyncReadDir(dirPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(dirPath, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(files);
        }
    )});
}

async function asyncMd5(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => {
            hash.update(data);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (error) => {
            reject(error);
        });
    });
}

module.exports = {
    asyncReadFile,
    asyncWriteFile,
    asyncFileExisted,
    asyncMkdir,
    asyncUnlinkFile,
    asyncMoveFile,
    asyncReadDir,
    asyncMd5,
};