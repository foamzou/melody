<template>
  <div>
    <van-tabs
      v-model:active="active"
      swipeable
      animated
      sticky
      replace
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
          <van-col span="24">
            <RecycleScroller
              style="height: 100%"
              :items="playlistDetails[i].songs"
              :item-size="40"
              key-field="songId"
              v-slot="{ item, index: j }"
            >
              <van-col span="23" offset="1">
                <van-row>
                  <van-col span="19">
                    <van-row
                      @click="
                        playTheSongWithPlayUrl(
                          {
                            playUrl: item.playUrl,
                            coverUrl: item.cover,
                            songName: item.songName,
                            pageUrl: item.pageUrl,
                            artist: item.artists[0],
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
                            style="font-size: 13px"
                          ></i>
                          <i
                            v-else-if="item.isCloud"
                            class="bi bi-cloud"
                            style="font-size: 13px"
                          ></i>
                          <i
                            v-else
                            class="bi bi-heart-fill"
                            style="color: red; font-size: 13px"
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
                      v-show="
                        currentSongIndexObj.playlistIndex == i &&
                        currentSongIndexObj.songIndex == j
                      "
                      class="bi bi-soundwave"
                    ></i>
                  </van-col>
                  <van-col
                    span="4"
                    style="float: right; color: gray; line-height: 32px"
                  >
                    <div v-if="item.isBlocked">
                      <span
                        @click="searchTheSong(item.pageUrl)"
                        style="padding-right: 16px"
                      >
                        <i class="bi bi-search" style="font-size: 20px"></i>
                      </span>
                      <span @click="unblockTheSong(item.songId)">
                        <i
                          class="bi bi-unlock-fill"
                          style="font-size: 20px"
                        ></i>
                      </span>
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
import { startTaskListener } from "../../components/TaskNotification";
import { ref } from "vue";

export default {
  data: () => {
    return {
      currentSongIndexObj: { playlistIndex: -1, songIndex: -1 },
      searchTip: "",
      showSearchPage: false,
      tableKey: 1,
      showUnblockSongsOnly: true,
      tableFilterValues: ["blocked"],
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
    abortTheSong: {
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

    const abortTheSong = () => {
      props.abortTheSong();
    };

    return {
      parentPlayTheSong: props.playTheSong,
      parentPlayTheSongWithPlayUrl: props.playTheSongWithPlayUrl,
      abortTheSong,
      tableRef,
      active,
      ellipsis,
    };
  },
  async mounted() {
    console.log("mounted");
    const playlistRet = await getAllPlaylist();
    this.playlists = playlistRet.data.playlists;
  },
  methods: {
    playTheSong(metaInfo, playUrl) {
      this.parentPlayTheSong(metaInfo, playUrl);
    },
    playTheSongWithPlayUrl(playOption, playlistIndex, songIndex) {
      this.currentSongIndexObj.playlistIndex = playlistIndex;
      this.currentSongIndexObj.songIndex = songIndex;
      this.parentPlayTheSongWithPlayUrl(playOption);
    },
    async unblockThePlaylist(playlistId) {
      const ret = await createSyncSongFromPlaylistJob(playlistId);
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
      }
    },
    async unblockTheSong(songId) {
      const ret = await createSyncSongWithSongIdJob(songId);
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
      }
    },
    async showPlaylistDetail(tabIndex) {
      if (this.playlistDetails[tabIndex]) {
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
    },
    filterHandler(value, row, column) {
      if (value == "all") {
        return true;
      }
      if (value == "cloud") {
        return row.isCloud;
      }
      if (value == "blocked") {
        return row.isBlocked;
      }
    },
    filterHandlerChange(showBlockedOnly) {
      if (showBlockedOnly) {
        this.showBlockedOnly = true;
        this.tableFilterValues = ["blocked"];
      } else {
        this.showBlockedOnly = false;
        this.tableFilterValues = ["all"];
      }
      this.tableKey++;
    },
    async searchTheSong(pageUrl) {
      this.searchTip = "正在搜索...";
      this.searchResult = [];
      this.showSearchPage = true;
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
      this.searchTip = "";
    },
    onTabChange(tabIndex) {
      this.showPlaylistDetail(tabIndex);
    },
  },
};
</script>

<style scoped>
@media (min-height: 500px) {
  .search-scollbar {
    height: 600px;
  }
}
@media (min-height: 900px) {
  .search-scollbar {
    height: 700px;
  }
}
</style>
