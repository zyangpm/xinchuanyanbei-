# 新传研背 · 新传考研背诵学习工具

> 一款面向新传考研学子的 **AI 辅助背诵 + 考试训练 App**，支持 **Windows / 手机（iOS、安卓）/ 网页** 三端使用，注册登录、数据云同步，换设备不丢进度。

---

## 🌐 在线体验（无需安装，点开即用）

| 入口 | 地址 | 说明 |
|---|---|---|
| 📱 **学生端（手机/电脑浏览器直接打开）** | **[https://app-three-orpin-61.vercel.app](https://app-three-orpin-61.vercel.app)** | 注册一个账号即可使用全部功能，收藏/笔记/掌握度云同步 |
| 🛠️ **管理后台（网页版）** | **[https://admin-web-ruby-nu.vercel.app/dashboard.html](https://admin-web-ruby-nu.vercel.app/dashboard.html)** | 题库管理 / 用户管理 / 数据统计（演示账号 `admin` / `__REDACTED__`） |

> 💡 演示学生账号：`hr_demo2` / `Test12345`（也可以自己注册新账号）。
> 后端 API：`https://server-lilac-nu.vercel.app/api`（JWT 鉴权 + Turso 云数据库）。

---

## 🚀 直接下载（点击即可下载安装）

| 平台 | 下载 | 说明 |
|---|---|---|
| 🪟 Windows | **[⬇️ 下载 Windows 安装包](https://github.com/zyangpm/xinchuanyanbei-/releases/latest)** | 双击安装，桌面出图标，约 75 MB |
| 📱 安卓 | **[⬇️ 下载安卓 APK](https://github.com/zyangpm/xinchuanyanbei-/releases/latest)** | 下载后直接安装（需允许"未知来源"） |
| 🍎 iPhone | **[📖 iOS 使用教程](docs/IOS.md)** | 苹果限制，无法直接装安装包；按教程两步搞定，体验与 App 一致 |

> 💡 下载页面打不开时，点右上角"Releases"，第一个版本里的安装文件就是。

---

## ✨ 这个软件是做什么的

**新传考研人的"背 + 练 + 考"一站式工具**，把零散的笔记变成可记忆、可检测的知识体系：

- 📚 **知识库**：名词解释、简答题、论述题、实务题全题型内容，按教材与专题组织
- 🧠 **分层串记**：知识点拆成"定义 / 特征 / 延伸"逐层记忆，配合 AI 助记
- ⭐ **收藏与笔记**：随时收藏易忘考点、写自己的理解，云端自动同步
- 📈 **掌握度追踪**：给每个考点标记"不会 / 模糊 / 认识"，自动统计熟练度
- 📝 **考试模拟**：真题演练、模拟考试、成绩与错题回顾
- 👨‍💻 **管理后台**：内容运营、题库管理、用户数据统计（运营者用）

## 📱 界面预览

| 登录页 | 首页 | 知识库 |
|---|---|---|
| ![登录](docs/screenshots/login.png) | ![首页](docs/screenshots/home.png) | ![知识库](docs/screenshots/knowledge.png) |

| 背诵详情 | 收藏 |
|---|---|
| ![详情](docs/screenshots/detail.png) | ![收藏](docs/screenshots/collections.png) |

---

## 🏗️ 技术架构（给技术面试官看）

- **跨端架构**：Electron（Windows 桌面）+ PWA / Capacitor（手机）+ 管理后台独立应用，Monorepo 统一管理
- **后端**：Node.js 分层架构（路由 / 鉴权 / 数据访问分离），JWT 登录认证 + 密码哈希存储
- **云同步**：收藏 / 笔记 / 掌握度 / 考试历史四类数据云端同步，增量拉取 + 冲突处理（后写覆盖）
- **数据库**：本地 SQLite 与云端 Turso 双模式，同一套业务 SQL 无缝切换
- **测试**：端到端回归测试脚本，覆盖注册 → 登录 → 上传 → 云恢复全链路

## 🧩 产品文档

- [产品需求文档 PRD](docs/PRD.md) —— 产品定位、目标用户、功能需求、页面流程

## 🔧 本地开发（开发者）

```bash
npm install          # 安装依赖
node apps/server/src/server.js   # 启动后端（默认 3000 端口）
npm -w apps/mobile run start     # 启动学生端
# 管理后台：npm -w apps/admin run start
```

仓库结构：`apps/mobile` 学生端 ｜ `apps/admin` 管理后台 ｜ `apps/server` 后端 ｜ `packages/content` 题库数据源
