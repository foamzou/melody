<template>
  <el-container class="account-container">
    <el-main>
      <!-- Melody Key 设置部分 -->
      <el-row v-if="!registedMK" class="mk-setup">
        <el-col :span="16" :offset="4">
          <el-card class="mk-card" shadow="hover">
            <div class="welcome-text">
              <h2>欢迎使用 Melody</h2>
              <p class="subtitle">填写你的 Melody Key 开启音乐之旅</p>
            </div>
            <el-row class="input-row">
              <el-col :span="16" :offset="4">
                <el-input
                  v-model="mk"
                  placeholder="Key 默认为 melody , 如果你部署到公网，请到配置里修改该默认值（后续支持 UI 管理账号）"
                  size="large"
                  :prefix-icon="Key"
                >
                </el-input>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="16" :offset="4" class="btn-wrapper">
                <el-button type="primary" @click="checkMK" size="large" round>
                  <el-icon class="icon"><Check /></el-icon>确认
                </el-button>
              </el-col>
            </el-row>
          </el-card>
        </el-col>
      </el-row>

      <!-- 账号信息展示部分 -->
      <el-row v-if="account.uid" class="account-info">
        <el-col :span="16" :offset="4">
          <!-- Melody Key 信息卡片 -->
          <el-card class="info-card" shadow="hover">
            <div class="mk-info">
              <div class="mk-text">
                <el-icon><Key /></el-icon>
                <span>你的 Melody Key: </span>
                <code>{{ account.uid }}</code>
              </div>
              <el-button
                type="danger"
                plain
                size="small"
                @click="logoutMK"
                class="logout-btn"
              >
                退出 Melody 账号
              </el-button>
            </div>
          </el-card>

          <!-- 网易云账号卡片 -->
          <el-card class="info-card wy-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>网易云账号信息</span>
              </div>
            </template>

            <div class="wy-account-info">
              <div class="avatar-section">
                <el-image
                  :src="account.wyAccount?.avatarUrl"
                  class="avatar"
                  fit="cover"
                >
                  <template #error>
                    <div class="avatar-placeholder">
                      <el-icon><UserFilled /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="account-status">
                  <template v-if="account.wyAccount">
                    <span class="nickname">{{
                      account.wyAccount.nickname
                    }}</span>
                    <el-tag size="small" type="success">已绑定</el-tag>
                  </template>
                  <template v-else>
                    <span class="bind-tip">请先绑定正确的网易云账号</span>
                  </template>
                </div>
              </div>

              <!-- 登录方式选择 -->
              <div class="login-section">
                <el-radio-group v-model="account.loginType" class="login-type">
                  <el-radio-button label="qrcode">扫码登录</el-radio-button>
                  <el-radio-button label="phone">手机号登录</el-radio-button>
                  <el-radio-button label="email">邮箱登录</el-radio-button>
                </el-radio-group>

                <!-- 登录表单 -->
                <div
                  class="login-form"
                  v-if="['phone', 'email'].includes(account.loginType)"
                >
                  <el-form label-position="top">
                    <el-form-item
                      v-if="account.loginType == 'phone'"
                      label="国际电话区号"
                    >
                      <el-input
                        v-model="account.countryCode"
                        placeholder="默认86，不需要输入 +"
                        maxlength="4"
                      ></el-input>
                    </el-form-item>
                    <el-form-item
                      :label="account.loginType == 'phone' ? '手机号' : '邮箱'"
                    >
                      <el-input v-model="account.account"></el-input>
                    </el-form-item>
                    <el-form-item label="密码">
                      <el-input
                        type="password"
                        v-model="account.password"
                        show-password
                      ></el-input>
                    </el-form-item>
                  </el-form>
                </div>

                <!-- 二维码登录 -->
                <div v-if="account.loginType === 'qrcode'" class="qr-section">
                  <div class="qr-wrapper">
                    <el-image :src="qrLogin.qrCode" class="qr-code">
                      <template #error>
                        <div class="qr-error">
                          <p>
                            {{
                              !account.wyAccount
                                ? "二维码已失效，请点击刷新"
                                : "如需切换绑定的账号,点击按钮刷新二维码"
                            }}
                          </p>
                        </div>
                      </template>
                    </el-image>
                    <el-button
                      class="refresh-btn"
                      circle
                      type="primary"
                      @click="refreshQRCode"
                    >
                      <el-icon><Refresh /></el-icon>
                    </el-button>
                  </div>
                  <p class="qr-tip">请使用网易云音乐 app 扫码登录</p>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 昵称设置 -->
          <el-card class="info-card name-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>昵称</span>
              </div>
            </template>
            <el-input
              v-model="account.name"
              placeholder="请输入昵称"
            ></el-input>
          </el-card>

          <!-- 同步设置卡片 -->
          <el-card class="info-card sync-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>备份歌单的歌曲到网易云云盘</span>
                <el-tooltip placement="top">
                  <template #content>
                    <p>
                      1. 开启自动同步后，Melody
                      会按照指定频率自动将你的歌单里的所有歌曲同步到网易云云盘
                    </p>
                    <p>
                      2.
                      当频率为小时时，将在整点执行，如每8小时则在0点、8点、16点执行
                    </p>
                    <p>3. 当频率为天时，将在每天0点执行</p>
                  </template>
                  <el-icon><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>

            <div class="sync-settings">
              <el-form label-position="left" label-width="120px">
                <el-form-item label="自动同步">
                  <el-switch
                    v-model="
                      account.config.playlistSyncToWyCloudDisk.autoSync.enable
                    "
                  />
                </el-form-item>

                <el-form-item
                  label="同步频率"
                  v-if="
                    account.config.playlistSyncToWyCloudDisk.autoSync.enable
                  "
                >
                  <div class="frequency-input">
                    <span>每</span>
                    <el-input-number
                      v-model="
                        account.config.playlistSyncToWyCloudDisk.autoSync
                          .frequency
                      "
                      :min="1"
                      :max="30"
                      controls-position="right"
                    />
                    <el-radio-group
                      v-model="
                        account.config.playlistSyncToWyCloudDisk.autoSync
                          .frequencyUnit
                      "
                    >
                      <el-radio-button label="hour">小时</el-radio-button>
                      <el-radio-button label="day">天</el-radio-button>
                    </el-radio-group>
                  </div>
                </el-form-item>

                <el-form-item label="音质偏好">
                  <el-radio-group
                    v-model="
                      account.config.playlistSyncToWyCloudDisk
                        .soundQualityPreference
                    "
                  >
                    <el-radio-button label="high">高质量</el-radio-button>
                    <el-radio-button label="lossless">无损</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="同步选项">
                  <div class="sync-options">
                    <el-checkbox
                      v-model="
                        account.config.playlistSyncToWyCloudDisk.autoSync.onlyCreatedPlaylists
                      "
                    >
                      仅同步我创建的歌单
                      <el-tag size="small" type="success">推荐</el-tag>
                    </el-checkbox>
                    <el-checkbox
                      v-model="
                        account.config.playlistSyncToWyCloudDisk.syncWySong
                      "
                    >
                      上传网易云已有歌曲到云盘
                      <el-tag size="small" type="success">推荐</el-tag>
                    </el-checkbox>
                    <el-checkbox
                      v-model="
                        account.config.playlistSyncToWyCloudDisk.syncNotWySong
                      "
                    >
                      解锁灰色歌曲
                      <el-tag size="small" type="warning"
                        >不推荐自动同步</el-tag
                      >
                    </el-checkbox>
                  </div>
                </el-form-item>

                <el-card
                  class="info-card"
                  shadow="hover"
                  v-if="
                    account.config.playlistSyncToWyCloudDisk.autoSync.enable
                  "
                >
                  <template #header>
                    <div class="card-header">
                      <el-icon><Timer /></el-icon>
                      <span class="header-text">下次同步时间</span>
                    </div>
                  </template>

                  <div
                    v-if="nextCloudRun && nextCloudRun[account.uid]"
                    class="next-run-content"
                  >
                    <el-row :gutter="20" justify="center" align="middle">
                      <el-col :span="12" class="next-run-item">
                        <div class="label">下次同步时间</div>
                        <div class="value">
                          {{
                            new Date(
                              nextCloudRun[account.uid].nextRunTime
                            ).toLocaleString()
                          }}
                        </div>
                      </el-col>
                      <el-col :span="12" class="next-run-item">
                        <div class="label">距离下次同步</div>
                        <div class="value">
                          {{
                            Math.round(
                              nextCloudRun[account.uid].remainingMs / 1000 / 60
                            )
                          }}
                          分钟
                        </div>
                      </el-col>
                    </el-row>
                  </div>
                  <div v-else class="next-run-content">
                    <el-empty description="暂无调度信息" :image-size="60" />
                  </div>
                </el-card>
              </el-form>
            </div>
          </el-card>

          <!-- 更新按钮 -->
          <div class="update-btn-wrapper">
            <el-button type="primary" @click="updateAccount" size="large" round>
              <el-icon><Check /></el-icon>更新配置
            </el-button>
          </div>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<style scoped>
.account-container {
  padding: 20px;
}

/* Melody Key 设置样式 */
.mk-setup {
  margin-top: 60px;
}

.mk-card {
  padding: 40px 20px;
}

.welcome-text {
  text-align: center;
  margin-bottom: 30px;
}

.welcome-text h2 {
  color: #303133;
  margin-bottom: 10px;
}

.subtitle {
  color: #909399;
  font-size: 14px;
}

.input-row {
  margin-bottom: 20px;
}

.btn-wrapper {
  text-align: center;
}

/* 账号信息卡片通用样式 */
.info-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.info-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.card-header .el-icon {
  margin-left: 8px;
  color: #909399;
  cursor: pointer;
}

/* Melody Key 信息样式 */
.mk-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
}

.mk-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mk-text code {
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
}

/* 网易云账号样式 */
.wy-account-info {
  padding: 20px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #ebeef5;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: #dcdfe6;
}

.account-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nickname {
  font-size: 18px;
  font-weight: 500;
}

.bind-tip {
  color: #909399;
}

/* 登录部分样式 */
.login-section {
  margin-top: 20px;
}

.login-type {
  margin-bottom: 20px;
}

.login-form {
  max-width: 400px;
  margin: 0 auto;
}

/* 二维码部分样式 */
.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.qr-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
}

.qr-code {
  width: 100%;
  height: 100%;
}

.qr-error {
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 14px;
}

.refresh-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s;
}

.qr-wrapper:hover .refresh-btn {
  opacity: 1;
}

.qr-tip {
  color: #909399;
  font-size: 14px;
}

/* 同步设置样式 */
.sync-settings {
  padding: 20px;
}

.frequency-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sync-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 更新按钮容器 */
.update-btn-wrapper {
  text-align: center;
  margin: 40px 0;
}

:deep(.el-form-item__label) {
  font-weight: 500;
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

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-text {
  font-size: 14px;
  font-weight: 500;
}

:deep(.el-empty) {
  padding: 20px 0;
}

:deep(.el-card__header) {
  padding: 15px 20px;
}
</style>

<script>
import {
  Key,
  Check,
  Refresh,
  UserFilled,
  QuestionFilled,
  Timer,
} from "@element-plus/icons-vue";
import { getAccount, setAccount, qrLoginCreate, qrLoginCheck } from "../../api";
import storage from "../../utils/storage";
import { ElMessage } from "element-plus";
import { getNextRunInfo } from "../../api";

export default {
  components: {
    Key,
    Check,
    Refresh,
    UserFilled,
    QuestionFilled,
    Timer,
  },
  data: () => {
    return {
      mk: "",
      account: {
        loginType: "",
        account: 0,
        password: "",
        platform: "wy",
        uid: "",
        countryCode: "",
        config: {
          playlistSyncToWyCloudDisk: {
            autoSync: {
              enable: false,
              frequency: 1,
              frequencyUnit: "day",
              onlyCreatedPlaylists: true,
            },
            syncWySong: true,
            syncNotWySong: false,
            soundQualityPreference: "high",
          },
        },
        name: "",
      },
      registedMK: false,
      qrLogin: {
        qrCode: "",
        qrKey: "",
      },
      nextCloudRun: null,
    };
  },
  async mounted() {
    this.registedMK = storage.get("mk") ? true : false;
    if (!this.registedMK) {
      return;
    }
    console.log(this.registedMK);
    const ret = await getAccount();
    if (ret === false || !ret.data) {
      this.registedMK = false;
      return;
    }
    this.account = ret.data.account;
    storage.set("wyAccount", ret.data.account.wyAccount);
    console.log(this.account);
    this.loadNextRunInfo();
  },
  methods: {
    async refreshQRCode() {
      const ret = await qrLoginCreate();
      if (ret === false || ret.status != 0) {
        ElMessage({
          center: true,
          type: "error",
          message: "生成登录二维码失败",
        });
        return false;
      }
      this.qrLogin.qrKey = ret.data.qrKey;
      this.qrLogin.qrCode = ret.data.qrCode;

      // loop check qr code
      if (this.qrLogin.qrKey) {
        console.log("start check qr code");
        const IntervalID = setInterval(async () => {
          if (!this.qrLogin.qrKey) {
            console.log("stop check qr code");
            clearInterval(IntervalID);
            return;
          }
          if (await this.checkQRCode()) {
            this.qrLogin.qrKey = "";
            this.qrLogin.qrCode = "";
            clearInterval(IntervalID);
          }
        }, 1000);
      }
    },
    async checkQRCode() {
      if (!this.qrLogin.qrKey) {
        return false;
      }
      const ret = await qrLoginCheck(this.qrLogin.qrKey);
      if (ret === false || ret.status != 0 || !ret.data.wyQrStatus) {
        console.log("checkQRCode failed");
        return false;
      }
      // 800 为二维码过期; 801 为等待扫码; 802 为待认; 803 为授权登录成功
      console.log(`checkQRCode wyStatus: ${ret.data.wyQrStatus}`);
      if (ret.data.wyQrStatus == 800) {
        ElMessage({
          center: true,
          type: "error",
          message: "二维码已失效, 请手动刷新",
        });
        this.qrLogin.qrKey = "";
        this.qrLogin.qrCode = "";
        return false;
      }
      if (ret.data.wyQrStatus != 803) {
        return false;
      }
      this.account = ret.data.account;
      storage.set("wyAccount", ret.data.account.wyAccount);
      return true;
    },
    async checkMK() {
      this.mk = this.mk.trim();
      if (!this.mk) {
        return;
      }
      const ret = await getAccount({ mk: this.mk });
      if (ret !== false && ret.data) {
        this.account = ret.data.account;
        this.registedMK = true;
        storage.set("mk", this.mk);
        storage.set("wyAccount", ret.data.account.wyAccount);
        ElMessage({
          center: true,
          type: "success",
          message: "Melody Key 设置成功",
        });
      } else {
        ElMessage({
          center: true,
          type: "error",
          message: "Melody Key 不正确哦",
        });
      }
    },

    async updateAccount() {
      if (this.account.loginType !== "qrcode") {
        if (
          !this.account.account ||
          !this.account.password ||
          !this.account.loginType
        ) {
          return;
        }
      }

      if (this.account.loginType == "phone") {
        if (this.account.countryCode) {
          if (!/^[\d]{0,4}$/.test(this.account.countryCode)) {
            ElMessage({
              center: true,
              type: "error",
              message: "国际电话区号不正确",
            });
            return;
          }
        }
      }

      if (this.account.loginType == "email") {
        if (
          !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
            this.account.account
          )
        ) {
          ElMessage({
            center: true,
            type: "error",
            message: "邮箱格式不正确",
          });
          return;
        }
      }
      const ret = await setAccount({
        loginType: this.account.loginType,
        countryCode: this.account.countryCode,
        account: this.account.account,
        password: this.account.password,
        config: this.account.config,
        name: this.account.name,
      });
      if (ret.status != 0) {
        ElMessage({
          center: true,
          type: "error",
          message: ret.message,
        });
        return;
      }
      if (ret.data.account) {
        this.account = ret.data.account;

        storage.set("wyAccount", ret.data.account.wyAccount);
      }
      ElMessage({
        center: true,
        type: "success",
        message: "更新配置成功",
      });
    },

    logoutMK() {
      storage.del("mk");
      this.registedMK = false;
      this.mk = "";
      this.account = {};
    },

    async loadNextRunInfo() {
      const ret = await getNextRunInfo();
      if (ret.status === 0) {
        this.nextCloudRun = ret.data.cloudNextRuns;
      }
    },
  },
  watch: {
    "account.config.playlistSyncToWyCloudDisk.autoSync": {
      deep: true,
      handler() {
        this.loadNextRunInfo();
      },
    },
  },
};
</script>
