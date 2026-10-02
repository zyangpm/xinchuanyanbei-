# 新传研背 · 部署上线指引（V5.2）

> 目标：把后端部署到公网（免费），让软件真正"联网可用"，手机（iOS/安卓）能访问，安装包可从 GitHub 下载。
> 完成时间：约 15 分钟（其中用户操作 10 分钟，其余由豆包完成）。

---

## 分工一览

| 步骤 | 谁做 | 耗时 |
|---|---|---|
| 1. 代码推送 GitHub | ✅ 豆包（已完成，commit bfa326c） | — |
| 2. 注册 Turso 云数据库，拿 URL + Token | 👤 你 | 3 分钟 |
| 3. 注册 Render 免费服务器 | 👤 你 | 5 分钟 |
| 4. 后端部署 + 环境变量 + 安装包上传 Releases | 🤖 豆包（用你给的值） | 5 分钟 |
| 5. 端到端验收 + README 回填线上地址 | 🤖 豆包 | 3 分钟 |

---

## 你要做的第 1 步：Turso 云数据库（免费）

> 用途：线上数据库，用户注册、收藏、笔记都存在这里。免费额度：500MB 数据库，个人使用足够。

1. 打开 https://turso.tech 点 **Sign up**（用 GitHub 账号登录最快）
2. 登录后打开 https://turso.tech/databases 点 **Create Database**
3. 名字随便填（如 `xinchuan-db`），地区选离你近的（Singapore 或 Tokyo），点创建
4. 创建后页面会显示：
   - **URL**（形如 `libsql://xxx.turso.io`）
   - **Token**（点 Generate 生成一条，形如 `eyJ...`）
5. 把 **URL** 和 **Token** 复制给我

## 你要做的第 2 步：Render 免费服务器

> 用途：跑后端程序，提供注册/登录/云同步接口。免费额度：750 小时/月，个人使用足够。

1. 打开 https://render.com 点 **Get Started**，用 GitHub 账号登录
2. 登录后点 **New + → Web Service**
3. 选仓库 `xinchuanyanbei-`（需要授权 Render 访问你的仓库，点 Install 授权）
4. 填：
   - Name：`xinchuan-server`
   - Environment：`Node`
   - Branch：`main`
   - Root Directory：`apps/server`
   - Build Command：`npm install`
   - Start Command：`node src/server.js`
5. 展开 **Advanced**，找到 **Environment Variables**（环境变量），点 Add 添加：

| Key | Value |
|---|---|
| `PORT` | `10000` |
| `XC_DB` | `turso` |
| `XC_TURSO_URL` | 第 1 步拿到的 URL |
| `XC_TURSO_TOKEN` | 第 1 步拿到的 Token |
| `XC_ADMIN_USERNAME` | `admin` |
| `XC_ADMIN_PASSWORD` | 你自己设一个强密码（记好！） |

6. 点 **Create Web Service**，等它部署完成（约 5 分钟）
7. 完成后页面上方会显示你的服务地址（形如 `https://xinchuan-server.onrender.com`）
8. 把**服务地址**和**管理员密码**告诉我

---

## 剩下的交给豆包

- 填学生端 `cloud.js` 的线上地址（`DEFAULT_CLOUD`）
- 上传 Windows 安装包到 GitHub Releases
- 端到端验收：注册 → 登录 → 云同步 → 手机访问
- README 下载链接确认可用

---

## 常见问题

| 问题 | 解决 |
|---|---|
| Turso 创建数据库没反应 | 等 1 分钟刷新，免费档首次创建稍慢 |
| Render 部署失败 | 把红色报错截图给我 |
| 部署后 503 | 免费档冷启动需要几十秒，刷新几次即可 |
