<template>
  <el-main>
    <!-- 搜索区域 -->
    <div class="search-container">
      <el-row justify="center">
        <el-col :span="16">
          <el-row>
            <el-col :span="20">
              <el-input
                v-model="keyword"
                placeholder="网页链接 / 歌名"
                clearable
                @keyup.enter.native="onSearch"
                class="search-input"
              >
                <template #prefix>
                  <i class="bi bi-search"></i>
                </template>
              </el-input>
            </el-col>

            <el-col :span="4">
              <el-button
                type="primary"
                @click="onSearch"
                class="search-btn"
                :loading="isSearching"
              >
                搜索
              </el-button>
            </el-col>
          </el-row>
        </el-col>
      </el-row>

      <!-- 搜索提示 -->
      <el-row v-if="searchTip" class="search-tip-row">
        <el-col :span="12" :offset="3">
          <div class="search-tip">
            <span>{{ searchTip }}</span>
            <span v-loading="isSearching"></span>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 精准搜索卡片 -->
    <transition name="fade">
      <el-row v-if="songMetaInfo !== null" class="song-card-container">
        <el-col :span="13" :offset="4">
          <el-card class="song-card" shadow="hover">
            <el-row>
              <el-col :span="6" style="width: 160px; height: 160px">
                <img
                  :src="songMetaInfo.coverUrl"
                  onerror="this.src='https://cdnmusic.migu.cn/v3/static/img/common/default/img_default_240x240.jpg'"
                  class="image"
                  style="width: 100%; height: 100%"
                />
              </el-col>
              <el-col :span="18">
                <!-- <div style="padding: 14px"></div> -->
                <div
                  style="
                    position: relative;
                    z-index: 2;
                    overflow: hidden;
                    width: 100%;
                    height: 100%;
                  "
                >
                  <div
                    style="
                      width: 100%;
                      height: 100%;
                      position: absolute;
                      top: 0;
                      color: white;
                      margin-top: 20px;
                      padding-left: 18px;
                    "
                  >
                    <el-row style="font-size: 20px; text-align: left">
                      {{ songMetaInfo.songName }}
                    </el-row>

                    <el-row>
                      <el-col :span="10">
                        <el-row
                          style="
                            margin-top: 20px;
                            font-size: 13px;
                            text-align: left;
                          "
                        >
                          歌手： {{ songMetaInfo.artist }}
                        </el-row>
                        <el-row
                          style="
                            margin-top: 13px;
                            font-size: 13px;
                            text-align: left;
                          "
                        >
                          专辑：《{{ songMetaInfo.album }}》
                        </el-row>
                        <el-row
                          style="
                            margin-top: 13px;
                            font-size: 13px;
                            text-align: left;
                          "
                        >
                          时长： {{ songMetaInfo.duration }}
                        </el-row>
                      </el-col>
                      <el-col
                        :span="14"
                        style="text-align: left; margin-top: 20px"
                      >
                        <el-link
                          @click="playTheSong(songMetaInfo)"
                          :underline="false"
                          style="color: white"
                        >
                          <i
                            class="bi bi-play-circle"
                            style="font-size: 40px"
                          ></i>
                        </el-link>
                        <el-tooltip
                          :content="
                            wyAccount
                              ? '上传歌曲到云盘'
                              : '上传歌曲到云盘(请先绑定网易云账号)'
                          "
                          placement="bottom"
                        >
                          <el-link
                            @click="uploadToCloud(songMetaInfo.pageUrl)"
                            :underline="false"
                            :disabled="!wyAccount ? true : false"
                            style="
                              color: white;
                              margin-left: 20px;
                              margin-top: 6px;
                            "
                          >
                            <i
                              class="bi bi-cloud-upload"
                              style="font-size: 40px"
                            ></i>
                          </el-link>
                        </el-tooltip>

                        <!-- download to service local -->
                        <el-tooltip
                          :content="
                            globalConfig.downloadPathExisted
                              ? '下载到服务器'
                              : '下载到服务器(请先配置下载路径)'
                          "
                          placement="bottom"
                        >
                          <el-link
                            @click="
                              downloadToLocalService(songMetaInfo.pageUrl)
                            "
                            :underline="false"
                            :disabled="
                              !globalConfig.downloadPathExisted ? true : false
                            "
                            style="
                              color: white;
                              margin-left: 20px;
                              margin-top: 6px;
                            "
                          >
                            <i
                              class="bi bi-cloud-download"
                              style="font-size: 40px"
                            ></i>
                          </el-link>
                        </el-tooltip>
                      </el-col>
                    </el-row>
                  </div>
                  <div
                    style="
                      position: absolute;
                      filter: blur(32px);
                      transform: scale(1.2);
                      top: 0;
                      z-index: -1;
                      width: 100%;
                      height: 100%;
                    "
                  >
                    <img
                      :src="songMetaInfo.coverUrl"
                      onerror="this.src='https://cdnmusic.migu.cn/v3/static/img/common/default/img_default_240x240.jpg'"
                      style="width: 100%; height: 100%"
                    />
                  </div>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </el-col>
      </el-row>
    </transition>

    <!-- 搜索结果表格 -->
    <transition name="slide-fade">
      <el-row v-if="searchResult.length > 0" class="search-result-container">
        <SearchResultTable
          :playTheSong="playTheSong"
          :abortTheSong="abortTheSong"
          :suggestMatchSongId="suggestMatchSongId"
          :searchResult="searchResult"
        />
      </el-row>
      <!-- Add music animation when no search -->
      <el-row v-else class="music-animation-container">
        <div class="music-notes">
          <i class="bi bi-music-note-beamed note"></i>
          <i class="bi bi-music-note note"></i>
          <i class="bi bi-vinyl note"></i>
          <i class="bi bi-music-note-beamed note"></i>
          <i class="bi bi-music-note note"></i>
        </div>
      </el-row>
    </transition>
  </el-main>
</template>

<script>
import {
  searchSongs,
  getSongsMeta,
  createSyncSongFromUrlJob,
  getGlobalConfig,
} from "../../api";
import SearchResultTable from "../../components/SearchResultTable.vue";
import { secondDurationToDisplayDuration, sourceCodeToName } from "../../utils";
import { startTaskListener } from "../../components/TaskNotification";
import storage from "../../utils/storage";

export default {
  data: () => {
    return {
      suggestMatchSongId: "",
      songMetaInfo: null,
      playUrl: "",
      keyword: "",
      searchTip: "",
      isSearching: false,
      searchResult: [],
      wyAccount: null,
      globalConfig: null,
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
  },
  async mounted() {
    this.wyAccount = storage.get("wyAccount");
    this.loadGlobalConfig();
  },
  watch: {
    $route(to, from) {
      this.wyAccount = storage.get("wyAccount");
      if (to.path === "/" || to.path === "/home" || to.path === "") {
        this.loadGlobalConfig();
      }
    },
  },
  setup(props, { emit }) {
    const playTheSong = (songMeta, pageUrl, suggestMatchSongId) => {
      props.playTheSong(songMeta, pageUrl, suggestMatchSongId);
    };
    const abortTheSong = () => {
      props.abortTheSong();
    };
    return {
      abortTheSong,
      playTheSong,
    };
  },
  components: {
    SearchResultTable,
  },
  methods: {
    async uploadToCloud(pageUrl) {
      const ret = await createSyncSongFromUrlJob(pageUrl);
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
    async onSearch() {
      if (this.keyword.trim().length === 0) {
        return;
      }
      this.songMetaInfo = null;
      this.searchTip = `正在搜索 ${this.keyword}`;
      this.isSearching = true;

      if (
        this.keyword.indexOf("163.com") >= 0 &&
        this.keyword.indexOf("/song") >= 0
      ) {
        const songIdMatch = this.keyword.match(/id=([\d]+)/);
        if (songIdMatch && songIdMatch.length > 1) {
          this.suggestMatchSongId = songIdMatch[1];
        }
      }

      try {
        if (this.keyword.indexOf("http") >= 0) {
          getSongsMeta({ url: this.keyword }).then((ret) => {
            const info = ret.data.songMeta;
            if (info) {
              info.album = info.album != "" ? info.album : "未知";
              info.duration = secondDurationToDisplayDuration(info.duration);
              info.sourceName = sourceCodeToName(info.source);
              this.songMetaInfo = info;
            } else {
              this.songMetaInfo = null;
            }
          });
        }

        const result = await searchSongs({ keyword: this.keyword });
        console.log(result);
        const songs = result.data.songs
          .map((song) => {
            song.album = song.album != "" ? `《${song.album}》` : " - ";
            song.duration = secondDurationToDisplayDuration(song.duration);
            song.sourceName = sourceCodeToName(song.source);
            return song;
          })
          .filter((song) => song.songName.length > 0);

        console.log(JSON.stringify(songs));

        this.searchResult = songs;

        this.searchTip = "";
      } catch (e) {
        this.searchTip = "搜索失败";
      } finally {
        this.isSearching = false;
      }
    },
  },
};
</script>

<style scoped>
.search-container {
  margin-top: 40px;
  margin-bottom: 30px;
}

.search-input {
  .el-input__inner {
    border-radius: 24px;
    padding-left: 45px;
    height: 48px;
    font-size: 16px;
  }

  .el-input__prefix {
    left: 15px;
    font-size: 18px;
    color: #909399;
  }
}

.search-btn {
  width: 100px;
  height: 48px;
  border-radius: 24px;
  font-size: 16px;
}

.search-tip {
  font-size: 18px;
  color: #606266;
  margin-top: 15px;
}

.song-card-container {
  margin-bottom: 30px;
}

.song-card {
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
}

.search-result-container {
  margin-bottom: 60px;
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

.music-animation-container {
  height: 400px;
  margin-top: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.music-notes {
  position: relative;
  width: 300px;
}

.note {
  position: absolute;
  font-size: 24px;
  color: #409eff;
  opacity: 0;
  animation: float 4s ease-in-out infinite;
}

.note:nth-child(1) {
  left: 10%;
  animation-delay: 0s;
}

.note:nth-child(2) {
  left: 30%;
  animation-delay: 1s;
}

.note:nth-child(3) {
  left: 50%;
  font-size: 32px;
  animation-delay: 2s;
}

.note:nth-child(4) {
  left: 70%;
  animation-delay: 1.5s;
}

.note:nth-child(5) {
  left: 90%;
  animation-delay: 0.5s;
}

@keyframes float {
  0% {
    transform: translateY(120px) rotate(5deg);
    opacity: 0;
  }
  20% {
    opacity: 0.8;
  }
  80% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(-120px) rotate(-5deg);
    opacity: 0;
  }
}
</style>
