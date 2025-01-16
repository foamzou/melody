const httpsGet = require('../../utils/network').asyncHttpsGet;
const logger = require('consola');
const configManager = require('../config_manager');

// Store best proxy in memory for performance
let cachedBestProxy = '';

async function validateGithubAccess(proxy = '') {
    try {
        const testUrl = proxy ? `${proxy}https://api.github.com/zen` : 'https://api.github.com/zen';
        const response = await httpsGet(testUrl);
        return response !== null;
    } catch (err) {
        return false;
    }
}

async function findBestProxy(proxyList) {
    // Always try direct access first
    if (await validateGithubAccess()) {
        cachedBestProxy = '';
        return '';
    }

    // Try cached proxy if available
    if (cachedBestProxy && await validateGithubAccess(cachedBestProxy)) {
        return cachedBestProxy;
    }

    // Test each proxy in the list
    for (const proxy of proxyList) {
        if (proxy && await validateGithubAccess(proxy)) {
            cachedBestProxy = proxy;
            return proxy;
        }
    }
    
    logger.warn('No working GitHub access found, either direct or via proxy');
    return ''; // Return empty string if no working access found
}

async function getRemoteConfig() {
    const fallbackConfig = {
        githubProxy: ['', 'https://ghp.ci/'],
    }
    
    const remoteConfigUrl = 'https://foamzou.com/tools/melody-config.php?v=2';
    const remoteConfig = await httpsGet(remoteConfigUrl);
    
    let config = {};
    if (remoteConfig === null) {
        config = fallbackConfig;
    } else {
        config = JSON.parse(remoteConfig);
    }

    let bestGithubProxy = await findBestProxy(config.githubProxy);
    if (bestGithubProxy !== '' && !bestGithubProxy.endsWith('/')) {
        bestGithubProxy = bestGithubProxy + '/';
    }

    return {
        bestGithubProxy,
    }
}

module.exports = {
    getRemoteConfig,
}