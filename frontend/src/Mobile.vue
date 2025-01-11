<template>
  <div class="common-layout">
    <van-row>
      <van-col span="8">
        <van-image src="/melody.png" style="width: 60px; height: 60px" />
      </van-col>
      <van-col span="8" style="margin-top: 15px">
        <van-row>
          <span style="font-size: 20px; font-weight: bold">Melody</span>
        </van-row>
        <van-row>
          <span style="font-size: 12px; color: grey">我的音乐精灵</span>
        </van-row>
      </van-col>
      <van-col span="8">
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
            <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
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
      </van-col>
    </van-row>

    <router-view
      :playTheSong="playTheSong"
      :playTheSongWithPlayUrl="playTheSongWithPlayUrl"
      v-slot="{ Component }"
      :style="
        songInfos.length > 0 ? 'margin-bottom: 136px;' : 'margin-bottom: 60px;'
      "
    >
      <transition>
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view>

    <div
      v-show="songInfos.length > 0"
      style="
        padding-bottom: 5px;
        height: 80px;
        width: 100%;
        position: fixed;
        bottom: 50px;
        left: 0;
        background-color: white;
        z-index: 10;
      "
    >
      <Player
        :songInfos="songInfos"
        :currentSongIndex="currentSongIndex"
        :changedTime="changedTime"
      ></Player>
    </div>

    <van-tabbar v-model="active" route>
      <van-tabbar-item icon="search" to="/" @click="search()"
        >搜索</van-tabbar-item
      >
      <van-tabbar-item icon="like-o" to="/playlist" @click="playlist()"
        >歌单</van-tabbar-item
      >
      <van-tabbar-item icon="contact" to="/account" @click="account()"
        >音乐账号</van-tabbar-item
      >
    </van-tabbar>
  </div>
</template>

<script>
import { ref } from "vue";
import {
  searchSongs,
  getSongsMeta,
  createSyncSongFromUrlJob,
  getPlayUrl,
} from "./api";
import { startTaskListener } from "./components/TaskNotification";
import Player from "./components/Player.vue";
import storage from "./utils/storage";
import { Notify } from "vant";
import { getProperPlayUrl } from "./utils/audio";

export default {
  setup() {
    const active = ref(0);
    return {
      active,
    };
  },
  components: {
    Player,
  },
  data: () => {
    return {
      songInfos: [],
      currentSongIndex: 0,
      changedTime: 0,
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
    search() {
      this.$router.push("/");
    },
    account() {
      this.$router.push("/account");
    },
    playlist() {
      this.$router.push("/playlist");
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

      const songUrl = info.audios[0].url;
      console.log("play: ", songUrl);

      // 处理播放 URL
      const processedPlayUrl = getProperPlayUrl(
        info.source,
        songUrl,
        pageUrl || info.pageUrl
      );

      this.songInfos.push({
        playUrl: processedPlayUrl,
        coverUrl: info.coverUrl,
        songName: info.songName,
        artist: info.artist,
        pageUrl: info.pageUrl || pageUrl,
        suggestMatchSongId,
      });
      this.currentSongIndex = this.songInfos.length - 1;
      this.changedTime = new Date().getTime();
    },
    async playTheSongWithPlayUrl(playOption) {
      if (!playOption.playUrl) {
        const playUrlRet = await getPlayUrl(playOption.songId);
        if (!playUrlRet.data.playUrl) {
          Notify({ type: "warning", message: "获取播放链接失败" });
          return false;
        }
        playOption.playUrl = playUrlRet.data.playUrl;
      }
      this.songInfos.push(playOption);
      this.currentSongIndex = this.songInfos.length - 1;
      this.changedTime = new Date().getTime();
      return true;
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
