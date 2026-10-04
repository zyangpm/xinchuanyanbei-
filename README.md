# 新传研背

新传考研背诵学习工具。Windows 桌面（Electron）+ 手机（PWA）+ 网页三端，注册登录后数据云同步，换设备不丢进度。

在线体验（不用装，浏览器打开就能用）：

- 学生端：https://app-three-orpin-61.vercel.app
- 管理后台：https://admin-web-ruby-nu.vercel.app
- 后端 API：https://server-lilac-nu.vercel.app/api

## 下载

| 平台 | 方式 |
|---|---|
| Windows | [GitHub Releases 下载安装包](https://github.com/zyangpm/xinchuanyanbei-/releases/latest)（约 75MB，双击安装） |
| 安卓 | [GitHub Releases 下载 APK](https://github.com/zyangpm/xinchuanyanbei-/releases/latest)（需允许"未知来源"） |
| iPhone | 不支持直接装安装包。用 Safari 打开学生端 → 分享 → 添加到主屏幕，体验和原生 App 一样。详见 [docs/IOS.md](docs/IOS.md) |

> Windows 桌面端已接入自动更新（electron-updater），出新版本打开 App 会提示下载。

## 功能

- 知识库：名词解释 / 简答题 / 论述题 / 实务题，按教材和专题组织
- 背诵：知识点拆成"定义 / 特征 / 延伸"分层记
- 收藏 + 笔记：记易忘考点，云端同步
- 掌握度：标记"不会 / 模糊 / 认识"，统计熟练度
- 考试：真题演练、模拟考、成绩和错题回顾
- 管理后台：题库管理、内容审核发布、用户管理、数据统计
- 管理端 AI 生成：接真实 DeepSeek（管理员在 AI 生成页填自己的 API Key 即可用，Key 只存浏览器本地）

## 技术栈

- Electron 28（Windows 桌面，NSIS 打包）
- PWA（手机端，iOS 用 Safari 添加到主屏幕）
- 原生 HTML/CSS/JS，没上框架，没构建链
- Node.js 后端：原生 `http` 模块，没上 Express，路由/鉴权/数据访问分层
- 数据库：云端 Turso（SQLite 兼容）；本地开发用 `node:sqlite`，同一套 SQL 切来切去
- JWT + scrypt 登录鉴权
- Vercel 托管（学生端 / 管理端 / 后端 Serverless 三个项目）
- Turborepo 管理 monorepo

> 开发环境：Windows + Node 22。只在这个环境测过，macOS/Linux 没打包验证。

## 本地开发

```bash
npm install
node apps/server/src/server.js   # 后端，默认 3000 端口
npm -w apps/mobile run start     # 学生端
npm -w apps/admin run start      # 管理后台
```

后端需要这些环境变量（不配也能跑，用本地 SQLite + 自动生成密钥）：

| 变量 | 用途 |
|---|---|
| `XC_DB` | `turso` 或留空（本地 SQLite） |
| `XC_TURSO_URL` / `XC_TURSO_TOKEN` | 云端 Turso 连接 |
| `XC_JWT_SECRET` | 生产环境必须显式配置，否则 Serverless 冷启动会随机生成导致掉线 |
| `XC_ADMIN_USERNAME` / `XC_ADMIN_PASSWORD` | 管理后台账号密码 |
| `XC_ALLOWED_ORIGINS` | CORS 白名单（逗号分隔），不配默认放行本地开发 |

## 目录结构

```
apps/
  mobile/   学生端（Electron + PWA 同一份前端）
  admin/    管理后台
  server/   后端（src/ 业务代码，api/ Vercel Serverless 入口）
packages/
  content/  题库数据源
scripts/
  admin-web/ 管理后台网页版部署目录
```

## 部署

Vercel 上是三个独立项目：

1. `apps/server` → API（根目录配 `apps/server`，函数入口在 `api/`）
2. `apps/mobile/app` → 学生端静态站
3. `scripts/admin-web` → 管理后台静态站

部署前把上面环境变量在 Vercel 项目里配好（`XC_DB=turso` + Turso 连接 + 固定 `XC_JWT_SECRET` + 管理员账号密码）。

## 已知限制

- 桌面端自动更新依赖 GitHub Releases，发布新版本后用户打开 App 才检查到
- 管理端 AI 生成的内容草稿存在浏览器 localStorage（审核发布后进数据库）
- 限流是内存级演示（Vercel 多实例各自计数），用户量大了要换共享存储
- 无密码找回
