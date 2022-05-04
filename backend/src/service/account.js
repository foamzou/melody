const AccountPath = __dirname + '/../../.profile/accounts.json';
const CookiePath = __dirname + '/../../.profile/cookie/';
let AccountMap = require(AccountPath);
const logger = require('consola');
const locker = require('../utils/simple_locker');
const fs = require('fs');

module.exports = {
    getAccount: getAccount,
    setAccount: setAccount,
}

function getAccount(uid) {
    const account = AccountMap[uid];
    if (!account) {
        logger.error(`the uid(${uid}) does not existed`);
        return false;
    }
    account.uid = uid;
    return account;
}

async function setAccount(uid, account, password) {
    const lockKey = 'setAccount';
    await locker.lock(lockKey, 5);

    refreshAccountFromFile();

    const userAccount = getAccount(uid);
    if (!userAccount) {
        locker.unlock(lockKey);
        return false;
    }
    if (userAccount.account == account && userAccount.password == password) {
        locker.unlock(lockKey);
        return true;
    }
    userAccount.account = account;
    userAccount.password = password;
    AccountMap[uid] = userAccount;

    storeAccount(AccountMap);
    locker.unlock(lockKey);

    // clear cookie
    try {
        fs.unlinkSync(CookiePath + uid);
    } catch(_){}
    
    return true;
}

function refreshAccountFromFile() {
    AccountMap = JSON.parse(fs.readFileSync(AccountPath).toString());
}

function storeAccount(account) {
    fs.writeFileSync(AccountPath, JSON.stringify(account, null, 4));
}


