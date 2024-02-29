const router = require('express').Router();

const SyncJob = require('./handler/sync_jobs');
const Songs = require('./handler/songs');
const SongMeta = require('./handler/song_meta');
const Playlists = require('./handler/playlists');
const Account = require('./handler/account');
const MediaFetcherLib = require('./handler/media_fetcher_lib');
const Config = require('./handler/config');

const asyncWrapper = (cb) => {
    return (req, res, next) => cb(req, res, next).catch(next);
  };

router.post('/api/sync-jobs', asyncWrapper(SyncJob.createJob));
router.get('/api/sync-jobs', asyncWrapper(SyncJob.listAllJobs));
router.get('/api/sync-jobs/:id', asyncWrapper(SyncJob.getJob));

router.get('/api/songs', asyncWrapper(Songs.search));
router.get('/api/songs/:source/:id/playUrl', asyncWrapper(Songs.getPlayUrl));

router.get('/api/songs-meta', asyncWrapper(SongMeta.getMeta));

router.get('/api/playlists', asyncWrapper(Playlists.listAllPlaylists));
router.get('/api/playlists/:source/:id/songs', asyncWrapper(Playlists.listSongsFromPlaylist));

router.get('/api/account', asyncWrapper(Account.get));
router.post('/api/account', asyncWrapper(Account.set));
router.get('/api/account/qrlogin-create', asyncWrapper(Account.qrLoginCreate));
router.get('/api/account/qrlogin-check', asyncWrapper(Account.qrLoginCheck));

router.get('/api/media-fetcher-lib/version-check', asyncWrapper(MediaFetcherLib.checkLibVersion));
router.post('/api/media-fetcher-lib/update', asyncWrapper(MediaFetcherLib.downloadTheLatestLib));

router.get('/api/config/global', asyncWrapper(Config.getGlobalConfig));
router.post('/api/config/global', asyncWrapper(Config.setGlobalConfig));

module.exports = router;