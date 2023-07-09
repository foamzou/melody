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

        <el-row class="nav" style="text-align: center">
          <el-col :span="3">
            <el-link type="primary" @click="search()">搜索</el-link>
          </el-col>
          <el-col :span="3">
            <el-link type="primary" @click="playlist()">我的歌单</el-link>
          </el-col>
          <el-col :span="3">
            <el-link type="primary" @click="account()">我的音乐账号</el-link>
          </el-col>
          <el-col :span="3">
            <el-link type="primary" @click="setting()">设置</el-link>
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
        style="
          height: 60px;
          background: black;
          width: 100%;
          position: fixed;
          bottom: 0;
          left: 0;
          z-index: 10;
        "
      >
        <div style="color: white">
          <el-row>
            <el-col :span="2" :offset="1">
              <el-image
                v-if="playerSongInfo.coverUrl"
                :src="playerSongInfo.coverUrl"
                style="padding: 6px; width: 50px; height: 50px"
              />
            </el-col>
            <el-col :span="3" style="margin-top: 12px; margin-left: 2px">
              <el-row style="font-weight: bold">
                {{ playerSongInfo.songName }}
              </el-row>
              <el-row style="font-size: 10px; margin-top: 3px">
                {{ playerSongInfo.artist }}
              </el-row>
            </el-col>
            <el-col :span="12">
              <audio
                id="audio"
                autoplay
                :src="playerSongInfo.playUrl"
                controls="controls"
                style="width: 600px; height: 25px; margin-top: 20px"
              ></audio>
            </el-col>
            <el-col :span="2">
              <el-tooltip
                :content="
                  wyAccount
                    ? '上传歌曲到云盘'
                    : '上传歌曲到云盘(请先绑定网易云账号)'
                "
                placement="top"
              >
                <el-link
                  @click="
                    uploadToCloud(
                      playerSongInfo.pageUrl,
                      playerSongInfo.suggestMatchSongId
                    )
                  "
                  :disabled="
                    !playerSongInfo.pageUrl || !wyAccount ? true : false
                  "
                  :underline="false"
                  style="margin: 20px 0 0 20px; color: white"
                >
                  <i class="bi bi-cloud-upload" style="font-size: 22px"></i>
                </el-link>
              </el-tooltip>
              <el-tooltip content="在源站查看" placement="top">
                <el-link
                  :disabled="!playerSongInfo.pageUrl"
                  :href="playerSongInfo.pageUrl"
                  target="_blank"
                  style="margin: 20px 0 0 20px; color: white"
                >
                  <i
                    class="bi bi-box-arrow-up-right"
                    style="font-size: 20px"
                  ></i>
                </el-link>
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
    };
  },
  mounted() {
    this.wyAccount = storage.get("wyAccount");
  },
  watch: {
    $route(to, from) {
      this.wyAccount = storage.get("wyAccount");
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
      if (!playOption.playUrl) {
        const playUrlRet = await getPlayUrl(playOption.songId);
        if (!playUrlRet.data.playUrl) {
          return false;
        }
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
</style>
