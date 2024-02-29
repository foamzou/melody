const asyncFs = require('../../utils/fs');

const DataPath = `${__dirname}/../../../.profile/data`;
const ConfigPath = `${DataPath}/config`;
const GlobalConfig = `${ConfigPath}/global.json`;
const sourceConsts = require('../../consts/source').consts;

async function init() {
    if (!await asyncFs.asyncFileExisted(ConfigPath)) {
        await asyncFs.asyncMkdir(ConfigPath);
    }
}
init();

const GlobalDefaultConfig = {
    localDownloadPath: '',
    // don't search youtube by default
    sources: Object.values(sourceConsts).map(i => i.code).filter(s => s !== sourceConsts.Youtube.code),
    sourceConsts,
};

async function setGlobalConfig(config) {
    await asyncFs.asyncWriteFile(GlobalConfig, JSON.stringify(config));
}

async function getGlobalConfig() {
    if (!await asyncFs.asyncFileExisted(GlobalConfig)) {
        return GlobalDefaultConfig;
    }
    const config = JSON.parse(await asyncFs.asyncReadFile(GlobalConfig));
    if (!config.sources) {
        config.sources = GlobalDefaultConfig.sources;
    }
    config.sourceConsts = GlobalDefaultConfig.sourceConsts;
    return config;
}


module.exports = {
    setGlobalConfig,
    getGlobalConfig,
}