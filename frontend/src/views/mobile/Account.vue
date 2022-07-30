<template>
  <div>
    <van-row v-if="!registedMK">
      <van-col style="margin-top: 100px">
        <h2 style="text-align: center; padding: 0 30px">
          填写你的 Melody Key 就可以开始使用啦 😘
        </h2>
        <van-row>
          <van-col :span="20" :offset="2">
            <van-field
              v-model="mk"
              size="large"
              maxlength="32"
              required
              placeholder="请输入。初始管理员的默认 key 为：melody"
              autofocus
              clearable
              @keyup.enter="checkMK"
            ></van-field>
          </van-col>
        </van-row>
        <van-row>
          <van-col :span="8" :offset="8" style="margin-top: 20px">
            <van-button
              round
              type="success"
              @click="checkMK"
              :loading="MKChecking"
              loading-text="校验中..."
            >
              开始使用
            </van-button>
          </van-col>
        </van-row>
      </van-col>
    </van-row>
    <van-row v-if="account.uid">
      <van-col span="24">
        <van-row style="margin-top: 10px">
          <van-col :span="16" :offset="3" style="text-align: left">
            当前 Melody Key: {{ account.uid }}
          </van-col>
          <van-col :span="4">
            <van-button round type="warning" size="mini" @click="logoutMK"
              >退出</van-button
            >
          </van-col>
        </van-row>
        <van-row>
          <van-col :offset="3" style="margin-top: 50px">
            <h3>网易云账号信息</h3>
          </van-col>
        </van-row>
        <van-row style="">
          <van-image
            round
            :src="account.wyAccount.avatarUrl"
            style="width: 80px; height: 80px; margin-left: calc(50% - 40px)"
          />
        </van-row>
        <van-row style="text-align: center; margin-top: 10px">
          <van-col :span="24" v-if="account.wyAccount"
            >{{ account.wyAccount.nickname }}（已绑定）</van-col
          >
          <span v-if="!account.wyAccount"> 请先绑定正确的网易云账号 </span>
        </van-row>
        <van-row style="text-align: left">
          <van-col :offset="3" style="margin-top: 50px">
            <van-radio-group
              checked-color="#07c160"
              v-model="account.loginType"
              direction="horizontal"
            >
              <van-radio name="phone">手机号登录</van-radio>
              <van-radio name="email">邮箱登录</van-radio>
            </van-radio-group>
          </van-col>
        </van-row>
        <van-row style="margin-top: 20px">
          <van-col :offset="3">
            <van-field
              v-if="account.loginType == 'phone'"
              label="国际电话区号"
              type="digit"
              v-model="account.countryCode"
              placeholder="默认86，不需要输入 +"
              maxlength="4"
            ></van-field>
            <van-field label="账号" v-model="account.account"></van-field>
            <van-field
              label="密码"
              v-model="account.password"
              type="password"
            ></van-field>
          </van-col>
        </van-row>

        <van-row>
          <van-col :offset="8" style="margin-top: 20px">
            <van-button round type="success" @click="updateAccount">
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
import { Notify } from "vant";

export default {
  data: () => {
    return {
      mk: "",
      account: {},
      registedMK: false,
      MKChecking: false,
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
      this.MKChecking = true;
      this.mk = this.mk.trim();
      if (!this.mk) {
        this.MKChecking = false;
        return;
      }
      const ret = await getAccount({ mk: this.mk });
      if (ret !== false && ret.data) {
        this.account = ret.data.account;
        this.registedMK = true;
        storage.set("mk", this.mk);
        storage.set("wyAccount", ret.data.account.wyAccount);
        this.MKChecking = false;

        Notify({ type: "success", message: "Melody Key 设置成功" });
      } else {
        this.MKChecking = false;

        Notify({ type: "warning", message: "Melody Key 不正确哦" });
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
