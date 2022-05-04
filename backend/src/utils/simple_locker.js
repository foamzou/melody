const lockMap = {};
const sleep = require('./sleep');

async function lock(key, expireSeconds = 20) {
    let retryCount = 20;
    while (--retryCount >= 0) {
        if (!lockMap[key]) {
            lockMap[key] = true;

            setTimeout(() => {
                delete lockMap[key];
            }, expireSeconds * 1000);

            return true;
        }
        await sleep(200);
    }
    
    return false;
}

function unlock(key) {
    delete lockMap[key];
}


module.exports = {
    lock: lock,
    unlock: unlock,
};