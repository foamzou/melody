const logger = require('consola');
const AccountService = require('../service/account');
const WYAPI = require('../service/music_platform/wycloud');

async function get(req, res) {
    res.send({
        status: 0,
        data: {
            account: await getWyAccountInfo(req.account.uid)
        }
    });
}

async function set(req, res) {
    const accountName = req.body.account;
    const password = req.body.password;
    if (!accountName || !password) {
        res.status(422).send({
            status: 1,
            message: 'account or password is empty',
            data: {}
        });
        return;
    }

    const ret = await AccountService.setAccount(req.account.uid, accountName, password);
    res.send({
        status: ret ? 0 : 1,
        data: {
            account: await getWyAccountInfo(req.account.uid)
        }
    });
}

async function getWyAccountInfo(uid) {
    const account = AccountService.getAccount(uid)
    const wyInfo = await WYAPI.getMyAccount(uid);
    account.wyAccount = wyInfo;
    return account;
}

module.exports = {
    get: get,
    set: set,
}