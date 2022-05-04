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
                  目前仅支持手机+密码登录
                </el-col>
              </el-row>
              <el-row>
                <el-col :span="2"> 账号 </el-col>
                <el-col :span="10">
                  <el-input v-model="account.account"></el-input>
                </el-col>
              </el-row>
              <el-row>
                <el-col :span="2"> 密码 </el-col>
                <el-col :span="10">
                  <el-input
                    show-password="true"
                    v-model="account.password"
                  ></el-input>
                </el-col>
              </el-row>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="8" :offset="8" style="margin-top: 20px">
              <el-button type="primary" @click="updateAccount">
                更新账号密码
              </el-button>
            </el-col>
          </el-row>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
import { getAccount, setAccount } from "../api";
import storage from "../utils/storage";
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
      if (!this.account.account || !this.account.password) {
        return;
      }
      const ret = await setAccount({
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
