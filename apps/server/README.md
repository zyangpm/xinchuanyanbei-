# @xinchuan/server · 新传研背后端服务

> V6.0 云端化 · 阶段 1（后端骨架 + 数据库 + 题库 API）

## 特点
- **零第三方依赖**：只用 Node.js 内置模块（`http` + `node:sqlite`）
- Node 版本要求：**>= 22**（内置 SQLite）
- 数据库文件：`data/xinchuan.db`（自动创建，已加入 .gitignore）

## 启动
```bash
node src/server.js
# 或
npm start
```
默认端口 `3000`，可用环境变量覆盖：`PORT=8080 node src/server.js`

## API（当前已实现）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/questions?type=&status=` | 题库列表（可按题型/状态筛选） |
| GET | `/api/questions/:id` | 题目详情 |
| POST | `/api/questions` | 新增题目 |
| PUT | `/api/questions/:id` | 编辑题目 |
| DELETE | `/api/questions/:id` | 删除题目 |

统一响应格式：`{ code, message, data }`

## 已建数据表（9 张）
`users` · `questions` · `materials` · `favorites` · `notes` · `study_progress` · `exam_history` · `feedback` · `publish_logs`

## 进度
- [x] 阶段 1：后端骨架 + 建表 + 题库 API
- [ ] 阶段 2：后台管理接入 API
- [ ] 阶段 3：学生端接入 API
- [ ] 阶段 4：用户账号体系
- [ ] 阶段 5：部署配置
