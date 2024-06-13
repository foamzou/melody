<template>
  <el-container>
    <el-main>
      <!-- 组件更新 -->
      <el-row>
        <el-col :span="24">
          <h3>核心组件版本更新</h3>
          当前使用的 media-get 版本号:
          {{ mediaGetVersion }}. 最新的版本号:
          {{ latestVersion }}
          <el-button
            type="primary"
            :disabled="updating"
            @click="updateMediaGet"
          >
            <template v-if="!updating">更新 media-get</template>
            <template v-else>更新中</template>
          </el-button>
        </el-col>
      </el-row>

      <!-- 本地下载路径配置 -->
      <el-row justify="center">
        <el-col :span="16">
          <h3>本地下载配置</h3>
          <div></div>
          <div></div>
          <el-row>
            <el-col :span="5">
              <span>下载路径</span>
              <el-tooltip placement="top">
                <span slot="content">
                  <i class="bi bi-question-circle"></i>
                </span>
                <template #content>
                  <p>
                    1. 下载路径格式。Mac/Linux: /path/to/... | Windows:
                    C:\Users\YourUserName\Downloads.
                  </p>
                  <p>
                    2. 请注意，如果本服务部署在 Docker 中，下载路径应当为 Docker
                    容器内的路径。你需要将容器内的下载路径映射到宿主机的相应目录，这样下载的文件才能在宿主机上被访问。
                  </p>
                </template>
              </el-tooltip>
            </el-col>
            <el-col :span="15">
              <el-input v-model="downloadPath" placeholder="下载路径" />
            </el-col>
          </el-row>

          <el-row>
            <el-col :span="5">
              <span>单曲下载的文件名格式</span>
              <el-tooltip placement="top">
                <span slot="content">
                  <i class="bi bi-question-circle"></i>
                </span>
                <template #content>
                  <p>
                    1. 文件名格式支持的变量: {songName}, {artist}, {album}
                    (注意：当无法获取到对应的信息时，会用 Unknown 填充)。
                  </p>
                  <p>2. 不需要加文件扩展名</p>
                  <p>
                    3. 例如，当你设置为 {album}-{artist}-{songName}
                    时，文件将会被下载到
                    /你的下载路径/十一月的肖邦-周杰伦-一路向北.mp3
                  </p>
                  <p>
                    4. 甚至你可以包含 /(unix*) 或
                    \(win)来将文件存储在不同目录，例如当你设置为
                    {artist}/{album}/{songName} 时，文件将会被下载到
                    /你的下载路径/周杰伦/十一月的肖邦/一路向北.mp3
                  </p>
                </template>
              </el-tooltip>
            </el-col>
            <el-col :span="15">
              <el-input
                v-model="filenameFormat"
                placeholder="留空则默认为：{album}-{artist}-{songName}"
              />
            </el-col>
          </el-row>
        </el-col>
      </el-row>

      <!-- 歌单同步配置 -->
      <el-row justify="center">
        <el-col :span="16">
          <h3>歌单同步到本地</h3>
          <el-row>
            <el-col :span="5">
              <span>自动同步</span
              ><el-tooltip placement="top">
                <span slot="content">
                  <i class="bi bi-question-circle"></i>
                </span>
                <template #content>
                  <p>
                    1. 开启自动同步后， Melody
                    会自动将你的歌单里的所有歌曲下载到本地磁盘
                  </p>
                  <p>
                    2.
                    当频率为小时时，到达设定的时间间隔后，会在整点的时候进行同步
                  </p>
                  <p>3. 当频率为天时，会在当天的 0 点进行同步</p>
                </template>
              </el-tooltip>
              <el-switch
                v-model="playlistSyncToLocal.autoSync.enable"
              ></el-switch>
            </el-col>
            <el-col :span="10">
              <span style="margin-right: 10px">频率： 每</span>
              <el-input-number
                v-model="playlistSyncToLocal.autoSync.frequency"
                :min="1"
                :max="30"
                :style="{ width: '110px' }"
              />
              <span style="margin-left: 20px">
                <el-radio-group
                  v-model="playlistSyncToLocal.autoSync.frequencyUnit"
                >
                  <el-radio label="hour">小时</el-radio>
                  <el-radio label="day">天</el-radio>
                </el-radio-group>
              </span>
            </el-col>
          </el-row>
          <div>
            <el-checkbox v-model="playlistSyncToLocal.deleteLocalFile">
              当歌单里的歌曲移除时，同时删除本地对应的歌曲文件
            </el-checkbox>
          </div>
          <el-row>
            <el-col :span="5">
              <span>歌单歌曲的文件名格式</span>
              <el-tooltip placement="top">
                <span slot="content">
                  <i class="bi bi-question-circle"></i>
                </span>
                <template #content>
                  <p>
                    1. 文件名格式支持的变量: {playlistName}, {songName},
                    {artist}, {album} (注意：当无法获取到对应的信息时，会用
                    Unknown 填充)。
                  </p>
                  <p>2. 不需要加文件扩展名</p>
                  <p>
                    3. 例如，当你设置为
                    {playlistName}/{album}-{artist}-{songName}
                    时，文件将会被下载到
                    /你的下载路径/开车歌单/十一月的肖邦-周杰伦-一路向北.mp3
                  </p>
                </template>
              </el-tooltip>
            </el-col>
            <el-col :span="15">
              <el-input
                v-model="playlistSyncToLocal.filenameFormat"
                placeholder="留空则默认为：{playlistName}/{album}-{artist}-{songName}"
              />
            </el-col>
          </el-row>
        </el-col>
      </el-row>

      <!-- 勾选搜索站点 -->
      <el-row>
        <el-col :span="24">
          <h3>搜索站点配置</h3>
          <div>
            搜索耗时取决于最慢的网站，请尽量勾选你的服务所在网络能够访问的网站
          </div>
          <el-checkbox-group v-model="checkedSources">
            <el-checkbox
              v-for="s in supportedSources"
              :label="s.code"
              :key="s.code"
            >
              {{ s.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-col>
      </el-row>

      <el-row style="margin: 100px">
        <el-col :span="24">
          <el-button type="primary" @click="updateConfig"> 更新配置 </el-button>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
import {
  checkMediaFetcherLib,
  updateMediaFetcherLib,
  getGlobalConfig,
  setGlobalConfig,
} from "../../api";
import { ElMessage } from "element-plus";

export default {
  data: () => {
    return {
      mediaGetVersion: "查询中",
      latestVersion: "查询中",
      updating: false,
      downloadPath: "",
      filenameFormat: "",
      checkedSources: [],
      supportedSources: [], //[{code: "bilibili", label: "哔哩哔哩"}]
      playlistSyncToLocal: {
        autoSync: {
          enable: false,
          frequency: 1,
          frequencyUnit: "day",
        },
        deleteLocalFile: false,
        filenameFormat: "",
      },
    };
  },
  async mounted() {
    const globalConfig = await getGlobalConfig();
    if (globalConfig !== false && globalConfig.data) {
      this.downloadPath = globalConfig.data.downloadPath;
      this.filenameFormat = globalConfig.data.filenameFormat;
      this.playlistSyncToLocal = globalConfig.data.playlistSyncToLocal;
      this.supportedSources = Object.values(globalConfig.data.sourceConsts);
      this.checkedSources = globalConfig.data.sources;
    }
    this.checklib();
  },
  methods: {
    async checklib() {
      const ret = await checkMediaFetcherLib({ lib: "mediaGet" });
      if (ret !== false && ret.data) {
        this.mediaGetVersion = ret.data.mediaGetInfo.versionInfo;
        this.latestVersion = ret.data.latestVersion;
      }
    },
    async updateMediaGet() {
      if (this.mediaGetVersion === this.latestVersion) {
        ElMessage({
          center: true,
          type: "info",
          message: "已经是最新版本",
        });
        return false;
      }

      this.updating = true; // Disable the button and show "更新中" text

      const ret = await updateMediaFetcherLib(this.latestVersion);
      if (ret === false || ret.status != 0) {
        ElMessage({
          center: true,
          type: "error",
          message: "更新失败",
        });
        this.updating = false; // Enable the button again
        return false;
      }

      ElMessage({
        center: true,
        type: "success",
        message: "更新成功",
      });

      this.checklib();

      this.updating = false; // Enable the button again
    },

    async updateConfig() {
      if (
        (this.filenameFormat &&
          this.filenameFormat.indexOf("{songName}") === -1) ||
        (this.playlistSyncToLocal.filenameFormat &&
          this.playlistSyncToLocal.filenameFormat.indexOf("{songName}") === -1)
      ) {
        ElMessage({
          center: true,
          type: "error",
          message: "文件名格式必须包含 {songName}",
        });
        return false;
      }

      const ret = await setGlobalConfig({
        downloadPath: this.downloadPath,
        sources: this.checkedSources,
        filenameFormat: this.filenameFormat,
        playlistSyncToLocal: this.playlistSyncToLocal,
      });
      if (ret === false || ret.status != 0) {
        ElMessage({
          center: true,
          type: "error",
          message: "更新失败",
        });
        this.updating = false; // Enable the button again
        return false;
      }

      ElMessage({
        center: true,
        type: "success",
        message: "更新成功",
      });
    },
  },
};
</script>
