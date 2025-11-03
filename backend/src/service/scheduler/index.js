const schedule = require('node-schedule');
const logger = require('consola');
const configManager = require('../config_manager');
const AccountService = require('../account');
const syncPlaylist = require('../sync_music/sync_playlist');
const unblockMusicInPlaylist = require('../sync_music/unblock_music_in_playlist');
const { consts: sourceConsts } = require('../../consts/source');
const { getUserAllPlaylist, verifyAccountStatus } = require('../music_platform/wycloud');

class SchedulerService {
    constructor() {
        this.jobs = new Map();
    }

    async start() {
        await this.scheduleLocalSyncJobs();
        await this.scheduleCloudSyncJobs();
        
        // Log initial schedule info
        const localNextRun = this.getLocalSyncNextRun();
        if (localNextRun) {
            logger.info(`Next local sync scheduled at: ${localNextRun.nextRunTime}, in ${Math.round(localNextRun.remainingMs / 1000 / 60)} minutes`);
        }

        const accounts = await AccountService.getAllAccounts();
        for (const uid in accounts) {
            const cloudNextRun = this.getCloudSyncNextRun(uid);
            if (cloudNextRun) {
                logger.info(`Next cloud sync for account ${uid} scheduled at: ${cloudNextRun.nextRunTime}, in ${Math.round(cloudNextRun.remainingMs / 1000 / 60)} minutes`);
            }
        }

        logger.info('Scheduler service started');
    }

    async scheduleLocalSyncJobs() {
        // 系统级别的本地同步任务
        const config = await configManager.getGlobalConfig();
        const syncAccounts = config.playlistSyncToLocal.syncAccounts || [];
        if (!config.playlistSyncToLocal.autoSync.enable || syncAccounts.length === 0) {
            return;
        }

        const frequency = config.playlistSyncToLocal.autoSync.frequency;
        const unit = config.playlistSyncToLocal.autoSync.frequencyUnit;
        
        const rule = this.buildScheduleRule(frequency, unit);
        const jobKey = 'localSync';
        
        const job = schedule.scheduleJob(rule, async () => {
            logger.info('Start auto sync playlist to local');
            for (const uid of syncAccounts) {
                const isActive = await verifyAccountStatus(uid);
                if (!isActive) {
                    logger.warn(`Account ${uid} is not active, skip local sync`);
                    continue;
                }
                const playlists = await getUserAllPlaylist(uid);
                for (const playlist of playlists) {
                    logger.info(`Start sync playlist ${playlist.id} to local for account ${uid}`);
                    await syncPlaylist(uid, sourceConsts.Netease.code, playlist.id);
                }
            }
        });
        
        this.jobs.set(jobKey, job);
        
        logger.info(`Schedule local sync job success, rule: ${this.formatScheduleRule(rule)}`);
    }

    async scheduleCloudSyncJobs() {
        // 账号级别的云盘同步任务
        const accounts = await AccountService.getAllAccounts();
        for (const uid in accounts) {
            const account = accounts[uid];
            await this.scheduleCloudSyncJob(uid, account);
        }
    }

    async scheduleCloudSyncJob(uid, account) {
        if (!account.config?.playlistSyncToWyCloudDisk?.autoSync?.enable) {
            return;
        }

        const isActive = await verifyAccountStatus(uid);
        if (!isActive) {
            logger.warn(`Account ${uid} is not active, skip cloud sync`);
            return;
        }

        const frequency = account.config.playlistSyncToWyCloudDisk.autoSync.frequency;
        const unit = account.config.playlistSyncToWyCloudDisk.autoSync.frequencyUnit;
        const jobKey = `cloudSync_${uid}`;
        
        const rule = this.buildScheduleRule(frequency, unit);
        
        this.jobs.set(jobKey, schedule.scheduleJob(rule, async () => {
            logger.info(`Start cloud sync for account ${uid}`);
            const playlists = await getUserAllPlaylist(uid);
            // Filter playlists based on user preference
            const playlistsToSync = account.config.playlistSyncToWyCloudDisk.autoSync.onlyCreatedPlaylists
                ? playlists.filter(p => p.isCreatedByMe)
                : playlists;
            for (const playlist of playlistsToSync) {
                logger.info(`Start sync playlist ${playlist.id} to cloud for account ${uid}`);
                await unblockMusicInPlaylist(uid, sourceConsts.Netease.code, playlist.id, {
                    syncWySong: account.config.playlistSyncToWyCloudDisk.syncWySong,
                    syncNotWySong: account.config.playlistSyncToWyCloudDisk.syncNotWySong
                });
            }
        }));
        logger.info(`Schedule cloud sync job for account ${uid} success, rule: ${this.formatScheduleRule(rule)}`);
    }

    buildScheduleRule(frequency, unit) {
        if (unit === 'minute') {
            return `0 */${frequency} * * * *`;
        } else if (unit === 'hour') {
            return `0 0 */${frequency} * * *`;
        } else {
            return `0 0 0 */${frequency} * *`;
        }
    }

    formatScheduleRule(rule) {
        if (typeof rule === 'string') {
            return rule;
        }
        return `每天 ${rule.hour.map(h => h.toString().padStart(2, '0') + ':00').join(', ')} 执行`;
    }

    async updateLocalSyncJob() {
        logger.info('Update local sync job');
        // 添加调试日志
        logger.info('Before update:');
        logger.info(`- Jobs map size: ${this.jobs.size}`);
        logger.info(`- Jobs keys: ${Array.from(this.jobs.keys()).join(', ')}`);
        
        const localJob = this.jobs.get('localSync');
        if (localJob) {
            localJob.cancel();
            this.jobs.delete('localSync');
        }
        
        // 添加调试日志
        logger.info('After cancel:');
        logger.info(`- Jobs map size: ${this.jobs.size}`);
        logger.info(`- Jobs keys: ${Array.from(this.jobs.keys()).join(', ')}`);
        
        await this.scheduleLocalSyncJobs();
        
        // 添加调试日志
        logger.info('After reschedule:');
        logger.info(`- Jobs map size: ${this.jobs.size}`);
        logger.info(`- Jobs keys: ${Array.from(this.jobs.keys()).join(', ')}`);
        const newJob = this.jobs.get('localSync');
        logger.info(`- New job created: ${!!newJob}`);
        if (newJob) {
            logger.info(`- New job next run: ${newJob.nextInvocation()}`);
        }
        
        logger.info('Update local sync job success');
    }

    async updateCloudSyncJob(uid) {
        logger.info(`Update cloud sync job for account ${uid}`);
        // 取消指定账号的云盘同步任务
        const cloudJobKey = `cloudSync_${uid}`;
        const cloudJob = this.jobs.get(cloudJobKey);
        if (cloudJob) {
            cloudJob.cancel();
            this.jobs.delete(cloudJobKey);
            logger.info(`Cancel cloud sync job for account ${uid}`);
        }
        // 重新调度指定账号的云盘同步任务
        const account = (await AccountService.getAllAccounts())[uid];
        if (account) {
            await this.scheduleCloudSyncJob(uid, account);
        }
        logger.info(`Update cloud sync job for account ${uid} success`);
    }

    getNextRunInfo(job) {
        if (!job) return null;
        
        const nextRun = job.nextInvocation();
        if (!nextRun) return null;
        
        const now = new Date();
        const remainingMs = nextRun.getTime() - now.getTime();
        
        return {
            nextRunTime: nextRun,
            remainingMs: remainingMs
        };
    }

    getLocalSyncNextRun() {
        const job = this.jobs.get('localSync');
        
        // 添加调试日志
        logger.info('Debug getLocalSyncNextRun:');
        logger.info(`- Has job: ${!!job}`);
        logger.info(`- Jobs map size: ${this.jobs.size}`);
        logger.info(`- Jobs keys: ${Array.from(this.jobs.keys()).join(', ')}`);
        if (job) {
            logger.info(`- Job next invocation: ${job.nextInvocation()}`);
            logger.info(`- Job scheduling info:`, job.scheduledJobs);
        }
        
        return this.getNextRunInfo(job);
    }

    getCloudSyncNextRun(uid) {
        const job = this.jobs.get(`cloudSync_${uid}`);
        return this.getNextRunInfo(job);
    }
}

const schedulerService = new SchedulerService();
module.exports = schedulerService; 