<template>
  <div>
    <van-popup
      v-model:show="showPopup"
      round
      position="top"
      closeable
      :lock-scroll="false"
      safe-area-inset-top
      :style="{ height: 'calc(100% - 280px)' }"
      @close="closeThePopup"
    >
      <div v-if="searchResult.length === 0" style="height: 300px">
        <van-loading style="padding-top: 230px" size="24px" vertical
          >拼命搜索中...</van-loading
        >
      </div>
      <van-row style="margin-top: 30px" v-if="searchResult.length > 0">
        <SearchResultList
          :playTheSong="playTheSong"
          :suggestMatchSongId="suggestMatchSongId"
          :searchResult="searchResult"
        >
        </SearchResultList>
      </van-row>
    </van-popup>
    <van-tabs
      v-model:active="active"
      sticky
      @rendered="onRendered"
      @change="onTabChange"
    >
      <van-tab v-for="(item, i) in playlists" :key="i">
        <template #title>
          <van-image round width="40" height="40" :src="item.cover" />
          <div style="width: 90px; height: 60px">
            {{ item.name }}
          </div>
        </template>
        <div v-if="!playlistDetails[i]" style="height: 300px">
          <van-loading style="padding-top: 130px" size="24px" vertical
            >歌单拼命加载中...</van-loading
          >
        </div>
        <div v-if="playlistDetails[i]" style="width: 100%">
          <van-col
            span="24"
            style="margin-top: 3px; color: gray; font-size: 10px"
          >
            <van-divider style="margin: 5px 0">
              全部：{{ playlistDetails[i].songs.length }}首 | 待解锁：{{
                playlistDetails[i].songs.filter((song) => song.isBlocked).length
              }}
              首
            </van-divider>
          </van-col>
          <van-row>
            <van-col span="10">
              <van-button
                type="success"
                round
                size="small"
                @click="unblockThePlaylist(playlistDetails[i].id)"
                style="height: 85%"
              >
                <span style="font-size: 10px">解锁全部</span>
              </van-button>

              <span
                style="
                  font-size: 10px;
                  color: grey;
                  position: relative;
                  top: 5px;
                "
              >
                (实验性功能)
              </span>
            </van-col>
            <van-col span="10" style="position: relative; top: 5px">
              <label for="switch-showBlockSongsOnly" style="font-size: 11px"
                >仅展示待解锁
              </label>
              <van-switch
                id="switch-showBlockSongsOnly"
                v-model="showBlockSongsOnly"
                size="10px"
                active-color="#07c160"
                inactive-color="#d7d7d7"
                style="position: relative; top: 2px"
              />
            </van-col>
            <van-col span="3">
              <span
                style="
                  color: #483d8b;
                  font-size: 11px;
                  position: relative;
                  top: 5px;
                "
                @click="refreshThePlaylist(i)"
              >
                刷新
              </span>
            </van-col>
          </van-row>

          <van-col span="24" style="margin-top: 18px">
            <RecycleScroller
              style="height: 100%"
              :items="
                playlistDetails[i].songs.filter((item) => {
                  if (showBlockSongsOnly) {
                    return item.isBlocked;
                  }
                  return true;
                })
              "
              :item-size="50"
              key-field="songId"
              v-slot="{ item, index: j }"
            >
              <van-col span="23" offset="1">
                <van-row>
                  <van-col span="19">
                    <van-row
                      @click="
                        internalPlayTheSongWithPlayUrl(
                          {
                            songId: item.songId,
                            playUrl: item.playUrl,
                            coverUrl: item.cover,
                            songName: item.songName,
                            pageUrl: item.pageUrl,
                            artist: item.artists[0],
                            isBlocked: item.isBlocked,
                          },
                          i,
                          j
                        )
                      "
                    >
                      <van-col style="font-size: 16px">
                        <span>
                          {{ ellipsis(item.songName, 18) }}
                        </span>
                        <span
                          style="
                            color: #0f1c69;
                            font-size: 13px;
                            padding-left: 6px;
                          "
                        >
                          <i
                            v-if="item.isBlocked"
                            class="bi bi-lock-fill"
                            style="font-size: 13px; color: gray"
                          ></i>
                          <i
                            v-else-if="item.isCloud"
                            class="bi bi-cloud"
                            style="font-size: 13px"
                          ></i>
                        </span>
                      </van-col>
                    </van-row>
                    <van-row style="margin-top: 4px">
                      <van-col style="color: gray; font-size: 10px">
                        {{ item.artists[0] }} / {{ ellipsis(item.album, 20) }} /
                        {{ item.duration }}
                      </van-col>
                    </van-row>
                  </van-col>
                  <van-col span="1" style="line-height: 32px; color: red">
                    <i
                      v-show="currentSongUrl == item.pageUrl"
                      class="bi bi-soundwave"
                    ></i>
                  </van-col>
                  <van-col
                    span="4"
                    style="float: right; color: gray; line-height: 32px"
                  >
                    <div v-if="item.isBlocked">
                      <span @click="unblockTheSong(item.songId)">
                        <i
                          class="bi bi-unlock-fill"
                          style="font-size: 16px"
                        ></i>
                      </span>
                      <!-- <span @click="searchTheSong(item.pageUrl)">
                        <i class="bi bi-search" style="font-size: 16px"></i>
                      </span> -->
                    </div>
                  </van-col>
                </van-row>
              </van-col>
            </RecycleScroller>
          </van-col>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style>
:root {
  --van-tabs-line-height: 110px;
}
.van-overlay {
  height: calc(100% - 138px);
}
.van-popup__close-icon--top-right {
  position: fixed;
  padding: 5px 11px 11px 5px;
  width: 10px;
  height: 10px;
  border-radius: 100%;
  background: rgb(255, 255, 255);
}
</style>

<script>
import {
  searchSongs,
  getAllPlaylist,
  getPlaylistDetail,
  createSyncSongFromPlaylistJob,
  createSyncSongWithSongIdJob,
} from "../../api";
import {
  secondDurationToDisplayDuration,
  sourceCodeToName,
  ellipsis,
} from "../../utils";
import SearchResultList from "../../components/SearchResultListForMobile.vue";
import { startTaskListener } from "../../components/TaskNotificationForMobile";
import { Notify, Dialog } from "vant";
import { ref } from "vue";

export default {
  data: () => {
    return {
      currentSongUrl: "",
      lastSearch: "",
      showBlockSongsOnly: false,
      playlists: [],
      playlistDetails: [],
      searchResult: [],
      suggestMatchSongId: "",
    };
  },
  components: {
    SearchResultList: SearchResultList,
  },
  props: {
    playTheSongWithPlayUrl: {
      type: Function,
      required: true,
    },
    playTheSong: {
      type: Function,
      required: true,
    },
  },
  setup(props, { emit }) {
    const tableRef = ref();
    const active = ref(0);
    const showPopup = ref(false);

    return {
      tableRef,
      active,
      ellipsis,
      showPopup,
    };
  },
  async mounted() {
    const playlistRet = await getAllPlaylist();
    this.playlists = playlistRet.data.playlists;
  },
  methods: {
    async internalPlayTheSongWithPlayUrl(playOption, playlistIndex, songIndex) {
      if (playOption.isBlocked) {
        this.searchTheSong(playOption.pageUrl);
        return;
      }
      if (await this.playTheSongWithPlayUrl(playOption)) {
        this.currentSongUrl = playOption.pageUrl;
      }
    },
    async unblockThePlaylist(playlistId) {
      Dialog.confirm({
        confirmButtonText: "解锁全部",
        message:
          "【智能解锁全部】是一个实验性功能，会根据歌曲名和歌手尝试寻找最合适的来源，但也可能会有货不对版的情况，请谨慎使用。你也可以点击下边单首歌曲的任意区域进入搜索页面，进行手动解锁",
      }).then(async () => {
        // on confirm
        Notify({
          message: "开始解锁歌单",
          type: "primary",
          duration: 1000,
        });
        const ret = await createSyncSongFromPlaylistJob(playlistId, {
          // TODO 先 hard code，后面 mobile 端再做配置
          syncWySong: false,
          syncNotWySong: true,
        });
        console.log(ret);

        if (ret.data && ret.data.jobId) {
          startTaskListener(ret.data.jobId);
        }
      });
    },
    async refreshThePlaylist(tabIndex) {
      Notify({
        message: "开始刷新",
        type: "primary",
        duration: 1000,
      });
      if (await this.showPlaylistDetail(tabIndex, false)) {
        Notify({
          message: "歌单刷新成功",
          type: "success",
          duration: 1000,
        });
      } else {
        Notify({
          message: "歌单刷新失败",
          type: "error",
          duration: 1000,
        });
      }
    },
    async unblockTheSong(songId) {
      const ret = await createSyncSongWithSongIdJob(songId);
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
      }
    },
    async showPlaylistDetail(tabIndex, useCache = true) {
      if (useCache && this.playlistDetails[tabIndex]) {
        return;
      }
      const playlistId = this.playlists[tabIndex].id;
      const detailRet = await getPlaylistDetail(playlistId);
      const playlists = detailRet.data.playlists;
      playlists.songs = playlists.songs.map((song) => {
        song.duration = secondDurationToDisplayDuration(song.duration);
        return song;
      });
      this.playlistDetails[tabIndex] = playlists;
      return true;
    },
    async searchTheSong(pageUrl) {
      this.showPopup = true;
      if (this.lastSearch === pageUrl) {
        return;
      }
      this.searchResult = [];
      console.log(pageUrl);

      if (pageUrl.indexOf("163.com") >= 0 && pageUrl.indexOf("/song") >= 0) {
        const songIdMatch = pageUrl.match(/id=([\d]+)/);
        if (songIdMatch && songIdMatch.length > 1) {
          this.suggestMatchSongId = songIdMatch[1];
        }
      }

      const result = await searchSongs({ keyword: pageUrl });
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
      this.lastSearch = pageUrl;
    },
    onTabChange(tabIndex) {
      this.showPlaylistDetail(tabIndex);
    },
    onRendered(tabIndex) {
      if (tabIndex !== 0) {
        return;
      }
      this.showPlaylistDetail(tabIndex);
    },
    closeThePopup() {
      this.showPopup = false;
    },
  },
  beforeRouteLeave(to, from, next) {
    if (this.showPopup) {
      this.showPopup = false;
      next(false);
    } else {
      next();
    }
  },
};
</script>
