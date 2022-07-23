<template>
  <div class="player-body">
    <van-row style="height: 62px; overflow: hidden">
      <van-col span="3">
        <van-image
          style="padding: 3px"
          width="100%"
          :src="currentSong.coverUrl"
        />
      </van-col>
      <van-col span="15" style="text-align: left; padding: 3px 0 0 10px">
        <div style="font-weight: bold; font-size: 18px">
          {{ keepSomeText(currentSong.songName, 22) }}
        </div>
        <div>
          <span style="color: gray; font-size: 13px">
            {{ currentSong.artist }}
          </span>
        </div>
      </van-col>
      <van-col span="3" style="height: 100%">
        <i
          v-if="isPlaying"
          class="bi bi-pause-circle"
          style="line-height: 60px; font-size: 20px; color: gray"
          @click="pauseSong"
        ></i>
        <i
          v-if="!isPlaying"
          class="bi bi-play-circle"
          style="line-height: 60px; font-size: 20px; color: gray"
          @click="continueSong"
        ></i>
      </van-col>
      <van-col span="3">
        <van-popover
          v-model:show="showPopover"
          :actions="actions"
          placement="left-end"
          @select="onSelect"
        >
          <template #reference>
            <i
              style="line-height: 60px; font-size: 20px; color: gray"
              class="bi bi-list"
            ></i>
          </template>
        </van-popover>
      </van-col>
    </van-row>
    <van-row>
      <van-col span="2" style="font-size: 10px; padding-left: 2px">{{
        secondDurationToDisplayDuration(currentSeek, true)
      }}</van-col>
      <van-col span="20" style="padding: 5px 7px 0 7px">
        <van-slider
          :max="totalTime"
          bar-height="2"
          button-size="10"
          v-model="currentSeek"
          @change="onSlicerChange"
        />
      </van-col>
      <van-col
        span="2"
        style="font-size: 10px; color: gray; padding-right: 2px"
        >{{ secondDurationToDisplayDuration(totalTime) }}</van-col
      >
    </van-row>
  </div>
</template>

<style>
.player-body {
  background-color: white;
  padding-top: 10px;
}

:root {
  --van-popover-action-font-size: 13px;
}
</style>

<script>
import { nextTick, ref } from "vue";
import { Howl, Howler } from "howler";
import { secondDurationToDisplayDuration, sleep } from "../utils";
import { createSyncSongFromUrlJob } from "../api";
import { startTaskListener } from "./TaskNotificationForMobile";

let playerCtl;
let currentPlayId;

const ActionUpload = 0;
const ActionDownload = 1;
const ActionOpenRef = 2;

export default {
  data() {
    return {
      totalTime: 0,
      currentSeek: 0,
      currentSong: this.songInfos[this.currentSongIndex] || {},
      isPlaying: false,
    };
  },
  props: {
    songInfos: {
      type: Array,
      required: true,
    },
    currentSongIndex: {
      type: Number,
      required: false,
      default: 0,
    },
    changedTime: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  watch: {
    changedTime: function () {
      this.currentSong = this.songInfos[this.currentSongIndex];
      this.playSong();
    },
  },
  methods: {
    secondDurationToDisplayDuration,
    async timeChanged() {
      const currentSeek = playerCtl.seek();

      // for performance
      if (parseInt(currentSeek) !== parseInt(this.currentSeek)) {
        this.currentSeek = currentSeek;
      } else {
        await sleep(150);
      }

      requestAnimationFrame(this.timeChanged);
    },
    pauseSong() {
      playerCtl.pause(currentPlayId);
      this.isPlaying = false;
    },
    playSong() {
      console.log(this.songInfos);
      console.log(this.currentSong.playUrl);
      if (playerCtl) {
        playerCtl.stop();
      }
      playerCtl = new Howl({
        src: [this.currentSong.playUrl],
        html5: true,
        onload: () => {
          console.log("load");
          this.totalTime = playerCtl.duration();
        },
        onend: () => {
          console.log("end");
          this.isPlaying = false;
        },
      });
      currentPlayId = playerCtl.play();
      this.isPlaying = true;

      this.timeChanged();
    },
    continueSong() {
      if (!currentPlayId) {
        this.playSong();
        return;
      }
      playerCtl.play(currentPlayId);
      this.isPlaying = true;
    },
    onSlicerChange(time) {
      console.log("slicer changed", time);
      playerCtl.seek(time);
    },
    keepSomeText(text, length) {
      if (!text) {
        return "";
      }
      if (text.length > length) {
        return text.substring(0, length) + "...";
      } else {
        return text;
      }
    },
    async uploadToCloud() {
      if (!this.currentSong) {
        return;
      }
      console.log(this.currentSong);
      const ret = await createSyncSongFromUrlJob(
        this.currentSong.pageUrl,
        this.currentSong.suggestMatchSongId ?? 0
      );
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
      }
    },
    async onSelect(actionItem) {
      switch (actionItem.action) {
        case ActionUpload:
          this.uploadToCloud();
          break;
        case ActionDownload:
          const a = document.createElement("a");
          a.href = this.currentSong.playUrl;
          a.download = `${this.currentSong.songName}-${this.currentSong.artist}.mp3`;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          a.remove();
          break;
        case ActionOpenRef:
          window.open(this.currentSong.pageUrl, "_blank").focus();
          break;
      }
    },
  },
  setup(props, { emit }) {
    //   const playTheSong = (songMeta, pageUrl, index) => {
    //     props.playTheSong(songMeta, pageUrl, index);
    //   };
    //   const abortTheSong = () => {
    //     props.abortTheSong();
    //   };
    const showPopover = ref(false);
    const actions = [
      { text: "上传到云盘", icon: "upgrade", action: ActionUpload },
      { text: "下载到本地", icon: "down", action: ActionDownload },
      { text: "打开源站", icon: "share", action: ActionOpenRef },
    ];

    return {
      showPopover,
      actions,
    };
  },
};
</script>
