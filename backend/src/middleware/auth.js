const AccountService = require('../service/account');
const AccountNotExisted = require('../errors/account_not_existed');
const logger = require('consola');

module.exports = (req, res, next) => {
	if (req.method === 'OPTIONS') {
		return next();
	}
	if (!req.headers['mk']) {
		throw new AccountNotExisted;
	}
    const account = AccountService.getAccount(req.headers['mk'])
    if (!account) {
        throw new AccountNotExisted;
	}
	//logger.info('user access', account);
	req.account = account
	next()
}