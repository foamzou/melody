const httpsGet = require('../../utils/network').asyncHttpsGet;
const logger = require('consola');


async function getRemoteConfig() {
    const fallbackConfig = {
        githubProxy: 'https://mirror.ghproxy.com/',
    }
    const remoteConfigUrl = 'https://foamzou.com/tools/melody-config.php';
    const remoteConfig = await httpsGet(remoteConfigUrl);
    if (remoteConfig === null) {
        logger.error('get remote config failed, use fallback config');
        return fallbackConfig;
    }
    const config = JSON.parse(remoteConfig);
    return {
        githubProxy: config.githubProxy,
    }
}

module.exports = {
    getRemoteConfig
}