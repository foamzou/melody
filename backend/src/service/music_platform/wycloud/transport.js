const logger = require('consola');
const AccountService = require('../../account');
const { login_cellphone, login_refresh, login } = require('NeteaseCloudMusicApi');
const CookiePath = `${__dirname}/../../../../.profile/cookie/`;
const fs = require('fs');


const LoginTypePhone = 'phone';
const LoginTypeEmail = 'email';

const CookieMap = {};

async function requestApi(uid, moduleFunc, request = {}, cookieRequired = true) {
    if (cookieRequired) {
        let cookie = await getCookie(uid);
        if (!cookie) {
            logger.error(`uid(${uid}) get cookie failed`);
            return false;
        }
        request.cookie = cookie;
    }

    let response = await requestWyyApi(moduleFunc, request);
    // need refresh
    if (response && response.status == 301) {
        cookie = await getCookie(uid, true);
        if (!cookie) {
            logger.error(`uid(${uid}) refresh cookie failed. request api abort`);
            return false;
        }

        // retry request
        request.cookie = cookie;
        response = await requestWyyApi(moduleFunc, request);
    }

    if (response && response.status == 200) {
        return response.body;
    }

    logger.error(`requestWyyApi respond non 200, response: `, response);
    return false;
}

async function requestWyyApi(moduleFunc, request) {
    return moduleFunc(request).then(response => {
        return response;
    }).catch(err => {
        console.log(err)

        logger.error(`requestWyyApi failed: `, err);
        if (typeof err == 'object' && err.status == '301') {
            return err;
        }
        return false;
    });
}


async function getCookie(uid, refresh = false) {
    const account = AccountService.getAccount(uid);
    if (!account) {
        return false;
    }

    // fetch from cache
    const cookieFromCache = fetchCookieFromCache(uid, account);
    if (cookieFromCache) {
        if (!refresh) {
            return cookieFromCache;
        }

        logger.info('refresh cookie...', cookieFromCache);
        const response = await requestWyyApi(login_refresh, {cookie: cookieFromCache});
        if (response && response.status == 200 && response.cookie && response.cookie.length > 1) {
            const cookie = response.cookie.map(line => line.replace('HTTPOnly', '')).join(';');
            logger.info('refresh cookie succeed, ', cookie);
            storeCookie(uid, account, cookie);
            return cookie;
        }
        logger.info(`refresh failed, try login again`);
    }

    // login
    logger.info(`uid(${uid}) login with ${account.countryCode} ${account.account} via ${account.loginType}`);

    let result;
    if (account.loginType === LoginTypePhone) {
        result = await requestWyyApi(login_cellphone, {
            countrycode: account.countrycode,
            phone: account.account,
            password: account.password,
        });   
    } else if (account.loginType === LoginTypeEmail) {
        result = await requestWyyApi(login, {
            email: account.account,
            password: account.password,
        });
    } else {
        if (account.loginType === 'qrcode') {
            logger.error(`uid(${uid})'s loginType(${account.loginType}) does not support auto login, please login in the browser page first`);
        } else {
            logger.error(`uid(${uid})'s loginType(${account.loginType}) does not support now`);
        }
        return false;
    }

    if (result && result.status == 200 && result.body && result.body.code == 200 && result.body.cookie) {
        logger.info(`uid(${uid}) login succeed`)
        storeCookie(uid, account, result.body.cookie);
        return result.body.cookie;
    }
    logger.error(`fetch cookie from response failed, uid(${uid}) login failed`, result);
    return false;
}

function storeCookie(uid, account, cookie) {
    fs.writeFileSync(getCookieFilePath(uid, account), cookie);
    CookieMap[getCookieMapKey(uid, account)] = cookie;
}

function fetchCookieFromCache(uid, account) {
    const cacheKey = getCookieMapKey(uid, account);
    if (CookieMap[cacheKey]) {
        return CookieMap[cacheKey];
    }
    const CookieFile = getCookieFilePath(uid, account);
    
    if (!fs.existsSync(CookieFile)) {
        logger.info(`uid(${uid})'s cookie not found from .profile`);
        return null;
    }

    const cookie = fs.readFileSync(CookieFile).toString();
    CookieMap[cacheKey] = cookie;
    
    return cookie;
}

function getCookieMapKey(uid, account) {
    return `${uid}-${account.platform}-${account.account}`;
}

function getCookieFilePath(uid, account) {
    return `${CookiePath}${uid}-${account.platform}-${account.account}`;
}

module.exports = {
    requestApi,
    storeCookie,
}