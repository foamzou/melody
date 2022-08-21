const AccountService = require('../service/account');
const WYAPI = require('../service/music_platform/wycloud');
const { storeCookie } = require('../service/music_platform/wycloud/transport.js');

async function get(req, res) {
    res.send({
        status: 0,
        data: {
            account: await getWyAccountInfo(req.account.uid)
        }
    });
}

async function set(req, res) {
    const loginType = req.body.loginType;
    const accountName = req.body.account;
    const password = req.body.password;
    const countryCode = req.body.countryCode;
    if (!accountName || !password) {
        res.status(422).send({
            status: 1,
            message: 'account or password is empty',
            data: {}
        });
        return;
    }

    const ret = await AccountService.setAccount(req.account.uid, loginType, accountName, password, countryCode);
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

async function qrLoginCreate(req, res) {
    const qrData = await WYAPI.qrLoginCreate(req.account.uid);
    if (qrData === false) {
        res.status(500).send({
            status: 1,
            message: 'qr login create failed',
            data: {}
        });
        return;
    }
    res.send({
        status: 0,
        data: {
            qrKey: qrData.qrKey,
            qrCode: qrData.qrCode,
        }
    });
}
async function qrLoginCheck(req, res) {
    // 800 为二维码过期; 801 为等待扫码; 802 为待确认; 803 为授权登录成功
    const loginCheckRet = await WYAPI.qrLoginCheck(req.account.uid, req.query.qrKey);
    if (loginCheckRet.code == 803) {
        // it's a bad design to export the transport function here. Let's refactor it at a good time.
        // should be put the cookie method to a cookie manager service
        storeCookie(req.account.uid, req.account, loginCheckRet.cookie);
    }
    res.send({
        status: loginCheckRet ? 0 : 1,
        data: {
            wyQrStatus: loginCheckRet.code,
            account: loginCheckRet.code == 803 ? await getWyAccountInfo(req.account.uid) : false
        }
    });
}

module.exports = {
    get: get,
    set: set,
    qrLoginCreate,
    qrLoginCheck,
}