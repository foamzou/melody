const asyncFs = require('../../utils/fs');

const DataPath = `${__dirname}/../../../.profile/data`;
const ConfigPath = `${DataPath}/config`;
const GlobalConfig = `${ConfigPath}/global.json`;
const sourceConsts = require('../../consts/source').consts;
const libPath = require('path');

async function init() {
    if (!await asyncFs.asyncFileExisted(ConfigPath)) {
        await asyncFs.asyncMkdir(ConfigPath);
    }
}
init();

const GlobalDefaultConfig = {
    downloadPath: '',
    filenameFormat: '{songName}-{artist}',
    downloadPathExisted: false,
    // don't search youtube by default
    sources: Object.values(sourceConsts).map(i => i.code).filter(s => s !== sourceConsts.Youtube.code),
    sourceConsts,
    playlistSyncToLocal: {
        autoSync: {
          enable: false,
          frequency: 1,
          frequencyUnit: "day",
        },
        deleteLocalFile: false,
        filenameFormat: `{playlistName}${libPath.sep}{songName}-{artist}`,
    },
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
    config.downloadPathExisted = false;
    if (config.downloadPath) {
        config.downloadPathExisted = await asyncFs.asyncFileExisted(config.downloadPath);
    }

    if (!config.filenameFormat) {
        config.filenameFormat = GlobalDefaultConfig.filenameFormat;
    }

    if (!config.playlistSyncToLocal) {
        config.playlistSyncToLocal = GlobalDefaultConfig.playlistSyncToLocal;
    }
    if (!config.playlistSyncToLocal.filenameFormat) {
        config.playlistSyncToLocal.filenameFormat = GlobalDefaultConfig.playlistSyncToLocal.filenameFormat;
    }
    return config;
}


module.exports = {
    setGlobalConfig,
    getGlobalConfig,
}