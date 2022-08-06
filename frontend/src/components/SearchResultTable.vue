<template>
  <el-table :data="searchResult" :stripe="true">
    <el-table-column type="index" width="50" />
    <el-table-column label="歌曲" width="300">
      <template #default="scope">
        <el-tooltip
          v-if="scope.row.resourceForbidden"
          content="可能无法播放 / 试听版本"
          placement="top"
        >
          <i class="bi bi-lock-fill" style="font-size: 18px; color: gray"></i>
        </el-tooltip>
        {{ scope.row.songName }}
      </template>
    </el-table-column>
    <el-table-column prop="artist" label="歌手" width="100" />
    <el-table-column prop="album" label="专辑" width="200" />
    <el-table-column prop="duration" label="时长" width="100" />
    <el-table-column prop="sourceName" label="来源" width="120" />
    <el-table-column prop="url" label="操作" width="200">
      <template #default="scope">
        <el-tooltip content="停止播放" placement="top">
          <el-link
            v-if="scope.row.url == currentSongUrl"
            @click="abort()"
            :underline="false"
            type="primary"
          >
            <i class="bi bi-stop-circle" style="font-size: 20px"></i>
          </el-link>
        </el-tooltip>
        <el-tooltip content="播放歌曲" placement="top">
          <el-link
            v-if="scope.row.url != currentSongUrl"
            @click="play(null, scope.row.url)"
            :underline="false"
            :disabled="
              scope.row.url.indexOf('bilibili') >= 0 ||
              scope.row.url.indexOf('youtube') >= 0
            "
            type="primary"
          >
            <i class="bi bi-play-circle" style="font-size: 20px"></i>
          </el-link>
        </el-tooltip>

        <el-tooltip
          :content="
            wyAccount ? '上传歌曲到云盘' : '上传歌曲到云盘(请先绑定网易云账号)'
          "
          placement="top"
        >
          <el-link
            type="primary"
            @click="uploadToCloud(scope.row.url)"
            :disabled="wyAccount ? false : true"
            :underline="false"
            style="margin-left: 20px"
          >
            <i class="bi bi-cloud-upload" style="font-size: 20px"></i>
          </el-link>
        </el-tooltip>
        <el-tooltip content="在源站查看" placement="top">
          <a
            type="primary"
            :href="scope.row.url"
            target="_blank"
            style="margin-left: 20px"
          >
            <i class="bi bi-box-arrow-up-right" style="font-size: 20px"></i>
          </a>
        </el-tooltip>
      </template>
    </el-table-column>
  </el-table>
</template>

<script>
import { createSyncSongFromUrlJob } from "../api";
import { startTaskListener } from "../components/TaskNotification";
import storage from "../utils/storage";

export default {
  data() {
    return {
      currentSongUrl: -1,
      wyAccount: null,
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
    suggestMatchSongId: {
      type: String,
      required: false,
    },
    searchResult: {
      type: Array,
      required: true,
    },
  },
  mounted() {
    this.wyAccount = storage.get("wyAccount");
  },
  setup(props, { emit }) {
    const playTheSong = (songMeta, pageUrl, suggestMatchSongId) => {
      props.playTheSong(songMeta, pageUrl, suggestMatchSongId);
    };
    const abortTheSong = () => {
      props.abortTheSong();
    };
    return {
      playTheSong,
      abortTheSong,
    };
  },
  watch: {
    $route(to, from) {
      this.wyAccount = storage.get("wyAccount");
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
    play(songMeta, pageUrl) {
      this.currentSongUrl = pageUrl;
      this.playTheSong(songMeta, pageUrl, this.suggestMatchSongId);
    },
    abort() {
      this.currentSongUrl = -1;
      this.abortTheSong();
    },
  },
};
</script>
