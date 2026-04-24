const httpsGet = require('../../utils/network').asyncHttpsGet;
const logger = require('consola');
const configManager = require('../config_manager');

// 内存缓存最优代理，提升性能
let cachedBestProxy = '';

/**
 * 验证GitHub访问是否正常（直连/代理）
 * @param {string} proxy 代理地址，为空则使用直连
 * @returns {Promise<boolean>} 访问成功返回true，失败返回false
 */
async function validateGithubAccess(proxy = '') {
    try {
        const targetUrl = 'https://api.github.com/zen';
        let testUrl;

        // 标准化代理地址拼接，避免生成无效URL
        if (proxy) {
            const formattedProxy = proxy.endsWith('/') ? proxy : `${proxy}/`;
            testUrl = formattedProxy + targetUrl;
        } else {
            testUrl = targetUrl;
        }

        // 5秒超时保护，防止网络请求阻塞程序
        const response = await Promise.race([
            httpsGet(testUrl),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);

        return response !== null;
    } catch (err) {
        return false;
    }
}

/**
 * 从代理列表中找出可用的最优代理
 * 优先级：直连 > 缓存代理 > 代理列表逐个测试
 * @param {Array} proxyList 代理列表
 * @returns {Promise<string>} 可用的代理地址，无可用代理返回空字符串
 */
async function findBestProxy(proxyList) {
    // 优先尝试直连访问
    if (await validateGithubAccess()) {
        cachedBestProxy = '';
        return '';
    }

    // 尝试使用缓存的代理，失效则清空缓存
    if (cachedBestProxy) {
        const isValid = await validateGithubAccess(cachedBestProxy);
        if (isValid) {
            return cachedBestProxy;
        } else {
            cachedBestProxy = '';
        }
    }

    // 过滤空值和无效项，逐个测试代理列表
    const filteredProxies = (proxyList || []).filter(p => typeof p === 'string' && p.trim() !== '');
    for (const proxy of filteredProxies) {
        if (await validateGithubAccess(proxy)) {
            cachedBestProxy = proxy;
            return proxy;
        }
    }

    logger.warn('未找到可用的GitHub访问方式（直连/代理均失败）');
    return '';
}

/**
 * 获取远程配置并自动选择最优GitHub代理
 * @returns {Promise<{bestGithubProxy: string}>} 返回最优代理结果
 */
async function getRemoteConfig() {
    // 备用配置，远程获取失败时使用
    const fallbackConfig = {
        githubProxy: ['', 'https://ghp.ci/'],
    }

    const remoteConfigUrl = 'https://foamzou.com/tools/melody-config.php?v=2';
    const remoteConfig = await httpsGet(remoteConfigUrl);

    let config = {};
    if (remoteConfig === null) {
        config = fallbackConfig;
    } else {
        try {
            // 解析远程配置，增加异常捕获防止程序崩溃
            config = JSON.parse(remoteConfig);
        } catch (err) {
            logger.error('远程配置解析失败，使用备用配置');
            config = fallbackConfig;
        }
    }

    let bestGithubProxy = await findBestProxy(config.githubProxy);
    // 统一代理格式，确保以 / 结尾
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
