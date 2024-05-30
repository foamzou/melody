<template>
  <el-main style="margin: 0 auto">
    <el-row justify="center">
      <el-col :span="16">
        <el-row>
          <el-col :span="20">
            <div>
              <el-input
                v-model="keyword"
                placeholder="网页链接 / 歌名"
                clearable
                @keyup.enter.native="onSearch"
              />
            </div>
          </el-col>

          <el-col :span="4">
            <el-button type="primary" @click="onSearch"> 搜索 </el-button>
          </el-col>
        </el-row>
      </el-col>
    </el-row>

    <!-- 搜索提示 -->
    <el-row>
      <el-col :span="12" :offset="3">
        <div style="float: left; margin-top: 3px">
          <span style="font-size: 22px"> {{ searchTip }} </span>
          <span style="font-size: 22px" v-loading="isSearching"></span>
        </div>
      </el-col>
    </el-row>

    <!-- 精准搜索卡片 -->
    <el-row v-if="songMetaInfo !== null">
      <el-col :span="13" :offset="4">
        <el-card
          :body-style="{ padding: '0px' }"
          style="margin-top: 20px"
          shadow="always"
        >
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

    <el-row style="margin-top: 20px; margin-bottom: 60px">
      <SearchResultTable
        :playTheSong="playTheSong"
        :abortTheSong="abortTheSong"
        :suggestMatchSongId="suggestMatchSongId"
        :searchResult="searchResult"
      >
      </SearchResultTable>
    </el-row>
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
