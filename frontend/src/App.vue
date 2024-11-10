<template>
  <div class="common-layout">
    <el-container>
      <el-header height="120px" style="padding: 0">
        <el-row>
          <el-col :span="24">
            <el-row>
              <el-col :span="2" :offset="10">
                <el-image src="/melody.png" style="width: 90px; height: 90px" />
              </el-col>
              <el-col :span="5" style="text-align: left; margin-top: 28px">
                <el-row>
                  <span style="font-size: 30px; font-weight: bold">Melody</span>
                </el-row>
                <el-row>
                  <span style="font-size: 12px; color: grey; margin-left: 25px"
                    >我的音乐精灵</span
                  >
                </el-row>
              </el-col>
              <el-col :span="7">
                <a
                  href="https://github.com/foamzou/melody"
                  class="github-corner"
                  aria-label="View source on GitHub"
                  ><svg
                    width="80"
                    height="80"
                    viewBox="0 0 250 250"
                    style="
                      fill: #151513;
                      color: #fff;
                      position: absolute;
                      top: 0;
                      border: 0;
                      right: 0;
                    "
                    aria-hidden="true"
                  >
                    <path
                      d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"
                    ></path>
                    <path
                      d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
                      fill="currentColor"
                      style="transform-origin: 130px 106px"
                      class="octo-arm"
                    ></path>
                    <path
                      d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z"
                      fill="currentColor"
                      class="octo-body"
                    ></path></svg
                ></a>
              </el-col>
            </el-row>
          </el-col>
        </el-row>

        <el-row class="nav-container">
          <el-col :span="12" :offset="6">
            <div class="nav-menu">
              <div
                v-for="(item, index) in navItems"
                :key="index"
                class="nav-item"
                :class="{ active: currentPath === item.path }"
                @click="navigate(item.path)"
              >
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-header>
      <router-view
        :playTheSong="playTheSong"
        :playTheSongWithPlayUrl="playTheSongWithPlayUrl"
        :abortTheSong="abortTheSong"
        v-slot="{ Component }"
      >
        <transition>
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
      <el-footer
        v-if="playerSongInfo.playUrl"
        height="70px"
        class="player-footer"
      >
        <div class="player-container">
          <el-row align="middle" class="player-content">
            <!-- 左侧：封面和歌曲信息 -->
            <el-col :span="6" class="song-info">
              <div class="cover-image">
                <el-image
                  :src="playerSongInfo.coverUrl"
                  fit="cover"
                  class="cover"
                />
              </div>
              <div class="song-details">
                <div class="song-name">{{ playerSongInfo.songName }}</div>
                <div class="artist-name">{{ playerSongInfo.artist }}</div>
              </div>
            </el-col>

            <!-- 中间：播放器控件 -->
            <el-col :span="12" class="player-controls">
              <audio
                id="audio"
                autoplay
                :src="playerSongInfo.playUrl"
                controls="controls"
                class="audio-player"
              />
            </el-col>

            <!-- 右侧：操作按钮 -->
            <el-col :span="6" class="operation-buttons">
              <el-tooltip
                :content="
                  wyAccount
                    ? '上传歌曲到云盘'
                    : '上传歌曲到云盘(请先绑定网易云账号)'
                "
                placement="top"
              >
                <el-button
                  circle
                  class="operation-btn"
                  :disabled="!playerSongInfo.pageUrl || !wyAccount"
                  @click="
                    uploadToCloud(
                      playerSongInfo.pageUrl,
                      playerSongInfo.suggestMatchSongId
                    )
                  "
                >
                  <i class="bi bi-cloud-upload"></i>
                </el-button>
              </el-tooltip>

              <el-tooltip content="在源站查看" placement="top">
                <el-button
                  circle
                  class="operation-btn"
                  :disabled="!playerSongInfo.pageUrl"
                  @click="window.open(playerSongInfo.pageUrl, '_blank')"
                >
                  <i class="bi bi-box-arrow-up-right"></i>
                </el-button>
              </el-tooltip>
            </el-col>
          </el-row>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import { getPlayUrl, getSongsMeta, createSyncSongFromUrlJob } from "./api";
import { startTaskListener } from "./components/TaskNotification";
import storage from "./utils/storage";

export default {
  data: () => {
    return {
      playerSongInfo: {
        songName: "",
        artist: "",
        coverUrl: "/melody.png",
        playUrl: "",
        pageUrl: "",
        suggestMatchSongId: "",
      },
      wyAccount: null,
      navItems: [
        { label: "搜索", path: "/", icon: "bi bi-search" },
        { label: "我的歌单", path: "/playlist", icon: "bi bi-music-note-list" },
        { label: "我的音乐账号", path: "/account", icon: "bi bi-person" },
        { label: "设置", path: "/setting", icon: "bi bi-gear" },
      ],
      currentPath: "/",
    };
  },
  mounted() {
    this.wyAccount = storage.get("wyAccount");
  },
  watch: {
    $route(to) {
      this.wyAccount = storage.get("wyAccount");
      this.currentPath = to.path;
    },
  },
  methods: {
    async uploadToCloud(pageUrl, suggestMatchSongId) {
      const ret = await createSyncSongFromUrlJob(pageUrl, suggestMatchSongId);
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
      }
    },
    search() {
      this.$router.push("/");
    },
    account() {
      this.$router.push("/account");
    },
    playlist() {
      this.$router.push("/playlist");
    },
    setting() {
      this.$router.push("/setting");
    },
    async playTheSong(metaInfo, pageUrl, suggestMatchSongId) {
      console.log("------------------------");
      console.log(metaInfo);
      console.log(pageUrl);
      let info = metaInfo;
      if (!info) {
        const ret = await getSongsMeta({ url: pageUrl });
        info = ret.data.songMeta;
        console.log(ret);
      }

      const resourceForbidden = info.resourceForbidden;
      const songUrl = info.audios[0].url;
      console.log("play: ", songUrl);
      this.playerSongInfo.playUrl = songUrl;
      this.playerSongInfo.coverUrl = info.coverUrl;
      this.playerSongInfo.songName = info.songName;
      this.playerSongInfo.artist = info.artist;
      this.playerSongInfo.pageUrl = info.pageUrl || pageUrl;
      this.playerSongInfo.suggestMatchSongId = suggestMatchSongId;
    },
    async playTheSongWithPlayUrl(playOption) {
      const playUrlRet = await getPlayUrl(playOption.songId);
      if (playUrlRet.data.playUrl) {
        playOption.playUrl = playUrlRet.data.playUrl;
      }

      this.playerSongInfo.playUrl = playOption.playUrl;
      this.playerSongInfo.coverUrl = playOption.coverUrl;
      this.playerSongInfo.songName = playOption.songName;
      this.playerSongInfo.artist = playOption.artist;
      this.playerSongInfo.pageUrl = playOption.pageUrl;
      return true;
    },
    abortTheSong() {
      this.playerSongInfo.playUrl = "";
    },
    navigate(path) {
      this.$router.push(path);
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 3px;
}

.nav span {
  font-size: 18px;
}

.el-dialog {
  margin-top: 30px;
}

.github-corner:hover .octo-arm {
  animation: octocat-wave 560ms ease-in-out;
}
@keyframes octocat-wave {
  0%,
  100% {
    transform: rotate(0);
  }
  20%,
  60% {
    transform: rotate(-25deg);
  }
  40%,
  80% {
    transform: rotate(10deg);
  }
}
@media (max-width: 500px) {
  .github-corner:hover .octo-arm {
    animation: none;
  }
  .github-corner .octo-arm {
    animation: octocat-wave 560ms ease-in-out;
  }
}

<style scoped > .nav-container {
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 8px 0;
  margin-top: 10px;
}

.nav-menu {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #606266;
}

.nav-item:hover {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.nav-item.active {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  font-weight: 500;
}

.nav-item i {
  font-size: 18px;
  margin-right: 6px;
}

.nav-item span {
  font-size: 15px;
}

.player-footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  background: linear-gradient(to right, #1a1a1a, #2d2d2d);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  padding: 0;
}

.player-container {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
}

.player-content {
  height: 70px;
  padding: 0 20px;
}

.song-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.cover-image {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-details {
  color: #fff;
}

.song-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.artist-name {
  font-size: 12px;
  color: #a8a8a8;
}

.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-player {
  width: 100%;
  max-width: 600px;
  height: 32px;
  border-radius: 16px;
}

.player-footer .operation-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #000000;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.3);
  }

  i {
    font-size: 16px;
  }
}
</style>
