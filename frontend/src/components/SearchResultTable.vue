<template>
  <el-table
    :data="searchResult"
    :stripe="true"
    class="search-result-table"
    :header-cell-style="{
      background: '#f5f7fa',
      color: '#606266',
      fontWeight: 'bold',
      fontSize: '14px',
      height: '50px',
    }"
    :row-style="{ height: '60px' }"
  >
    <el-table-column type="index" width="60" align="center" />

    <el-table-column label="歌曲" min-width="300" prop="songName">
      <template #default="scope">
        <div class="song-name-cell">
          <el-tooltip
            v-if="scope.row.resourceForbidden"
            content="可能无法播放 / 试听版本"
            placement="top"
          >
            <i class="bi bi-lock-fill lock-icon"></i>
          </el-tooltip>
          <span class="song-name">{{ scope.row.songName }}</span>
        </div>
      </template>
    </el-table-column>

    <el-table-column
      prop="artist"
      label="歌手"
      min-width="120"
      align="center"
    />

    <el-table-column prop="album" label="专辑" min-width="200" align="center" />

    <el-table-column
      prop="duration"
      label="时长"
      min-width="100"
      align="center"
    />

    <el-table-column
      prop="sourceName"
      label="来源"
      min-width="120"
      align="center"
    />

    <el-table-column label="操作" min-width="200" fixed="right" align="center">
      <template #default="scope">
        <div class="operation-cell">
          <div class="operation-buttons">
            <el-tooltip
              content="停止播放"
              placement="top"
              v-if="scope.row.url == currentSongUrl"
            >
              <el-button
                @click="abort()"
                type="primary"
                circle
                class="operation-btn"
              >
                <i class="bi bi-stop-circle"></i>
              </el-button>
            </el-tooltip>

            <el-tooltip content="播放歌曲" placement="top" v-else>
              <el-button
                @click="play(null, scope.row.url)"
                type="primary"
                circle
                :disabled="scope.row.url.indexOf('youtube') >= 0"
                class="operation-btn"
              >
                <i class="bi bi-play-circle"></i>
              </el-button>
            </el-tooltip>

            <el-tooltip
              :content="
                wyAccount
                  ? '上传歌曲到云盘'
                  : '上传歌曲到云盘(请先绑定网易云账号)'
              "
              placement="top"
            >
              <el-button
                type="success"
                circle
                @click="uploadToCloud(scope.row.url)"
                :disabled="!wyAccount"
                class="operation-btn"
              >
                <i class="bi bi-cloud-upload"></i>
              </el-button>
            </el-tooltip>

            <el-tooltip content="在源站查看" placement="top">
              <el-button
                type="warning"
                circle
                class="operation-btn"
                @click="window.open(scope.row.url, '_blank')"
              >
                <i class="bi bi-box-arrow-up-right"></i>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.search-result-table {
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.song-name-cell {
  display: flex;
  align-items: center;
  padding-left: 10px;
}

.lock-icon {
  font-size: 16px;
  color: #909399;
  margin-right: 8px;
}

.song-name {
  font-size: 14px;
  color: #303133;
}

.operation-cell {
  position: relative;
  height: 100%;
}

.operation-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  position: relative;
  z-index: 200;
}

/* 修改hover选择器的写法，确保按钮在hover时不会消失 */
:deep(.el-table__row:hover) .operation-buttons,
.operation-buttons:hover {
  opacity: 1;
}

.operation-btn {
  padding: 6px;
  font-size: 16px;
  background-color: var(--el-button-bg-color);
}

:deep(.el-table__header) {
  width: 100% !important;
}

:deep(.el-table__body) {
  width: 100% !important;
}

:deep(.el-table__header-wrapper) {
  width: 100% !important;
}

:deep(.el-table__body-wrapper) {
  width: 100% !important;
}
</style>

<script>
import {
  createSyncSongFromUrlJob,
  createDownloadSongFromUrlJob,
  getGlobalConfig,
} from "../api";
import { startTaskListener } from "../components/TaskNotification";
import storage from "../utils/storage";

export default {
  data() {
    return {
      currentSongUrl: -1,
      wyAccount: null,
      globalConfig: {},
    };
  },
  props: {
    playTheSong: {
      type: Function,
      required: true,
    },
    abortTheSong: {
      type: Function,
      required: true,
    },
    suggestMatchSongId: {
      type: String,
      required: false,
    },
    searchResult: {
      type: Array,
      required: true,
    },
  },
  mounted() {
    this.wyAccount = storage.get("wyAccount");
    this.loadGlobalConfig();
  },
  setup(props, { emit }) {
    const playTheSong = (songMeta, pageUrl, suggestMatchSongId) => {
      props.playTheSong(songMeta, pageUrl, suggestMatchSongId);
    };
    const abortTheSong = () => {
      props.abortTheSong();
    };
    return {
      playTheSong,
      abortTheSong,
    };
  },
  watch: {
    $route(to, from) {
      this.wyAccount = storage.get("wyAccount");
      if (to.path === "/" || to.path === "/home" || to.path === "") {
        this.loadGlobalConfig();
      }
    },
  },
  methods: {
    async uploadToCloud(pageUrl) {
      const ret = await createSyncSongFromUrlJob(
        pageUrl,
        this.suggestMatchSongId
      );
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
      }
    },
    async downloadToLocalService(pageUrl) {
      const ret = await createDownloadSongFromUrlJob(
        pageUrl,
        this.suggestMatchSongId
      );
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
      }
    },
    async loadGlobalConfig() {
      const globalConfig = await getGlobalConfig();
      if (globalConfig !== false && globalConfig.data) {
        this.globalConfig = globalConfig.data;
      }
    },
    play(songMeta, pageUrl) {
      this.currentSongUrl = pageUrl;
      this.playTheSong(songMeta, pageUrl, this.suggestMatchSongId);
    },
    abort() {
      this.currentSongUrl = -1;
      this.abortTheSong();
    },
  },
};
</script>
