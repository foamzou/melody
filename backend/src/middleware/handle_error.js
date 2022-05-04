const logger = require('consola');
const AccountNotExisted = require('../errors/account_not_existed');

module.exports = async (error, req, res, next) => {
    logger.error('catch error', error);

    if (error instanceof AccountNotExisted) {
        res.status(403).send({
            status: 1,
            message: "account not existed",
        });
        return;
    }

    res.status(500).send({
        status: 1,
        message: "Internal Server Error",
    });
}