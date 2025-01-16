const { lock, unlock } = require('../../utils/simple_locker');
const asyncFs = require('../../utils/fs');
const logger = require('consola');

const DbPath = `${__dirname}/../../../.profile/data/kv-db`;

async function init() {
    if (!await asyncFs.asyncFileExisted(DbPath)) {
        await asyncFs.asyncMkdir(DbPath);
    }
}
init();

async function set(table, key, value) {
    if (!await lock(table, 5)) {
        logger.error(`get table locker failed, table: ${table}, key: ${key}, value: ${value}`);
        return false;
    }
    const filePath = `${DbPath}/${table}.json`;
    let data = {};
    if (await asyncFs.asyncFileExisted(filePath)) {
        try {
            data = JSON.parse(await asyncFs.asyncReadFile(filePath));
        } catch (err) {
            logger.error(`parse ${filePath} failed`, err);
            return false;
        }
    }
    data[key] = value;
    try {  
        await asyncFs.asyncWriteFile(filePath, JSON.stringify(data));
    } catch (err) {
        logger.error(`write ${filePath} failed`, err);
        return false;
    }
    unlock(table);
    return true;
}

async function get(table, key) {
    const filePath = `${DbPath}/${table}.json`;
    let data = {};
    if (await asyncFs.asyncFileExisted(filePath)) {
        try {
            data = JSON.parse(await asyncFs.asyncReadFile(filePath));
        } catch (err) {
            logger.error(`parse ${filePath} failed`, err);
            return false;
        }
    }
    return data[key];
}

module.exports = {
    set,
    get,
    fileSyncMeta: {
        set: async function (source, sourceID, value) {
            const key = `${source}-${sourceID}`;
            return await set('fileSyncMeta', key, JSON.stringify(value));
        },
        get: async function (source, sourceID) {
            const key = `${source}-${sourceID}`;
            const ret = await get('fileSyncMeta', key);
            if (!ret) {
                return false;
            }
            return JSON.parse(ret);
        },
        setPlaylistMeta: async function(playlistID, meta) {
            const key = `playlist-${playlistID}`;
            return await set('fileSyncMeta', key, JSON.stringify({
                songIDs: meta.songIDs || [],
                // 预留其他字段
            }));
        },
        getPlaylistMeta: async function(playlistID) {
            const key = `playlist-${playlistID}`;
            const ret = await get('fileSyncMeta', key);
            if (!ret) {
                return {
                    songIDs: []
                };
            }
            return JSON.parse(ret);
        }
    }
};