# 新传研背 · 部署上线指引（V6）

> 当前生产环境：**Vercel 免费档 + Turso 云数据库**。三端均已上线，公网可访问。

## 架构一览

| 端 | 技术 | 线上地址 |
|---|---|---|
| 后端 API | Node.js（原生 http）+ Turso（libsql） | `https://server-lilac-nu.vercel.app/api` |
| 学生端 | 纯 HTML/JS/CSS（PWA + Capacitor + Electron 壳） | `https://app-three-orpin-61.vercel.app` |
| 管理后台 | 纯 HTML/JS/CSS（Electron 壳） | `https://admin-web-ruby-nu.vercel.app` |

## 重新部署（任何一次代码更新）

```bash
# 后端（apps/server 目录）
vercel deploy --prod --yes

# 管理后台（scripts/admin-web 目录，public/ 为静态根）
vercel deploy --prod --yes

# 学生端（apps/mobile/app 目录）
vercel deploy --prod --yes
```

- 每个目录下已有 `.vercel/project.json`，无需重复关联项目。
- 部署令牌通过环境变量注入：`$env:VERCEL_TOKEN = "你的令牌"`（勿硬编码进仓库）。

## 后端环境变量（Vercel Project Settings → Environment Variables）

| Key | 说明 |
|---|---|
| `XC_DB` | `turso`（云端模式） |
| `XC_TURSO_URL` | Turso 数据库地址（`libsql://...`） |
| `XC_TURSO_TOKEN` | Turso 数据库令牌 |
| `XC_JWT_SECRET` | JWT 签名密钥（不设置则每次冷启动随机，用户会被登出） |
| `XC_ADMIN_USERNAME` | 管理员账号（默认 admin） |
| `XC_ADMIN_PASSWORD` | 管理员密码（部署时用于创建初始管理员） |

> 管理员密码变更：在服务端执行一次 `node scripts/rotate-admin-password.js`（读取环境变量），随后务必在 Vercel 更新对应环境变量。

## 首次部署（已完成的步骤，供复查）

1. 注册 Turso → 创建数据库（`xinchuan-db`）→ 拿 URL + Token
2. 注册 Vercel → 创建三个项目（server / admin-web / app）→ 分别 `vercel link`
3. 配置上表环境变量 → 依次 `vercel deploy --prod --yes`
4. 端到端验收：健康检查 → 注册 → 登录 → 后台新增题目 → 学生端可见

## 常见问题

| 问题 | 解决 |
|---|---|
| 部署后提示 Deployment Protection | 实测不影响公网访问；如需关闭，在项目 Settings → Deployment Protection 中取消勾选 |
| 登录/注册提示 429 | 同 IP 限流 10 次/分钟，等待约 1 分钟重试 |
| 学生端页面反复刷新 | 检查 xc-sync.js 是否包含 V6.1 修复（已移除自动 location.reload） |
