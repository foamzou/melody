const logger = require('consola');
const {
    cloud, cloudsearch, cloud_match, song_detail,
    user_playlist, playlist_detail, user_account, playlist_track_all
} = require('NeteaseCloudMusicApi');
const fs = require('fs');
const path = require('path');
const requestApi = require('./transport');
const { resolve } = require('path');

async function uploadSong(uid, filePath) {
    const response = await safeRequest(uid, cloud, {
        songFile: {
            name: path.basename(filePath),
            data: fs.readFileSync(filePath),
        },
    });
    if (response === false) {
        return false;
    }
    logger.debug('uploadSong\'s resonse: ', response)
    if (!response.privateCloud) {
        return false;
    }
    const songInfo = response.privateCloud.simpleSong;
    
    return {
        songId: songInfo.id,
        matched: songInfo.ar[0].id !== 0 && songInfo.al.id !== 0, // It's matched the song on wyMusic if singer and album has info
    };
}


async function searchSong(uid, songName, artist) {
    const response = await safeRequest(uid, cloudsearch, {
        keywords: `${songName} ${artist}`,
        type: 1,
    });
    if (response === false) {
        return false;
    }
    if (!response.result || response.result.songs.length === 0) {
        return false;
    }

    return response.result.songs.map(song => {
        let artists = [];

        if (song.ar.length !== 0) {
            song.ar.map(artist => {
                artists.push(artist.name);
                artist.alias && artists.push(...artist.alias);
                artist.alia && artists.push(...artist.alia);
            });
        }
        return {
            songId: song.id,
            songName: song.name,
            album: song.al.name,
            artists: artists.filter(a => a !== '' && a !== undefined),
        };
    })
}

async function matchAndFixCloudSong(uid, cloudSongId, wySongId) {
    const response = await safeRequest(uid, cloud_match, {
        sid: cloudSongId,
        asid: wySongId,
    });
    if (response === false) {
        return false;
    }
    return true;
}

async function getMyAccount(uid) {
    const response = await safeRequest(uid, user_account, {
        uid,
    });
    if (response === false) {
        return false;
    }
    if (!response.profile) {
        return false;
    }
    return {
        userId: response.profile.userId,
        nickname: response.profile.nickname,
        avatarUrl: response.profile.avatarUrl,
    };
}

async function getSongInfo(uid, id) {
    const response = await safeRequest(uid, song_detail, {
        ids: `"${id}"`,
    });
    if (response === false) {
        return false;
    }
    if (!response.songs || response.songs.length === 0) {
        return false;
    }
    const songInfo = response['songs'][0];
    return {
        songId: songInfo.id,
        songName: songInfo.name,
        artists: songInfo.ar.map(artist => artist.name),
        duration: songInfo.dt / 1000,
        album: songInfo.al.name,
        cover: songInfo.al.picUrl,
    };
}

async function getUserAllPlaylist(uid) {
    const wyAccount = await getMyAccount(uid);
    if (wyAccount === false) {
        logger.error(`uid(${uid}) get user's wycloud account failed.`);
        return false;
    }
    const response = await safeRequest(uid, user_playlist, {
        uid: wyAccount.userId,
    });
    if (response === false) {
        return false;
    }
    if (!response.playlist || response.playlist.length === 0) {
        return false;
    }
    return response.playlist.map(playlist => {
        return {
            id: playlist.id,
            name: playlist.name,
            cover: playlist.coverImgUrl,
            trackCount: playlist.trackCount,
            isCreatedByMe: playlist.creator.userId === wyAccount.userId,
        };
    });
}

async function getSongsFromPlaylist(uid, source, playlistId) {
    const [detailResponse, songsResponse] = await Promise.all([
        safeRequest(uid, playlist_detail, {
            id: playlistId,
        }),
        safeRequest(uid, playlist_track_all, {
            id: playlistId,
        }),
    ]);
    if (detailResponse === false || songsResponse === false) {
        return false;
    }
    if (!detailResponse.playlist || !songsResponse.songs || songsResponse.songs.length === 0) {
        logger.error(`uid(${uid}) playlist(${playlistId}) has no songs.`, detailResponse, songsResponse);
        return false;
    }
    let info = {
        id: playlistId,
        name: detailResponse.playlist.name,
        cover: detailResponse.playlist.coverImgUrl,
        songs: [],
    };
    const songsMap = {};
    songsResponse.songs.map(song => {
        songsMap[song.id] = song;
    });

    const isBlockedSong = (song, songInfo) => {
        // blocked or need to pay: subp == 0 && realpayed !== 1
        if (song.subp != 0 || song.realPayed === 1) {
            return false;
        }
        // the song has been added to cloud if the pc field is present
        if (songInfo.pc) {
            return false;
        }
        return true;
    };

    songsResponse.privileges.forEach(song => {
        const songInfo = songsMap[song.id];
        if (!songInfo) {
            return;
        }

        const isBlocked = isBlockedSong(song, songInfo);
        const isCloud = !!songInfo.pc;
        info.songs.push({
            songId: songInfo.id,
            songName: songInfo.name,
            artists: songInfo.ar.map(artist => artist.name),
            duration: songInfo.dt / 1000,
            album: songInfo.al.name,
            cover: songInfo.al.picUrl,
            pageUrl: `https://music.163.com/song?id=${songInfo.id}`,
            playUrl: !isBlocked && !isCloud ? `http://music.163.com/song/media/outer/url?id=${songInfo.id}.mp3` : '',
            isBlocked,
            isCloud,
        });
    });

    return info;
}

async function getBlockedSongsFromPlaylist(uid, source, playlistId) {
    const info = await getSongsFromPlaylist(uid, source, playlistId);
    if (info === false) {
        return false;
    }
    info.blockedSongs = info.songs.filter(song => song.isBlocked);
    return info;
}

async function safeRequest(uid, moduleFunc, params) {
    try {
        const response = await requestApi(uid, moduleFunc, params);
        if (response == false) {
            logger.error(`request failed.`, response);
            return false;
        }
        return response;
    } catch (error) {
        logger.error(`uid(${uid}) request failed.`, error);
        return false;
    }
}

module.exports = {
    getMyAccount: getMyAccount,
    uploadSong: uploadSong,
    matchAndFixCloudSong: matchAndFixCloudSong,
    searchSong: searchSong,
    getBlockedSongsFromPlaylist: getBlockedSongsFromPlaylist,
    getSongsFromPlaylist: getSongsFromPlaylist,
    getUserAllPlaylist: getUserAllPlaylist,
    getSongInfo: getSongInfo,
}