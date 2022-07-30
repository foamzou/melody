<template>
  <div style="width: 100%">
    <van-col span="22">
      <van-row
        v-for="(item, i) in searchResult"
        :key="i"
        style="margin-top: 15px; text-align: left"
      >
        <van-col span="23" offset="1">
          <van-row>
            <van-col span="22">
              <van-row @click="play(null, item.url, i)">
                <van-col style="font-size: 16px">
                  <i
                    v-if="item.resourceForbidden"
                    class="bi bi-lock-fill"
                    style="font-size: 13px; padding-right: 5px; color: gray"
                  ></i>
                  <span>
                    {{ ellipsis(item.songName, 18) }}
                  </span>
                  <span
                    style="color: #0f1c69; font-size: 13px; padding-left: 6px"
                  >
                    {{ item.sourceName }}
                  </span>
                </van-col>
              </van-row>
              <van-row style="margin-top: 4px">
                <van-col style="color: gray; font-size: 10px">
                  {{ item.artist }} / {{ ellipsis(item.album, 20) }} /
                  {{ item.duration }}
                </van-col>
              </van-row>
            </van-col>
            <van-col span="1" style="line-height: 32px; color: red">
              <i v-show="currentSongIndex == i" class="bi bi-soundwave"></i>
            </van-col>
            <van-col span="1">
              <van-col
                span="2"
                style="float: right; color: gray; line-height: 32px"
              >
                <van-popover
                  v-model:show="showPopover[i]"
                  :actions="[
                    {
                      text: '上传到云盘',
                      icon: 'upgrade',
                      action: ActionUpload,
                      songIndex: i,
                    },
                    {
                      text: '下载到本地',
                      icon: 'down',
                      action: ActionDownload,
                      songIndex: i,
                    },
                    {
                      text: '打开源站',
                      icon: 'share',
                      action: ActionOpenRef,
                      songIndex: i,
                    },
                  ]"
                  placement="left"
                  overlay
                  overlay-class="popover-overlay"
                  @select="onSelect"
                >
                  <template #reference>
                    <i class="bi bi-three-dots-vertical"></i>
                  </template>
                </van-popover>
              </van-col>
            </van-col>
          </van-row>
        </van-col>
      </van-row>
    </van-col>
  </div>
</template>

<script>
import { ref } from "vue";
import { createSyncSongFromUrlJob, getSongsMeta } from "../api";
import { startTaskListener } from "./TaskNotificationForMobile";
import storage from "../utils/storage";
import { ellipsis } from "../utils";

const ActionUpload = 0;
const ActionDownload = 1;
const ActionOpenRef = 2;

export default {
  data() {
    return {
      currentSongIndex: -1,
      wyAccount: null,
    };
  },
  props: {
    playTheSong: {
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
  created() {
    this.ActionUpload = ActionUpload;
    this.ActionDownload = ActionDownload;
    this.ActionOpenRef = ActionOpenRef;
  },
  mounted() {
    this.wyAccount = storage.get("wyAccount");
  },
  setup(props, { emit }) {
    const playTheSong = (songMeta, pageUrl, suggestMatchSongId) => {
      props.playTheSong(songMeta, pageUrl, suggestMatchSongId);
    };

    const showPopover = ref([]);

    return {
      playTheSong,
      showPopover,
      ellipsis,
    };
  },
  watch: {
    $route(to, from) {
      this.wyAccount = storage.get("wyAccount");
    },
    searchResult: {
      handler(val) {
        this.currentSongIndex = -1;
      },
      deep: true,
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
    play(songMeta, pageUrl, index) {
      if (this.currentSongIndex === index) {
        return;
      }
      this.currentSongIndex = index;
      this.playTheSong(songMeta, pageUrl, this.suggestMatchSongId);
    },
    async onSelect(actionItem) {
      const currentSong = this.searchResult[actionItem.songIndex];
      console.log(currentSong);
      switch (actionItem.action) {
        case ActionUpload:
          this.uploadToCloud(currentSong.url);
          break;
        case ActionDownload:
          const ret = await getSongsMeta({ url: currentSong.url });
          const info = ret.data.songMeta;
          console.log(ret);
          const a = document.createElement("a");
          a.href = info.audios[0].url;
          a.download = `${currentSong.songName}-${currentSong.artist}.mp3`;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          a.remove();
          break;
        case ActionOpenRef:
          window.open(currentSong.url, "_blank").focus();
          break;
      }
    },
  },
};
</script>
