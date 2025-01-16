<template>
  <div style="margin-top: 20px">
    <van-row justify="space-between" v-if="searchResult.length !== 0">
      <van-col span="24">
        <van-search
          v-model="keyword"
          shape="round"
          show-action
          @search="onSearch"
          placeholder="网页链接 / 歌名"
          input-align="center"
        >
          <template #action>
            <div @click="onSearch">搜索</div>
          </template>
        </van-search>
      </van-col>
    </van-row>
    <van-loading
      v-show="searchResult.length !== 0 && isSearching"
      type="spinner"
    />
    <div v-if="searchResult.length === 0">
      <van-row style="margin-top: 150px">
        <van-col span="24">
          <van-search
            v-model="keyword"
            shape="round"
            @search="onSearch"
            placeholder="网页链接 / 歌名"
            input-align="center"
          >
          </van-search>
        </van-col>
      </van-row>
      <van-row style="margin-top: 19px">
        <van-col span="24">
          <van-button
            round
            color="#07c160"
            icon="search"
            type="primary"
            @click="onSearch"
            :loading="isSearching"
            loading-text="搜索中"
            style="height: 32px"
          >
            搜 索
          </van-button>
        </van-col>
      </van-row>
    </div>

    <!-- 精准搜索卡片 -->
    <van-row
      v-if="songMetaInfo !== null"
      style="padding: 0 8px"
      @click="playTheSong(songMetaInfo)"
    >
      <van-col span="6">
        <img
          :src="songMetaInfo.coverUrl"
          onerror="this.src='https://cdnmusic.migu.cn/v3/static/img/common/default/img_default_240x240.jpg'"
          style="width: 100%; height: 100%"
        />
      </van-col>
      <van-col span="18">
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
              margin-top: 10px;
              padding-left: 18px;
            "
          >
            <van-row style="font-size: 14px; text-align: left">
              {{ ellipsis(songMetaInfo.songName, 16) }}
            </van-row>

            <van-row>
              <van-col>
                <van-row
                  style="margin-top: 6px; font-size: 10px; text-align: left"
                >
                  {{ songMetaInfo.artist }} 《{{ songMetaInfo.album }}》
                </van-row>
                <van-row
                  style="margin-top: 6px; font-size: 10px; text-align: left"
                >
                  时长： {{ songMetaInfo.duration }}
                </van-row>
              </van-col>
            </van-row>
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
      </van-col>
    </van-row>

    <van-row style="margin-top: 10px">
      <SearchResultList
        :playTheSong="playTheSong"
        :suggestMatchSongId="suggestMatchSongId"
        :searchResult="searchResult"
      >
      </SearchResultList>
    </van-row>
  </div>
</template>

<script>
import { searchSongs, getSongsMeta, createSyncSongFromUrlJob } from "../../api";
import SearchResultList from "../../components/SearchResultListForMobile.vue";
import {
  secondDurationToDisplayDuration,
  sourceCodeToName,
  ellipsis,
} from "../../utils";
import { startTaskListener } from "../../components/TaskNotification";
import storage from "../../utils/storage";
import { getProperPlayUrl } from "../../utils/audio";

export default {
  data: () => {
    return {
      suggestMatchSongId: "",
      songMetaInfo: null,
      // songMetaInfo: {
      //   songName: "搁浅",
      //   artist: "单依纯",
      //   album: "专辑",
      //   duration: "03:06",
      //   coverUrl:
      //     "http://d.musicapp.migu.cn/prod/file-service/file-down/8121e8df41a5c12f48b69aea89b71dab/ba75041e9311e62d10b6fc32d11d84aa/1c51d605f00caeb4643414c6eb3f5fbe",
      //   url: "https://www.kuwo.cn/play_detail/157612752",
      //   resourceForbidden: false,
      //   source: "kuwo",
      //   fromMusicPlatform: true,
      //   score: 173.50300000000001,
      //   sourceName: "酷我音乐",
      // },
      playUrl: "",
      keyword: "",
      searchTip: "",
      isSearching: false,
      searchResult: [],
      // searchResult: [
      //   {
      //     songName: "搁浅(中国新歌声)",
      //     artist: "羽田",
      //     album: "《中国新歌声第十一期》",
      //     duration: " - ",
      //     url: "https://music.migu.cn/v3/music/song/6404689Z0BD",
      //     resourceForbidden: false,
      //     source: "migu",
      //     fromMusicPlatform: true,
      //     score: 651.854,
      //     sourceName: "咪咕音乐",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "周杰伦",
      //     album: "《七里香》",
      //     duration: " - ",
      //     url: "https://music.migu.cn/v3/music/song/60054701938",
      //     resourceForbidden: false,
      //     source: "migu",
      //     fromMusicPlatform: true,
      //     score: 640.803,
      //     sourceName: "咪咕音乐",
      //   },
      //   {
      //     songName: "搁浅 (Live)",
      //     artist: "杨丞琳",
      //     album: "《蒙面唱将猜猜猜第五期》",
      //     duration: " - ",
      //     url: "https://music.migu.cn/v3/music/song/64046801877",
      //     resourceForbidden: false,
      //     source: "migu",
      //     fromMusicPlatform: true,
      //     score: 583.073,
      //     sourceName: "咪咕音乐",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "刘大壮",
      //     album: " - ",
      //     duration: "00:14",
      //     url: "https://www.kuwo.cn/play_detail/97836012",
      //     resourceForbidden: false,
      //     source: "kuwo",
      //     fromMusicPlatform: true,
      //     score: 173.50300000000001,
      //     sourceName: "酷我音乐",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "周杰伦",
      //     album: " - ",
      //     duration: "03:38",
      //     url: "https://www.kuwo.cn/play_detail/171708289",
      //     resourceForbidden: false,
      //     source: "kuwo",
      //     fromMusicPlatform: true,
      //     score: 173.50300000000001,
      //     sourceName: "酷我音乐",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "单依纯",
      //     album: " - ",
      //     duration: "03:06",
      //     url: "https://www.kuwo.cn/play_detail/157612752",
      //     resourceForbidden: false,
      //     source: "kuwo",
      //     fromMusicPlatform: true,
      //     score: 173.50300000000001,
      //     sourceName: "酷我音乐",
      //   },
      //   {
      //     songName: "【1080P修复版】周杰伦 - 搁浅MV",
      //     artist: "zyl2012",
      //     album: " - ",
      //     duration: "04:25",
      //     url: "https://www.bilibili.com/video/BV1M4411P7gM",
      //     resourceForbidden: false,
      //     source: "bilibili",
      //     fromMusicPlatform: false,
      //     score: 145.13400000000001,
      //     sourceName: "Bilibili",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "张杰",
      //     album: "《搁浅》",
      //     duration: "04:34",
      //     url: "https://music.163.com/#/song?id=190964",
      //     resourceForbidden: false,
      //     source: "netease",
      //     fromMusicPlatform: true,
      //     score: 70.99400000000001,
      //     sourceName: "网易云音乐",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "文太Vent.T",
      //     album: "《Losing Boat》",
      //     duration: "04:03",
      //     url: "https://music.163.com/#/song?id=523239317",
      //     resourceForbidden: false,
      //     source: "netease",
      //     fromMusicPlatform: true,
      //     score: 57.970000000000006,
      //     sourceName: "网易云音乐",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "周杰伦",
      //     album: "《七里香》",
      //     duration: "04:00",
      //     url: "https://www.kugou.com/song/#hash=fbc234520fed713c30c1c026e7352770&album_id=971783",
      //     resourceForbidden: true,
      //     source: "kugou",
      //     fromMusicPlatform: true,
      //     score: 23.092,
      //     sourceName: "酷狗音乐",
      //   },
      //   {
      //     songName: "搁浅",
      //     artist: "周杰伦",
      //     album: "《七里香》",
      //     duration: "04:00",
      //     url: "https://y.qq.com/n/ryqq/songDetail/001Bbywq2gicae",
      //     resourceForbidden: true,
      //     source: "qq",
      //     fromMusicPlatform: true,
      //     score: 23.092,
      //     sourceName: "QQ音乐",
      //   },
      //   {
      //     songName: "周姐查房Npc点播翻唱《搁浅》 被惊艳到赞不绝口",
      //     artist: "周姐日常事",
      //     album: " - ",
      //     duration: "04:41",
      //     url: "https://www.bilibili.com/video/BV1uq4y157Fb",
      //     resourceForbidden: false,
      //     source: "bilibili",
      //     fromMusicPlatform: false,
      //     score: 12.318,
      //     sourceName: "Bilibili",
      //   },
      //   {
      //     songName:
      //       "4K60P丨《搁浅》有多难唱？听听未修音的周董唱得怎么样！周杰伦.2004无与伦比演唱会",
      //     artist: "诶呦葛格",
      //     album: " - ",
      //     duration: "04:24",
      //     url: "https://www.bilibili.com/video/BV1KA411H78W",
      //     resourceForbidden: false,
      //     source: "bilibili",
      //     fromMusicPlatform: false,
      //     score: 11.714,
      //     sourceName: "Bilibili",
      //   },
      //   {
      //     songName:
      //       '"明明看透了还深陷其中，真的很可怜"#周杰伦 《#搁浅 》#无损音乐 #周杰伦音乐 #音乐推荐 #jay #七里香周杰伦 ',
      //     artist: "周杰伦F.M首播",
      //     album: " - ",
      //     duration: "03:55",
      //     url: "https://www.douyin.com/video/7082032090337922334",
      //     resourceForbidden: false,
      //     source: "douyin",
      //     fromMusicPlatform: false,
      //     score: 11.238,
      //     sourceName: "抖音",
      //   },
      //   {
      //     songName: "搁浅 (Live)",
      //     artist: "杨丞琳",
      //     album: "《蒙面唱将猜猜猜 第五期》",
      //     duration: "03:51",
      //     url: "https://www.kugou.com/song/#hash=b0f400f85edea59951dbedff35d6fbb9&album_id=1796966",
      //     resourceForbidden: false,
      //     source: "kugou",
      //     fromMusicPlatform: true,
      //     score: 4.767,
      //     sourceName: "酷狗音乐",
      //   },
      //   {
      //     songName: "搁浅 (Live)",
      //     artist: "周杰伦",
      //     album: "《周杰伦 2004 无与伦比 演唱会 Live CD》",
      //     duration: "04:21",
      //     url: "https://y.qq.com/n/ryqq/songDetail/001d94K71ipdTB",
      //     resourceForbidden: false,
      //     source: "qq",
      //     fromMusicPlatform: true,
      //     score: 4.767,
      //     sourceName: "QQ音乐",
      //   },
      //   {
      //     songName: "搁浅 (Live)",
      //     artist: "杨丞琳",
      //     album: "《蒙面唱将猜猜猜 第5期》",
      //     duration: "03:51",
      //     url: "https://y.qq.com/n/ryqq/songDetail/001Gn3RQ0IDwEK",
      //     resourceForbidden: false,
      //     source: "qq",
      //     fromMusicPlatform: true,
      //     score: 4.767,
      //     sourceName: "QQ音乐",
      //   },
      //   {
      //     songName: "搁浅(抖音原版)",
      //     artist: "王梦露",
      //     album: "《爱恋之音》",
      //     duration: "02:14",
      //     url: "https://music.163.com/#/song?id=1831481912",
      //     resourceForbidden: false,
      //     source: "netease",
      //     fromMusicPlatform: true,
      //     score: 4.152,
      //     sourceName: "网易云音乐",
      //   },
      //   {
      //     songName: "搁浅 (Live)",
      //     artist: "曹杨",
      //     album: "《2020中国好声音 第7期》",
      //     duration: "03:50",
      //     url: "https://www.kugou.com/song/#hash=feeaa10cefb9b03d6a7d2a92d9db5b04&album_id=39445387",
      //     resourceForbidden: true,
      //     source: "kugou",
      //     fromMusicPlatform: true,
      //     score: -30.773999999999997,
      //     sourceName: "酷狗音乐",
      //   },
      // ],
      wyAccount: null,
    };
  },
  props: {
    playTheSong: {
      type: Function,
      required: true,
    },
  },
  mounted() {
    this.wyAccount = storage.get("wyAccount");
  },
  watch: {
    $route(to, from) {
      this.wyAccount = storage.get("wyAccount");
    },
  },
  setup(props, { emit }) {
    const playTheSong = (songMeta, pageUrl) => {
      props.playTheSong(songMeta, pageUrl);
    };
    return {
      playTheSong,
      ellipsis,
    };
  },
  components: {
    SearchResultList,
  },
  methods: {
    async uploadToCloud(pageUrl) {
      const ret = await createSyncSongFromUrlJob(pageUrl); // TODO: add songID
      console.log(ret);

      if (ret.data && ret.data.jobId) {
        startTaskListener(ret.data.jobId);
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
