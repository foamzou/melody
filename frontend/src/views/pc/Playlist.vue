<template>
  <el-container style="margin-top: 20px">
    <el-aside width="300px" style="margin-left: 80px">
      <el-scrollbar height="600px">
        <div v-for="item in playlists" :key="item" class="scrollbar-item">
          <el-link :underline="false" @click="showPlaylistDetail(item.id)">
            <el-row>
              <el-col :span="5">
                <el-image
                  style="width: 100%; height: 100%; float: left"
                  :src="item.cover"
                  fit="cover"
                />
              </el-col>
              <el-col :span="16" style="margin-top: 20px">
                {{ item.name }}
              </el-col>
            </el-row>
          </el-link>
        </div>
      </el-scrollbar>
    </el-aside>
    <el-main style="padding: 0; margin-left: 30px">
      <el-dialog v-model="showSearchPage" width="1080px" center>
        <el-scrollbar class="search-scollbar">
          <p v-if="this.searchTip" style="font-size: 20px; text-align: center">
            {{ this.searchTip }}
          </p>
          <SearchResultTable
            :playTheSong="playTheSong"
            :abortTheSong="abortTheSong"
            :suggestMatchSongId="suggestMatchSongId"
            :searchResult="searchResult"
          >
          </SearchResultTable>
        </el-scrollbar>
      </el-dialog>

      <el-row v-if="playlistDetail.id" justify="center" style="height: 150px">
        <el-col :span="2">
          <el-image
            style="width: 100px; height: 100px"
            :src="playlistDetail.cover"
            fit="cover"
          />
        </el-col>
        <el-col :span="18" :offset="1">
          <el-row style="font-size: 20px">{{ playlistDetail.name }}</el-row>
          <el-row style="color: grey; font-size: 10px; margin-top: 5px">
            全部: {{ playlistDetail.songs.length }}首 | 待解锁:
            {{ playlistDetail.songs.filter((song) => song.isBlocked).length }}首
          </el-row>
          <el-row style="margin-top: 20px; text-align: left">
            <el-col :span="6" style="height: 32px; line-height: 32px">
              <el-link
                type="primary"
                :underline="false"
                @click="unblockThePlaylist(playlistDetail.id)"
              >
                <i
                  class="bi bi-unlock-fill"
                  style="font-size: 18px; padding-right: 3px"
                ></i>
                <span style="font-size: 15px"> 解锁全部 </span>
                <span style="font-size: 10px"> (实验性功能) </span>
              </el-link>
            </el-col>
            <el-col :span="7">
              <el-switch
                style="float: left"
                v-model="showBlockSongsOnly"
                active-text="仅展示无法播放的歌曲"
                @change="filterHandlerChange($event)"
              />
            </el-col>
          </el-row>
        </el-col>
      </el-row>
      <el-row
        v-if="playlistDetail.id"
        justify="center"
        style="margin-bottom: 60px"
      >
        <el-scrollbar height="800px">
          <el-table
            ref="tableRef"
            :data="playlistDetail.songs"
            height="800"
            empty-text="开心！本歌单没有无法播放的歌~"
            :stripe="true"
            :key="tableKey"
          >
            <el-table-column type="index" width="50" />
            <el-table-column prop="songName" label="歌曲" width="300" />
            <el-table-column prop="artists[0]" label="歌手" width="100" />
            <el-table-column prop="album" label="专辑" width="200" />
            <el-table-column prop="duration" label="时长" width="100" />
            <el-table-column
              label="状态"
              width="100"
              :filters="[
                { text: '全部', value: 'all' },
                { text: '无法播放', value: 'blocked' },
                { text: '云盘歌曲', value: 'cloud' },
              ]"
              :filter-method="filterHandler"
              :filtered-value="tableFilterValues"
            >
              <template #default="scope">
                <i
                  v-if="scope.row.isBlocked"
                  class="bi bi-lock-fill"
                  style="font-size: 20px; color: gray"
                ></i>
                <i
                  v-else-if="scope.row.isCloud"
                  class="bi bi-cloud"
                  style="font-size: 20px"
                ></i>
                <i
                  v-else
                  class="bi bi-heart-fill"
                  style="color: red; font-size: 20px"
                ></i>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <div v-if="scope.row.isBlocked">
                  <el-tooltip content="搜索歌曲" placement="top">
                    <el-link
                      type="primary"
                      :underline="false"
                      @click="searchTheSong(scope.row.pageUrl)"
                    >
                      <i class="bi bi-search" style="font-size: 20px"></i>
                    </el-link>
                  </el-tooltip>

                  <el-tooltip content="尝试解锁歌曲" placement="top">
                    <el-link
                      type="primary"
                      :underline="false"
                      @click="unblockTheSong(scope.row.songId)"
                      style="margin-left: 15px"
                    >
                      <i class="bi bi-unlock-fill" style="font-size: 20px"></i>
                    </el-link>
                  </el-tooltip>
                </div>
                <div v-else-if="!scope.row.isBlocked">
                  <el-tooltip content="播放歌曲" placement="top">
                    <el-link
                      type="primary"
                      :underline="false"
                      @click="
                        playTheSongWithPlayUrl({
                          songId: scope.row.songId,
                          playUrl: scope.row.playUrl,
                          coverUrl: scope.row.cover,
                          songName: scope.row.songName,
                          pageUrl: scope.row.pageUrl,
                          artist: scope.row.artists[0],
                        })
                      "
                    >
                      <i class="bi bi-play-circle" style="font-size: 20px"></i>
                    </el-link>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-scrollbar>
      </el-row>
    </el-main>
  </el-container>
</template>

<style>
.el-overlay,
.el-overlay-dialog {
  height: calc(100% - 60px);
}
</style>

<style scoped>
.scrollbar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  margin: 10px;
  text-align: center;
  border-radius: 4px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
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
import { secondDurationToDisplayDuration, sourceCodeToName } from "../../utils";
import SearchResultTable from "../../components/SearchResultTable.vue";
import { startTaskListener } from "../../components/TaskNotification";
import { ref } from "vue";

export default {
  data: () => {
    return {
      searchTip: "",
      showSearchPage: false,
      tableKey: 1,
      showBlockSongsOnly: true,
      tableFilterValues: ["blocked"],
      playlists: [],
      playlistDetail: {},
      searchResult: [],
      suggestMatchSongId: "",
      lastSearch: "",
    };
  },
  components: {
    SearchResultTable,
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

    const playTheSongWithPlayUrl = (playOption) => {
      props.playTheSongWithPlayUrl(playOption);
    };

    const playTheSong = (metaInfo, playUrl, suggestMatchSongId) => {
      props.playTheSong(metaInfo, playUrl, suggestMatchSongId);
    };
    const abortTheSong = () => {
      props.abortTheSong();
    };

    return {
      playTheSongWithPlayUrl,
      playTheSong,
      abortTheSong,
      tableRef,
    };
  },
  async mounted() {
    console.log("mounted");
    const playlistRet = await getAllPlaylist();
    this.playlists = playlistRet.data.playlists;
  },
  methods: {
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
    async showPlaylistDetail(playlistId) {
      console.log(`click playlist ${playlistId}`);
      const detailRet = await getPlaylistDetail(playlistId);
      const playlists = detailRet.data.playlists;
      playlists.songs = playlists.songs.map((song) => {
        song.duration = secondDurationToDisplayDuration(song.duration);
        return song;
      });
      this.playlistDetail = playlists;
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
      this.showSearchPage = true;

      if (this.lastSearch === pageUrl) {
        return;
      }
      this.searchTip = "正在搜索...";
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
      this.searchTip = "";
      this.lastSearch = pageUrl;
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
