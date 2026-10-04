# 新传研背

新传考研背诵学习工具。Windows 桌面端 + 手机（PWA）+ 网页三端，注册登录后收藏 / 笔记 / 掌握度 / 考试记录云同步，换设备不丢进度。

## 在线体验

| 端 | 地址 |
|---|---|
| 学生端 | https://app-three-orpin-61.vercel.app |
| 管理后台 | https://admin-web-ruby-nu.vercel.app |

浏览器打开即用，注册账号即可。不用装任何东西。

## 界面

| | | |
|---|---|---|
| ![登录](docs/screenshots/login.png) | ![首页](docs/screenshots/home.png) | ![知识库](docs/screenshots/knowledge.png) |
| ![背诵详情](docs/screenshots/detail.png) | ![收藏](docs/screenshots/collections.png) | |

## 功能

- **知识库**：名词解释 / 简答题 / 论述题 / 实务题，按教材与专题组织
- **分层背诵**：知识点拆成"定义 / 特征 / 延伸"，逐层记忆
- **收藏 + 笔记**：记易忘考点和自己的想法，云端同步
- **掌握度**：给考点标"不会 / 模糊 / 认识"，自动统计熟练度
- **考试训练**：真题演练、模拟考、成绩与错题回顾
- **管理后台**：题库 CRUD、AI 生成草稿 → 人工审核 → 发布，用户管理、数据统计

## 下载

| 平台 | 方式 |
|---|---|
| Windows | [GitHub Releases 安装包](https://github.com/zyangpm/xinchuanyanbei-/releases/latest)（约 75MB，NSIS 安装，含自动更新） |
| 安卓 | [GitHub Releases APK](https://github.com/zyangpm/xinchuanyanbei-/releases/latest) |
| iPhone | 不支持安装包。Safari 打开学生端 → 分享 → 添加到主屏幕，体验等同原生 App，见 [docs/IOS.md](docs/IOS.md) |

## 技术栈

- **Electron 28** — Windows 桌面端
- **PWA** — 手机端（iOS 通过 Safari 添加到主屏幕）
- **原生 HTML/CSS/JS** — 前端无框架、无构建链
- **Node.js** — 后端用原生 `http` 模块（没上 Express），路由 / 鉴权 / 数据访问分层
- **Turso** — 云端 SQLite；本地开发用 `node:sqlite`，同一套 SQL 无缝切换
- **JWT + scrypt** — 登录鉴权与密码哈希
- **Vercel** — 学生端 / 管理端 / 后端 Serverless 三项目托管
- **Turborepo** — Monorepo

> 开发环境：Windows + Node 22。只在这套环境验证过，macOS/Linux 未打包测试。

## 快速开始

```bash
npm install
node apps/server/src/server.js   # 后端，默认 3000 端口
npm -w apps/mobile run start     # 学生端
npm -w apps/admin run start      # 管理后台
```

后端环境变量（不配也能跑：本地 SQLite + 自动生成 JWT 密钥，仅供本地开发）：

| 变量 | 说明 |
|---|---|
| `XC_DB` | `turso` 用云端库，留空走本地 SQLite |
| `XC_TURSO_URL` / `XC_TURSO_TOKEN` | Turso 连接信息 |
| `XC_JWT_SECRET` | 生产必配。不配的话 Serverless 冷启动随机生成，用户会掉线 |
| `XC_ADMIN_USERNAME` / `XC_ADMIN_PASSWORD` | 管理后台账号密码 |
| `XC_ALLOWED_ORIGINS` | CORS 白名单，逗号分隔。不配默认放行本地开发 |

## 目录结构

```
apps/
  mobile/    学生端（Electron + PWA 共用一份前端）
  admin/     管理后台
  server/    后端（src/ 业务代码，api/ Vercel Serverless 入口）
packages/
  content/   题库数据源
scripts/
  admin-web/ 管理后台网页版部署目录
docs/        产品、架构、部署、iOS 等文档
```

## 部署

Vercel 上是三个独立项目，各自配好根目录和环境变量再部署：

1. `apps/server` → API，线上地址 https://server-lilac-nu.vercel.app/api（函数入口在 `api/`）
2. `apps/mobile/app` → 学生端静态站
3. `scripts/admin-web` → 管理后台静态站

生产环境务必配：`XC_DB=turso` + Turso 连接 + **固定 `XC_JWT_SECRET`** + 管理员账号密码 + `XC_ALLOWED_ORIGINS`。

## 迭代计划

**已完成（V5.2.1）**

- 管理后台 AI 内容生成接入真实 DeepSeek（管理员填自己的 API Key，草稿存浏览器本地，审核后发布）
- 桌面端自动更新（electron-updater + GitHub Releases）

**规划中**

- 管理端 AI 草稿入库（不再依赖浏览器 localStorage）
- 限流升级为共享存储（当前为内存级，Vercel 多实例各自计数）
- 密码找回
- 正式域名 + HTTPS 统一

## 文档

- [产品需求 PRD](docs/PRD.md)
- [系统架构 ARCHITECTURE](docs/ARCHITECTURE.md)
- [部署说明 DEPLOY](docs/DEPLOY.md)
- [iOS 使用指南](docs/IOS.md)

## License

[MIT](LICENSE)
