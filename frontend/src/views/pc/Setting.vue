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
          <h3>本地下载路径配置</h3>
          <div>
            下载路径格式。Mac/Linux: /path/to/... | Windows:
            C:\Users\YourUserName\Downloads
          </div>
          <div>
            请注意，如果本服务部署在 Docker 中，下载路径应当为 Docker
            容器内的路径。你需要将容器内的下载路径映射到宿主机的相应目录，这样下载的文件才能在宿主机上被访问。
          </div>
          <el-row>
            <el-col :span="18">
              <el-input v-model="downloadPath" placeholder="下载路径" />
            </el-col>
          </el-row>
        </el-col>
      </el-row>

      <!-- 勾选搜索站点 -->
      <el-row>
        <el-col :span="24">
          <h3>搜索站点配置</h3>
          <div>搜索耗时取决于最慢的网站，请尽量勾选你的服务所在网络能够访问的网站</div>
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
      checkedSources: [],
      supportedSources: [], //[{code: "bilibili", label: "哔哩哔哩"}]
    };
  },
  async mounted() {
    const globalConfig = await getGlobalConfig();
    if (globalConfig !== false && globalConfig.data) {
      this.downloadPath = globalConfig.data.downloadPath;
      this.supportedSources = Object.values(globalConfig.data.sourceConsts);
      this.checkedSources = globalConfig.data.sources;
      console.log(this.supportedSources);
      console.log(this.checkedSources);
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
      const ret = await setGlobalConfig({ 
        downloadPath: this.downloadPath,
        sources: this.checkedSources,

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
