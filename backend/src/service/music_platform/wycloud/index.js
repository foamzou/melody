const logger = require('consola');
const {
    cloud, cloudsearch, cloud_match, song_detail, song_url,
    user_playlist, playlist_detail, user_account, playlist_track_all,
    login_qr_check, login_qr_create, login_qr_key,
} = require('NeteaseCloudMusicApi');
const fs = require('fs');
const path = require('path');
const {requestApi} = require('./transport');

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
    if (response.code > 399) {
        logger.warn(response);
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

async function getPlayUrl(uid, id, isLossless = false) {
    const response = await safeRequest(uid, song_url, {
        id,
        br: isLossless ? 999000 : 320000
    });
    if (response === false) {
        return '';
    }
    if (!response.data || !response.data[0].url) {
        return '';
    }
    return response.data[0].url;
}

async function getPlayUrlWithType(uid, id, isLossless = false) {
    const response = await safeRequest(uid, song_url, {
        id,
        br: isLossless ? 999000 : 320000
    });
    if (response === false || !response.data || !response.data[0].url) {
        return { url: '', type: 'mp3' , level: ''};
    }
    return {
        url: response.data[0].url,
        type: response.data[0].type.toLowerCase() || 'mp3', //实际上，有可能返回“MP3”，这个值会成为文件的扩展名，要toLowerCase()
        level: response.data[0].level || '',
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
            offset: 0,
            limit: 1000,
        }),
    ]);
    if (detailResponse === false || songsResponse === false) {
        return false;
    }
    if (!detailResponse.playlist || !songsResponse.songs || songsResponse.songs.length === 0) {
        logger.error(`uid(${uid}) playlist(${playlistId}) has no songs.`, detailResponse, songsResponse);
        return false;
    }
    // console.log(JSON.stringify(songsResponse, null, 4));
    // ddd
    if (songsResponse.songs.length >= 1000) {
        const songsPage2Response = await safeRequest(uid, playlist_track_all, {
            id: playlistId,
            offset: 1000,
            limit: 1000,
        });
        if (songsPage2Response !== false && songsPage2Response.songs) {
            songsResponse.songs = songsResponse.songs.concat(songsPage2Response.songs);
            songsResponse.privileges = songsResponse.privileges.concat(songsPage2Response.privileges);
        }
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
        // the song has been added to cloud if the pc field is present
        if (songInfo.pc) {
            return false;
        } 
        
        // 收费歌曲
        if (song.fee === 1) {
            if (song.realPayed === 1 || song.payed === 1) {
                return false;
            }
            return true;
        }
        // subp 或 cp === 1 可能都表示有版权
        // 免费歌曲
        if (song.subp === 1) {
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
            artist: songInfo.ar.length > 0 ? songInfo.ar[0].name : '',
            duration: songInfo.dt / 1000,
            album: songInfo.al.name,
            cover: songInfo.al.picUrl,
            pageUrl: `https://music.163.com/song?id=${songInfo.id}`,
            playUrl: !isBlocked && !isCloud ? `http://music.163.com/song/media/outer/url?id=${songInfo.id}.mp3` : '', // 不再建议使用这个 url，建议每次都 Call API 获取
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

async function qrLoginCreate(uid) {
    const keyResponse = await safeRequest(uid, login_qr_key, {}, false);
    if (keyResponse === false || !keyResponse.data.unikey) {
        logger.warn(`uid(${uid}) get qr login key failed.`);
        return false;
    }
    const qrKey = keyResponse.data.unikey;
    const qrCodeResponse = await safeRequest(uid, login_qr_create, {key: qrKey, qrimg: true}, false);
    if (qrCodeResponse === false || !qrCodeResponse.data.qrimg) {
        return false;
    }
    return {
        qrKey,
        qrCode: qrCodeResponse.data.qrimg,
    };
}

async function qrLoginCheck(uid, qrKey) {
    const response = await safeRequest(uid, login_qr_check, {key: qrKey, cookie: {
        os: 'pc',
    }}, false);
    if (response === false) {
        return false;
    }
    return {
        code: response.code,
        cookie: response.cookie,
    };
}

async function verifyAccountStatus(uid) {
    const account = await getMyAccount(uid);
    return account !== false;
}

async function safeRequest(uid, moduleFunc, params, cookieRequired = true) {
    try {
        const response = await requestApi(uid, moduleFunc, params, cookieRequired);
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
    getPlayUrl: getPlayUrl,
    getPlayUrlWithType: getPlayUrlWithType,
    qrLoginCreate: qrLoginCreate,
    qrLoginCheck: qrLoginCheck,
    verifyAccountStatus: verifyAccountStatus,
}