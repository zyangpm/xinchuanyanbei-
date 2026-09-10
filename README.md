# 新传研背 V4.0 — Monorepo

新传考研考试模拟系统，标准化 Monorepo 架构。

## 目录结构

```
xinchuan-yanbei/
├── apps/
│   ├── mobile/          # 移动端（Electron + PWA）
│   │   ├── app/         # 移动端页面与脚本（HTML/CSS/JS）
│   │   ├── assets/      # 移动端静态资源
│   │   ├── main.js      # Electron 主进程
│   │   ├── preload.js   # Electron 预加载
│   │   ├── start-server.js  # HTTP 服务器（手机扫码访问）
│   │   └── package.json
│   │
│   └── admin/           # 管理后台（Electron + 静态 HTML）
│       ├── pages/       # （预留 Vite 迁移）
│       ├── src/         # 后台 JS/CSS
│       ├── public/      # 后台静态资源
│       ├── components/  # （预留）
│       ├── services/    # （预留）
│       ├── utils/       # （预留）
│       ├── main.js      # Electron 主进程
│       └── package.json
│
├── packages/
│   ├── content/         # 唯一题库数据源
│   │   ├── noun-data.js
│   │   ├── short-data.js
│   │   ├── essay-data.js
│   │   ├── practice-data.js
│   │   ├── practice-v2-data.js
│   │   ├── tags.json
│   │   └── videos.json
│   ├── types/          # （预留 TS 类型）
│   └── utils/          # （预留共享工具）
│
├── docs/
│   ├── screenshots/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
│
├── versions/
│   ├── v1.0/ ~ v6.0/   # 各版本 README + CHANGELOG + screenshots
│
├── .github/workflows/   # CI/CD
├── .gitignore
├── turbo.json
├── package.json
├── tsconfig.json
└── README.md
```

## 数据规范

`packages/content/` 是唯一题库数据源。
- 移动端 `apps/mobile/app/` 下的 HTML 通过相对路径 `../../../packages/content/xxx-data.js` 引用
- 后台管理平台 `apps/admin/` 负责维护本目录下所有数据文件
- V4.0 数据以 `.js` 文件格式存储（`var X = {...}` 全局变量），V5+ 可考虑迁移至 `.json` + 异步加载

## 快速开始

```bash
# 安装依赖
npm install

# 启动移动端（Electron 桌面应用）
npm run dev:mobile

# 启动移动端 HTTP 服务（手机扫码访问）
npm run serve:mobile

# 启动管理后台（Electron 桌面应用）
npm run dev:admin
```

## 启动脚本

- `启动网页版.bat` → 启动 HTTP 服务器，手机扫码访问
- `启动学生端APP.bat` → 启动 Electron 桌面应用

## 版本

当前：V4.0（标准化 Monorepo 架构重构）
