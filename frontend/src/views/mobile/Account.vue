<template>
  <div>
    <van-row v-if="!registedMK">
      <van-col style="margin-top: 100px">
        <h2 style="text-align: center">填写你的 Melody Key 就可以开始使用啦</h2>
        <van-row>
          <van-col :span="8" :offset="8">
            <van-field v-model="mk" placeholder="32位长度的字符串"></van-field>
          </van-col>
        </van-row>
        <van-row>
          <van-col :span="8" :offset="8" style="margin-top: 20px">
            <van-button type="primary" @click="checkMK"> 确认 </van-button>
          </van-col>
        </van-row>
      </van-col>
    </van-row>
    <van-row v-if="account.uid">
      <van-col>
        <van-row style="text-align: center">
          <van-col :span="8" :offset="14">
            你的 Melody Key: {{ account.uid }}
          </van-col>
          <van-col :span="2">
            <van-link type="primary" @click="logoutMK">退出该账号</van-link>
          </van-col>
        </van-row>
        <van-row style="text-align: center">
          <van-col :span="3" :offset="5">
            <h3>网易云账号信息</h3>
          </van-col>
        </van-row>
        <van-row>
          <van-col :span="19" :offset="5">
            <van-row>
              <van-col :span="3">
                <van-image
                  :src="account.wyAccount.avatarUrl"
                  style="width: 80px; height: 80px"
                />
              </van-col>
              <van-col :span="5">
                <span v-if="account.wyAccount"
                  >{{ account.wyAccount.nickname }}（已绑定）</span
                >
                <span v-if="!account.wyAccount">
                  请先绑定正确的网易云账号
                </span>
              </van-col>
            </van-row>
          </van-col>
        </van-row>
        <van-row>
          <van-col :span="19" :offset="5" style="margin-top: 30px">
            <van-row style="text-align: left">
              <van-col
                :span="10"
                style="margin: 0 0 20px 40px; font-size: 13px; color: grey"
              >
                <van-radio-group v-model="account.loginType" class="ml-4">
                  <van-radio label="phone" size="large">手机号登录</van-radio>
                  <van-radio label="email" size="large">邮箱登录</van-radio>
                </van-radio-group>
              </van-col>
            </van-row>
            <van-row v-if="account.loginType == 'phone'">
              <van-col :span="4"> 国际电话区号 </van-col>
              <van-col :span="8">
                <van-input
                  v-model="account.countryCode"
                  placeholder="默认86，不需要输入 +"
                  maxlength="4"
                ></van-input>
              </van-col>
            </van-row>
            <van-row>
              <van-col :span="2"> 账号 </van-col>
              <van-col :span="10">
                <van-input v-model="account.account"></van-input>
              </van-col>
            </van-row>
            <van-row>
              <van-col :span="2"> 密码 </van-col>
              <van-col :span="10">
                <van-input
                  show-password="true"
                  v-model="account.password"
                ></van-input>
              </van-col>
            </van-row>
          </van-col>
        </van-row>
        <van-row>
          <van-col :span="8" :offset="8" style="margin-top: 20px">
            <van-button type="primary" @click="updateAccount">
              更新账号密码
            </van-button>
          </van-col>
        </van-row>
      </van-col>
    </van-row>
  </div>
</template>

<script>
import { getAccount, setAccount } from "../../api";
import storage from "../../utils/storage";
import { ElMessage } from "element-plus";

export default {
  data: () => {
    return {
      mk: "",
      account: {},
      registedMK: false,
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
    async checkMK() {
      this.mk = this.mk.trim();
      if (!this.mk) {
        return;
      }
      storage.set("mk", this.mk);
      const ret = await getAccount();
      if (ret !== false && ret.data) {
        this.account = ret.data.account;
        this.registedMK = true;
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
