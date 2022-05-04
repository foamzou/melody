const { uploadSong } = require('../src/service/music_platform/wycloud');
const {
    login_cellphone, user_cloud, login_refresh, cloud_match, cloudsearch, user_playlist,
    user_account, playlist_detail,song_detail, artist_desc, playlist_track_all
 } = require('NeteaseCloudMusicApi')

const requestApi = require('../src/service/music_platform/wycloud/transport');

async function main() {
    try {
        // await getMyPlaylist();
        await getPlaylistTrackAll();
        // await getMyAccount();
        // await artistDetail();
    } catch(e) {
        console.log(e)
    }
}

async function searchSong() {
    const ret = await requestApi('foamzou', cloudsearch, {
        keywords: "好朋友的祝福 A-Lin",
        type: 1,
    });
    console.log(JSON.stringify(ret));
}

async function getMyAccount() {
    const ret = await requestApi('foamzou', user_account);
    console.log(JSON.stringify(ret));
    return {
        userId: ret.profile.userId,
        nickname: ret.profile.nickname,
        avatarUrl: ret.profile.avatarUrl,
    };
}

async function getMyPlaylist() {
    const wyAccount = await getMyAccount();
    const ret = await requestApi('foamzou', user_playlist, {
        uid: wyAccount.userId,
        // limit: 100,
        // offset: 0,
    });
    console.log(JSON.stringify(ret));
}

async function getPlaylistInfo() {
    const ret = await requestApi('foamzou', playlist_detail, {
        id: 93034771
     });
     // 50354546 我喜欢的歌
     // 52068167 你也会喜欢我喜欢的歌
     // 93034771 Tank 锁
    console.log(JSON.stringify(ret));
    // 已经在云盘：pc 字段不为空
    // 付费类型：
        // fee: 0 -- 可能无法正常播放
        // fee: 1 -- 可以正常播放
        // fee: 4 -- 需要另外付费
        // fee: 8 -- 可以正常播放
    // 无法播放： privileges[].subp == 0 && privileges[].realPayed !== 1
}

async function getPlaylistTrackAll() {
    const ret = await requestApi('foamzou', playlist_track_all, {
        id: 120213287
     });

    console.log(JSON.stringify(ret));
}

async function matchAndFixCloudSong() {
    const ret = await requestApi('foamzou', cloud_match, {
        // uid: 1926076561,
        sid: 1926076561,
        asid: 25657354,
    });

    console.log(JSON.stringify(ret));
}

async function listMyCloud() {
    const ret = await requestApi('foamzou', user_cloud);
    console.log(JSON.stringify(ret))
}

async function songDetail() {
    const ret = await requestApi('foamzou', song_detail, {
        ids: '38673614',
    });
    console.log(JSON.stringify(ret))
}

async function artistDetail() {
    const ret = await requestApi('foamzou', artist_detail, {
        id: '125509',
    });
    console.log(JSON.stringify(ret))
}

async function _uploadSong() {
    // const ret = await uploadSong('foamzou', '/Users/f.zou/Downloads/273150241.mp3'); // 一直很安静 有 artist 和 album
    // const ret = await uploadSong('foamzou', '/tmp/mm/0247762f752562e89ef699da25896dd3/【4K修复丨周杰伦创作】SHE《触电》MV2160p修复版.mp3');
    const ret = await uploadSong('foamzou', '/tmp/mm/0247762f752562e89ef699da25896dd3/1.mp3');
    console.log(JSON.stringify(ret));
}

main()