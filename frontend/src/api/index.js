import { get, post} from "./axios";

export const searchSongs = data => get("/songs", data);
export const getSongsMeta = data => get("/songs-meta", data);
export const getPlayUrl = songId => get(`/songs/netease/${songId}/playUrl`);

export const getAccount = data => get("/account", data);
export const setAccount = data => post("/account", data);

export const getAllPlaylist = data => get("/playlists", data);
export const getPlaylistDetail = playlistId => get(`/playlists/netease/${playlistId}/songs`);
export const getJobDetail = jobId => get(`/sync-jobs/${jobId}`);
export const createSyncSongFromUrlJob = (url, songId = "") => {
    return post("/sync-jobs", {
        "jobType": "SyncSongFromUrl",
        "urlJob": {
            "url": url,
            "meta": {
                "songId": songId
            }
        }
    });
};
export const createSyncSongFromPlaylistJob = (playlistId) => {
    return post("/sync-jobs", {
        "jobType": "UnblockedPlaylist",
        "playlist": {
            "id": playlistId,
            "source": "netease"
        }
    });
};
export const createSyncSongWithSongIdJob = (songId) => {
    return post("/sync-jobs", {
        "jobType": "UnblockedSong",
        "songId": songId,
        "source": "netease"
    });
};