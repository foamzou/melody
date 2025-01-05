const AccountPath = __dirname + '/../../.profile/accounts.json';
const CookiePath = __dirname + '/../../.profile/cookie/';
let AccountMap = require(AccountPath);
const logger = require('consola');
const locker = require('../utils/simple_locker');
const fs = require('fs');
const SoundQuality = require('../consts/sound_quality');
const schedulerService = require('../service/scheduler');


module.exports = {
    getAccount: getAccount,
    setAccount: setAccount,
    getAllAccounts: getAllAccounts,
    getAllAccountsWithoutSensitiveInfo: getAllAccountsWithoutSensitiveInfo,
}

const defaultConfig = {
    playlistSyncToWyCloudDisk: {
        autoSync: {
          enable: false,
          frequency: 1,
          frequencyUnit: "day",
        },
        syncWySong: true,
        syncNotWySong: false,
        soundQualityPreference: SoundQuality.High,
    },
};

function getAccount(uid) {
    const account = AccountMap[uid];
    if (!account) {
        logger.error(`the uid(${uid}) does not existed`);
        return false;
    }
    if (!account.config) {
        account.config = defaultConfig;
    }
    if (!account.config.playlistSyncToWyCloudDisk) {
        account.config.playlistSyncToWyCloudDisk = defaultConfig.playlistSyncToWyCloudDisk;
    }
    account.uid = uid;
    return account;
}

async function setAccount(uid, loginType, account, password, countryCode = '', config, name) {
    const lockKey = 'setAccount';
    await locker.lock(lockKey, 5);

    refreshAccountFromFile();

    const userAccount = getAccount(uid);
    if (!userAccount) {
        locker.unlock(lockKey);
        return false;
    }

    const oldAccount = userAccount;

    userAccount.loginType = loginType;
    userAccount.account = account;
    userAccount.password = password;
    userAccount.countryCode = countryCode;
    if (name) {
        userAccount.name = name;
    }

    if (config) {
        userAccount.config = config;
    }

    AccountMap[uid] = userAccount;

    storeAccount(AccountMap);
    locker.unlock(lockKey);

    // clear cookie
    try {
        fs.unlinkSync(CookiePath + uid);
    } catch(_){}
    
    // 重启调度器以应用新的账号配置
    if (config && JSON.stringify(oldAccount?.config?.playlistSyncToWyCloudDisk) !== 
    JSON.stringify(config.playlistSyncToWyCloudDisk)) {
        await schedulerService.updateCloudSyncJob(uid);
    }
    
    return true;
}

function refreshAccountFromFile() {
    AccountMap = JSON.parse(fs.readFileSync(AccountPath).toString());
}

function storeAccount(account) {
    fs.writeFileSync(AccountPath, JSON.stringify(account, null, 4));
}

async function getAllAccounts() {
    refreshAccountFromFile();
    return AccountMap;
}

async function getAllAccountsWithoutSensitiveInfo() {
    refreshAccountFromFile();
    const filteredAccounts = {};
    for (const [uid, account] of Object.entries(AccountMap)) {
        filteredAccounts[uid] = {
            name: account.name || uid,
            uid: account.uid
        };
    }
    return filteredAccounts;
}


