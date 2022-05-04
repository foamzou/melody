const { searchSong, getSongInfo } = require('../music_platform/wycloud');
const logger = require('consola');

module.exports = async function findTheBestMatchFromWyCloud(uid, {songName, artist, album, musicPlatformSongId} = {}) {
    if (musicPlatformSongId) {
        const songInfo = await getSongInfo(uid, musicPlatformSongId);
        
        if (songInfo) {
            return songInfo;
        }

        if (songName && artist) {
            return {
                songId: musicPlatformSongId,
                songName,
                artists: [artist],
                album,
            };
        }

        return null;
    }

    if (songName === "" || artist === "") {
        return null;
    }
    const searchLists = await searchSong(uid, songName, artist);
    logger.info('searchLists', searchLists);
    if (searchLists === false) {
        logger.warn(`search song failed, no matter, go on`);
        return null;
    }

    let matchSongAndArtist = null;
    for (const searchItem of searchLists) {
        let hitArtist = false;
        for (const searchArtist of searchItem.artists) {
            if (artist === searchArtist) {
                hitArtist = true;
            }
        }
        if (!hitArtist) {
            continue;
        }

        if (searchItem.songName === songName) {
            if (searchItem.album === album) {
                logger.info('matched the best')
                return searchItem;
            }
            if (!matchSongAndArtist) {
                matchSongAndArtist = searchItem;
            }
        }
    }
    return matchSongAndArtist;
}
