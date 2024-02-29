const logger = require('consola');
const { getUserAllPlaylist, getSongsFromPlaylist } = require('../service/music_platform/wycloud');
const Source = require('../consts/source').consts;

async function listAllPlaylists(req, res) {
    const uid = req.account.uid;
    const playlists = await getUserAllPlaylist(uid);
    if (playlists === false) {
        logger.error(`get user all playlist failed, uid: ${uid}`);
    }

    res.send({
        status: playlists ? 0 : 1,
        data: {
            playlists,
        }
    });
}

async function listSongsFromPlaylist(req, res) {
    const uid = req.account.uid;
    const source = req.params.source;
    const playlistId = req.params.id;

    if (source !== Source.Netease.code || !playlistId) {
        res.send({
            status: 1,
            message: "source or id is invalid",
        });
        return;
    }
    const playlists = await getSongsFromPlaylist(uid, source, playlistId);
    if (playlists === false) {
        logger.error(`get user all playlist failed, uid: ${uid}`);
    }

    res.send({
        status: playlists ? 0 : 1,
        data: {
            playlists: playlists ? playlists : [],
        }
    });
}

module.exports = {
    listAllPlaylists: listAllPlaylists,
    listSongsFromPlaylist: listSongsFromPlaylist,
}