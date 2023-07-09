<template>
  <el-container>
    <el-main>
      <el-row>
        <el-col :span="24">
          <h2>配置页面</h2>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <h3>
            当前使用的 media-get 版本号: {{ mediaGetVersion }}. 最新的版本号:
            {{ latestVersion }}
          </h3>
          <el-button type="primary" :disabled="updating" @click="updateMediaGet">
            <template v-if="!updating">更新 media-get</template>
            <template v-else>更新中</template>
          </el-button>
        </el-col>
      </el-row>
      <!-- 其他配置模块 -->
    </el-main>
  </el-container>
</template>

<script>
import { checkMediaFetcherLib, updateMediaFetcherLib } from "../../api";
import { ElMessage } from "element-plus";

export default {
  data: () => {
    return {
      mediaGetVersion: "查询中",
      latestVersion: "查询中",
      updating: false,
    };
  },
  async mounted() {
    const ret = await checkMediaFetcherLib({ lib: "mediaGet" });
    if (ret !== false && ret.data) {
      this.mediaGetVersion = ret.data.mediaGetInfo.versionInfo;
      this.latestVersion = ret.data.latestVersion;
    }
  },
  methods: {
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

      this.updating = false; // Enable the button again
    },
  },
};
</script>