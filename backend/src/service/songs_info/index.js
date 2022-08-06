const { getPlayUrl } = require('../music_platform/wycloud');

async function getPlayUrlWithOptions(uid, source, songId) {
    // Only support netease now
    if (source !== 'netease') {
        return '';
    }
    return await getPlayUrl(uid, songId);
}


module.exports = {
    getPlayUrlWithOptions: getPlayUrlWithOptions,
}