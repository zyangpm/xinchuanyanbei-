# 新传研背 V4.0 架构说明

## Monorepo 结构

```
xinchuan-yanbei/
├── apps/
│   ├── mobile/          # 移动端（Electron + PWA）
│   └── admin/           # 管理后台（Electron + 静态 HTML）
├── packages/
│   ├── content/         # 唯一题库数据源
│   ├── types/           # （预留）TS 类型定义
│   └── utils/           # （预留）共享工具函数
├── docs/                # 文档
├── versions/            # 版本记录（非源码）
└── .github/workflows/   # CI/CD
```

## apps/mobile（移动端）

### 运行方式
1. **Electron 桌面应用**：`apps/mobile/main.js` 加载 `app/index.html`
2. **HTTP 服务器**：`apps/mobile/start-server.js` 服务 `app/` 目录，手机扫码访问

### 关键文件
- `main.js` — Electron 主进程
- `preload.js` — Electron 预加载脚本（暴露 electronAPI）
- `start-server.js` — HTTP 服务器（端口 8081）
- `app/` — 所有页面、脚本、样式
- `assets/` — 静态资源（图标）

### 数据加载
移动端 HTML 通过相对路径 `../../../packages/content/xxx-data.js` 引用题库数据：
- `file://`（Electron）— 相对路径直接解析到文件系统
- `http://`（HTTP 服务器）— 浏览器解析为 `/packages/content/xxx-data.js`，服务器映射到 `packages/content/`

## apps/admin（管理后台）

### 运行方式
1. **Electron 桌面应用**：`apps/admin/main.js` 加载 `index.html`
2. **HTTP 服务器**：通过移动端 `start-server.js` 的 `/admin/` 路径提供服务

### 关键文件
- `main.js` — Electron 主进程
- `index.html` — 管理员登录页
- `dashboard.html` — 管理后台主页
- `src/` — JS/CSS 源码
- `public/` — 静态资源

## packages/content（题库数据）

### 数据格式
V4.0 数据以 `.js` 文件存储，使用 `var X = {...}` 全局变量模式，通过 `<script src>` 同步加载。

| 文件 | 全局变量 | 格式 |
| --- | --- | --- |
| `noun-data.js` | `nounData` | 对象（key 为词目） |
| `short-data.js` | `shortData` | `{ items: [] }` |
| `essay-data.js` | `essayData` | `{ items: [] }` |
| `practice-data.js` | `practiceData` | 按题型分类 |
| `practice-v2-data.js` | `practiceV2Data` | `{ items: [] }` |

V5+ 可考虑迁移至 `.json` + 异步加载（`fetch()`）。

## 路径规范

- 移动端页面间引用：相对路径（如 `navigateTo('noun-detail.html')`）
- 移动端引用数据：`../../../packages/content/xxx-data.js`
- 移动端引用资源：`assets/xxx.png`（`apps/mobile/app/assets/`）
- 后台引用源码：`src/xxx.js`、`src/xxx.css`
- 后台引用资源：`public/xxx.png`
