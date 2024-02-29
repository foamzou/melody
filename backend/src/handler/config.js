const ConfigService = require('../service/config_manager');

async function getGlobalConfig(req, res) {
    const config = await ConfigService.getGlobalConfig();
    res.send({
        status: 0,
        data: config
    });
}

async function setGlobalConfig(req, res) {
    const config = req.body;
    await ConfigService.setGlobalConfig(config);
    res.send({
        status: 0,
        data: config
    });
}

module.exports = {
    getGlobalConfig,
    setGlobalConfig,
}