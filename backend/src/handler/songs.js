const logger = require('consola');
const { searchSongsWithKeyword, searchSongsWithSongMeta } = require('../service/search_songs');
const { getPlayUrlWithOptions } = require('../service/songs_info');
const { getMetaWithUrl } = require('../service/media_fetcher');
const { matchUrlFromStr } = require('../utils/regex');

async function search(req, res) {
    const query = req.query;

    const keywordOrUrl = query.keyword;

    if (!keywordOrUrl) {
        res.send({
            status: 1,
            message: "keyword is required",
        });
        return;
    }
    let songs = [];
    const url = matchUrlFromStr(keywordOrUrl);
    if (!url) {
        songs = await searchSongsWithKeyword(keywordOrUrl);
    } else {
        const songMeta = await getMetaWithUrl(url);
        if (!songMeta) {
            res.send({
                status: 2,
                message: "can not get song meta with this url",
            });
            return;
        }
        songs = await searchSongsWithSongMeta({
            songName: songMeta.songName,
            artist: songMeta.artist,
            album: songMeta.album,
            duration: songMeta.duration,
        }, {
            expectArtistAkas: [],
            allowSongsJustMatchDuration: true,
            allowSongsNotMatchMeta: true,
        });
    }

    res.send({
        status: 0,
        data: {
            songs: songs ? songs : [],
        }
    });
}

async function getPlayUrl(req, res) {
    const source = req.params.source;
    const songId = req.params.id;

    if (!source || !songId) {
        res.send({
            status: 1,
            message: "source and songId is required",
        });
        return;
    }
    const playUrl = await getPlayUrlWithOptions(req.account.uid, source, songId);

    res.send({
        status: 0,
        data: {
            playUrl,
        }
    });
}

module.exports = {
    search: search,
    getPlayUrl: getPlayUrl
}