<template>
  <el-container class="setting-container">
    <el-main>
      <!-- 组件更新 -->
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <span>核心组件版本更新</span>
          </div>
        </template>
        <el-row align="middle" class="version-info">
          <el-col :span="16">
            <span class="label">当前使用的 media-get 版本号:</span>
            <span class="version">{{ mediaGetVersion }}</span>
            <span class="label">最新的版本号:</span>
            <span class="version">{{ latestVersion }}</span>
          </el-col>
          <el-col :span="8" style="text-align: right">
            <el-button
              type="primary"
              :disabled="updating"
              @click="updateMediaGet"
              class="update-btn"
            >
              <template v-if="!updating">更新 media-get</template>
              <template v-else>更新中</template>
            </el-button>
          </el-col>
        </el-row>
      </el-card>

      <!-- 本地下载配置 -->
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <span>本地下载配置</span>
          </div>
        </template>

        <el-form label-position="right" label-width="180px">
          <el-form-item label="下载路径">
            <el-col :span="16">
              <el-input v-model="downloadPath" placeholder="下载路径">
                <template #append>
                  <el-tooltip placement="top">
                    <template #content>
                      <p>
                        1. 下载路径格式。Mac/Linux: /path/to/... | Windows:
                        C:\Users\YourUserName\Downloads
                      </p>
                      <p>
                        2. 请注意，如果本服务部署在 Docker 中，下载路径应当为
                        Docker
                        容器内的路径。你需要将容器内的下载路径映射到宿主机的相应目录。
                      </p>
                    </template>
                    <i class="bi bi-question-circle"></i>
                  </el-tooltip>
                </template>
              </el-input>
            </el-col>
          </el-form-item>

          <el-form-item label="单曲下载的文件名格式">
            <el-col :span="16">
              <el-input
                v-model="filenameFormat"
                placeholder="留空则默认为：{songName}-{artist}"
              >
                <template #append>
                  <el-tooltip placement="top">
                    <template #content>
                      <p>支持的变量: {songName}, {artist}, {album}</p>
                      <p>示例: {album}-{artist}-{songName}</p>
                      <p>支持目录结构: {artist}/{album}/{songName}</p>
                    </template>
                    <i class="bi bi-question-circle"></i>
                  </el-tooltip>
                </template>
              </el-input>
            </el-col>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 歌单同步配置 -->
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <span>歌单同步到本地</span>
            <el-tooltip placement="top">
              <template #content>
                <p>1. 开启自动同步后，Melody 会按照指定频率自动将你的歌单里的所有歌曲下载到本地</p>
                <p>2. 当频率为小时时，将在整点执行，如每8小时则在0点、8点、16点执行</p>
                <p>3. 当频率为天时，将在每天0点执行</p>
              </template>
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>

        <el-form label-position="right" label-width="180px">
          <el-form-item label="自动同步">
            <el-col :span="4">
              <el-switch
                v-model="playlistSyncToLocal.autoSync.enable"
              ></el-switch>
            </el-col>
            <el-col :span="20" v-if="playlistSyncToLocal.autoSync.enable">
              <span>每</span>
              <el-input-number
                v-model="playlistSyncToLocal.autoSync.frequency"
                :min="1"
                :max="30"
                controls-position="right"
                style="width: 120px; margin: 0 10px"
              />
              <el-radio-group
                v-model="playlistSyncToLocal.autoSync.frequencyUnit"
              >
                <el-radio-button label="hour">小时</el-radio-button>
                <el-radio-button label="day">天</el-radio-button>
              </el-radio-group>
            </el-col>
          </el-form-item>

          <el-form-item>
            <el-checkbox v-model="playlistSyncToLocal.deleteLocalFile">
              当歌单里的歌曲移除时，同时删除本地对应的歌曲文件
            </el-checkbox>
          </el-form-item>

          <el-form-item label="歌单歌曲的文件名格式">
            <el-col :span="16">
              <el-input
                v-model="playlistSyncToLocal.filenameFormat"
                placeholder="留空则默认为：{playlistName}/{songName}-{artist}"
              >
                <template #append>
                  <el-tooltip placement="top">
                    <template #content>
                      <p>
                        支持的变量: {playlistName}, {songName}, {artist},
                        {album}
                      </p>
                      <p>示例: {playlistName}/{album}-{artist}-{songName}</p>
                    </template>
                    <i class="bi bi-question-circle"></i>
                  </el-tooltip>
                </template>
              </el-input>
            </el-col>
          </el-form-item>

          <!-- 添加音质选择配置 -->
          <el-form-item label="音质偏好">
            <el-radio-group
              v-model="playlistSyncToLocal.soundQualityPreference"
            >
              <el-radio-button label="high">高质量</el-radio-button>
              <el-radio-button label="lossless">无损</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item
            label="同步账号"
            v-if="playlistSyncToLocal.autoSync.enable"
          >
            <el-checkbox-group v-model="playlistSyncToLocal.syncAccounts">
              <el-checkbox
                v-for="account in accounts"
                :key="account.uid"
                :label="account.uid"
              >
                {{ account.name || account.uid }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>

        <!-- 移动到这里，作为表单的补充信息 -->
        <div v-if="playlistSyncToLocal.autoSync.enable" class="next-run-info">
          <el-divider>
            <el-icon><Timer /></el-icon>
            <span class="divider-text">下次同步时间</span>
          </el-divider>

          <div v-if="nextLocalRun" class="next-run-content">
            <el-row :gutter="20" justify="center" align="middle">
              <el-col :span="12" class="next-run-item">
                <div class="label">下次同步时间</div>
                <div class="value">
                  {{ new Date(nextLocalRun.nextRunTime).toLocaleString() }}
                </div>
              </el-col>
              <el-col :span="12" class="next-run-item">
                <div class="label">距离下次同步</div>
                <div class="value">
                  {{ Math.round(nextLocalRun.remainingMs / 1000 / 60) }} 分钟
                </div>
              </el-col>
            </el-row>
          </div>
          <div v-else class="next-run-content">
            <el-empty description="暂无调度信息" :image-size="60" />
          </div>
        </div>
      </el-card>

      <!-- 搜索站点配置 -->
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <span>搜索站点配置</span>
          </div>
        </template>

        <div class="source-tip">
          搜索耗时取决于最慢的网站，请尽量勾选你的服务所在网络能够访问的网站
        </div>
        <el-checkbox-group v-model="checkedSources" class="source-list">
          <el-checkbox
            v-for="s in supportedSources"
            :key="s.code"
            :label="s.code"
          >
            {{ s.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-card>

      <div class="submit-container">
        <el-button type="primary" @click="updateConfig" size="large">
          保存设置
        </el-button>
      </div>
    </el-main>
  </el-container>
</template>

<style scoped>
.setting-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.setting-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.setting-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
}

.version-info {
  line-height: 32px;
}

.version-info .label {
  color: #606266;
  margin-right: 8px;
}

.version-info .version {
  font-weight: 500;
  margin-right: 20px;
}

.update-btn {
  min-width: 120px;
}

.source-tip {
  color: #909399;
  margin-bottom: 15px;
}

.source-list {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.submit-container {
  text-align: center;
  margin: 40px 0;
  padding: 20px 0;
  border-top: 1px solid #ebeef5;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input-group__append) {
  padding: 0 10px;
  cursor: pointer;
}

:deep(.el-card__header) {
  border-bottom: 2px solid #f0f2f5;
  padding: 15px 20px;
}

.next-run-info {
  margin-top: 30px;
  padding: 0 20px;
}

.divider-text {
  margin-left: 8px;
  font-size: 14px;
  color: #909399;
}

.next-run-content {
  padding: 20px 0;
}

.next-run-item {
  text-align: center;
}

.next-run-item .label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.next-run-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

:deep(.el-divider__text) {
  display: flex;
  align-items: center;
  background-color: #fff;
}

:deep(.el-empty) {
  padding: 20px 0;
}
</style>

<script>
import {
  checkMediaFetcherLib,
  updateMediaFetcherLib,
  getGlobalConfig,
  setGlobalConfig,
  getAllAccounts,
  getNextRunInfo,
} from "../../api";
import { ElMessage } from "element-plus";
import { Timer } from "@element-plus/icons-vue";

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
        soundQualityPreference: "high",
        syncAccounts: [],
      },
      accounts: [],
      nextLocalRun: null,
    };
  },
  components: {
    Timer,
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
    this.loadNextRunInfo();
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
    async loadNextRunInfo() {
      const ret = await getNextRunInfo();
      if (ret.status === 0) {
        this.nextLocalRun = ret.data.localNextRun;
      }
    },
  },
  async created() {
    // 获取所有账号信息
    const response = await getAllAccounts();
    if (response.data) {
      this.accounts = Object.entries(response.data).map(([uid, account]) => ({
        uid,
        name: account.name || uid,
      }));
    }
  },
  watch: {
    "playlistSyncToLocal.autoSync": {
      deep: true,
      handler() {
        this.loadNextRunInfo();
      },
    },
  },
};
</script>
