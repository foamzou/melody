# Melody

## 项目介绍

<img src="./imgs/melody.png" width="100" ></img>

大家好，我叫 Melody，你的音乐精灵，旨在帮助你更好地管理音乐。目前的主要能力是帮助你将喜欢的歌曲或者音频上传到音乐平台的云盘。

为了避免不必要的纠纷和账号安全问题，本项目不会以任何形式提供在线 demo 服务，也请大家不要使用公共服务。本地部署很简单。

## Feature

- 支持在各大音乐和视频网站检索歌曲。目前支持 咪咕、网易云、QQ 音乐、酷狗、bilibili 等站点。详情可以在我的 [media-get](https://github.com/foamzou/media-get#%E6%94%AF%E6%8C%81%E7%9A%84%E7%BD%91%E7%AB%99) 项目中查看
- 移动端适配良好（支持 PWA）
- 用链接搜索歌曲
- 一键“解锁”无法播放的歌曲（实验性功能，目前仅支持网易云）

## 安装和启动

### 方式一：Docker 安装

1. 在你的宿主机创建一个目录，例如： `~/melody-profile`
2. 创建镜像，有两种方式选择(注意修改下面的宿主机目录为你实际的)：
   - 从 hub.docker.com 拉取
     ```
     docker run -d -p 5566:5566  -v ~/melody-profile:/app/backend/.profile foamzou/melody:latest
     ```
   - 从代码编译镜像(若你的 docker 不支持 DOCKER_BUILDKIT，则去掉)
     ```
     DOCKER_BUILDKIT=1 docker build -t melody .
     docker run -d -p 5566:5566  -v ~/melody-profile:/app/backend/.profile melody
     ```
3. 后续更新（以从 hub.docker.com 更新为例）
   ```
   docker pull docker.io/foamzou/melody:latest
   docker kill <CONTAINER ID>
   docker run -d -p 5566:5566  -v ~/melody-profile:/app/backend/.profile foamzou/melody:latest
   ```

### 方式二：源码安装

1. 依赖

   确保以下两个依赖是安装好的

   1. node.js ([官网下载](https://nodejs.org/zh-cn/download/))
   2. FFmpeg ([windows 安装介绍](https://zhuanlan.zhihu.com/p/400952501))

2. 下载源码、初始化服务、运行服务

   ```
   git clone https://github.com/foamzou/melody.git
   cd melody && npm run init && npm run app
   ```

3. 若后面代码有更新，下次执行该命令即可更新
   ```
   npm run update && npm run app
   ```

### 方式三：使用 Koyeb 的免费服务部署

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=docker&image=foamzou/melody:latest&ports=5566;http;/&name=melody)

### 配置你的账号（可选）

默认的 melody key 为： `melody`，若你的服务部署在私有网络，则可以不用修改（网易云账号、密码可以在 web 页面设置）。

若需要修改或添加新账号，则编辑 `backend/.profile/accounts.json` （安装方式为 docker 的则为：`你的宿主机目录/accounts.json` ） 。

1. 该 JSON 中的 key 是 `Melody Key`，是你在网页访问该服务的唯一凭证
2. 网易云账号信息： `account` 和 `password` 可以后续在网页修改
3. 该 JSON 是个数组，支持配置多个账号

Q: 更新了 accounts.json 如何生效？

A: 两种方式。1: 重启服务。2: 网页端 `我的音乐账号` tab 下，随便修改点账号，密码，然后点击 `更新账号密码`，这样会从 accounts.json 更新信息到内存（我后面优化下这块）

### 浏览器访问

最后，在浏览器访问 http://127.0.0.1:5566 就可以使用啦~

## 功能介绍

### 关键词搜索歌曲

如果试听后是你想要的，点击上传按钮会将该歌曲上传到你的网易云音乐云盘
<img src="./imgs/1-home-search-keyword.png" width="1000" ></img>

### 链接搜索

有时候我们在 b 站 听到好听的歌，也可以上传到云盘
<img src="./imgs/2-home-search-url.png" width="1000" ></img>

### 一键解锁歌单

点击 `解锁全部`（实验性功能） 后，服务会自动匹配每首歌，并把歌曲上传到云盘，最后做个 match，以保证你还能看到歌词、评论
<img src="./imgs/3-playlist.png" width="1000" ></img>

### 手动搜索匹配

当某首歌自动解锁失败后，还可以手动点击搜索按钮，找到符合的歌曲后，手动点击上传按钮
<img src="./imgs/4-playlist-search.png" width="1000" ></img>

### 移动端适配
<div>
   <img src="./imgs/mobile-1.png" width="200" ></img>
   <img src="./imgs/mobile-2.png" width="200" ></img>
</div>
<div>
   <img src="./imgs/mobile-3.png" width="200" ></img>
   <img src="./imgs/mobile-4.png" width="200" ></img>
</div>


## Roadmap

计划在后面支持以下功能

- [x] 页面适配移动端
- [ ] 浏览器油猴脚本
- [ ] 云盘歌曲 match 手动纠错
- [ ] 支持播放列表
- [x] 支持播放云盘的歌曲
- [x] 支持 docker 部署
- [ ] 支持 youtube-dl,you-dl 等工具作为输入源
- [ ] 支持 酷狗、qq 音乐等音乐平台的云盘作为输出
- [ ] 偏好设置
- [ ] 版本更新提示

## Q & A
1. Q：移动端版本，为什么点击下载歌曲，会跳新的页面？

   A：有的浏览器不支持嗅探的，会有这个问题。因为外部资源文件都不允许跨域，无法用常规下载方式 save as。考虑后续 hack
2. Q：移动端版本，为什么在数据网络无法播放歌曲？

   A：发现某些网络下，没有触发 `canplaythrough` 事件，wifi 环境下一般是没有问题的。
3. Q：为什么移动端 PWA，点击跳转到其他页面时，无法返回到原来页面？

   A：PWA 在移动端不支持使用外部浏览器打开外链，只能在应用内打开，因此会有各种奇怪问题。此时，只能先杀死应用。

4. Q：为什么我部署的服务，PWA 始终出不了？

   A：PWA 要求服务必须是 HTTPS。

## Change log

- 2022/08/07: 适配移动端（支持 PWA）；支持播放云盘歌曲；修复若干体验问题
- 2022/05/27: 支持国际电话区号、邮箱登录网易云
- 2022/05/08: 支持 docker 部署，修复了一些小 bug
- 2022/05/04: 发布 MVP 版本

## 致谢

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 的网易云 API
- [MakeGirlsMoe](https://make.girls.moe/) 生成的 Melody 虚拟形象图片
- [Media Get](https://github.com/foamzou/media-get) 我的开源项目

## 赞赏

如果我的任何开源项目帮助到了你，都可以考虑请我喝杯奶茶呀~

<img src="./imgs/billing.jpeg" width="220" ></img>
