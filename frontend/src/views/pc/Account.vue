<template>
  <el-container>
    <el-main>
      <el-row v-if="!registedMK">
        <el-col style="margin-top: 100px">
          <h2 style="text-align: center">
            填写你的 Melody Key 就可以开始使用啦
          </h2>
          <el-row>
            <el-col :span="8" :offset="8">
              <el-input v-model="mk" placeholder="32位长度的字符串"></el-input>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="8" :offset="8" style="margin-top: 20px">
              <el-button type="primary" @click="checkMK"> 确认 </el-button>
            </el-col>
          </el-row>
        </el-col>
      </el-row>
      <el-row v-if="account.uid">
        <el-col>
          <el-row style="text-align: center">
            <el-col :span="8" :offset="14">
              你的 Melody Key: {{ account.uid }}
            </el-col>
            <el-col :span="2">
              <el-link type="primary" @click="logoutMK">退出该账号</el-link>
            </el-col>
          </el-row>
          <el-row style="text-align: center">
            <el-col :span="3" :offset="5">
              <h3>网易云账号信息</h3>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="19" :offset="5">
              <el-row>
                <el-col :span="3">
                  <el-image
                    :src="account.wyAccount.avatarUrl"
                    style="width: 80px; height: 80px"
                  />
                </el-col>
                <el-col :span="5">
                  <span v-if="account.wyAccount"
                    >{{ account.wyAccount.nickname }}（已绑定）</span
                  >
                  <span v-if="!account.wyAccount">
                    请先绑定正确的网易云账号
                  </span>
                </el-col>
              </el-row>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="19" :offset="5" style="margin-top: 30px">
              <el-row style="text-align: left">
                <el-col
                  :span="10"
                  style="margin: 0 0 20px 40px; font-size: 13px; color: grey"
                >
                  <el-radio-group v-model="account.loginType" class="ml-4">
                    <el-radio label="qrcode" size="large">扫码登录</el-radio>
                    <el-radio label="phone" size="large">手机号登录</el-radio>
                    <el-radio label="email" size="large">邮箱登录</el-radio>
                  </el-radio-group>
                </el-col>
              </el-row>
              <el-row v-if="account.loginType == 'phone'">
                <el-col :span="4"> 国际电话区号 </el-col>
                <el-col :span="8">
                  <el-input
                    v-model="account.countryCode"
                    placeholder="默认86，不需要输入 +"
                    maxlength="4"
                  ></el-input>
                </el-col>
              </el-row>
              <el-row v-if="['phone', 'email'].includes(account.loginType)">
                <el-col :span="2"> 账号 </el-col>
                <el-col :span="10">
                  <el-input v-model="account.account"></el-input>
                </el-col>
              </el-row>
              <el-row v-if="['phone', 'email'].includes(account.loginType)">
                <el-col :span="2"> 密码 </el-col>
                <el-col :span="10">
                  <el-input
                    show-password="true"
                    v-model="account.password"
                  ></el-input>
                </el-col>
              </el-row>
              <el-row v-if="account.loginType === 'qrcode'">
                <el-col span="24">
                  <el-row style="color: grey">
                    <el-col :offset="8"> 请使用网易云音乐 app 扫码登录 </el-col>
                  </el-row>

                  <el-row>
                    <el-col :offset="8">
                      <div
                        style="position: relative; width: 180px; height: 180px"
                      >
                        <el-image
                          :src="qrLogin.qrCode"
                          style="
                            width: 180px;
                            height: 180px;
                            position: absolute;
                            top: 0;
                            left: 0;
                          "
                        >
                          <template #error>
                            <div class="image-slot">
                              <div
                                style="
                                  background-color: #f5f7fa;
                                  width: 180px;
                                  height: 180px;
                                "
                              >
                                <div
                                  style="
                                    font-size: 13px;
                                    color: #07c160;
                                    padding-top: 20px;
                                  "
                                >
                                  {{
                                    !account.wyAccount
                                      ? "二维码已失效，请点击刷新"
                                      : "如需切换绑定的账号,点击按钮刷新二维码"
                                  }}
                                </div>
                              </div>
                            </div>
                          </template>
                        </el-image>
                        <el-button
                          size="small"
                          circle
                          type="danger"
                          style="position: absolute; top: 75px; left: 75px"
                          @click="refreshQRCode"
                        >
                          ↻
                        </el-button>
                      </div>
                    </el-col>
                  </el-row>
                </el-col>
              </el-row>
            </el-col>
          </el-row>
          <el-row v-if="account.loginType !== 'qrcode'">
            <el-col :span="8" :offset="8" style="margin-top: 20px">
              <el-button type="primary" @click="updateAccount">
                更新网易云账号信息
              </el-button>
            </el-col>
          </el-row>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
import { getAccount, setAccount, qrLoginCreate, qrLoginCheck } from "../../api";
import storage from "../../utils/storage";
import { ElMessage } from "element-plus";

export default {
  data: () => {
    return {
      mk: "",
      account: {},
      registedMK: false,
      qrLogin: {
        qrCode: "",
        qrKey: "",
      },
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
      // 800 为二维码过期; 801 为等待扫码; 802 为待确认; 803 为授权登录成功
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
      if (
        !this.account.account ||
        !this.account.password ||
        !this.account.loginType
      ) {
        return;
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
      });
      if (ret.data.account) {
        this.account = ret.data.account;
        storage.set("wyAccount", ret.data.account.wyAccount);
      }
    },

    logoutMK() {
      storage.del("mk");
      this.registedMK = false;
      this.mk = "";
      this.account = {};
    },
  },
};
</script>
