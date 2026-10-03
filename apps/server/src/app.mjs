// Vercel 单函数服务器入口（Node.js server 模式，ESM 默认导出）
// 所有请求进入 handleAll，由 vercel-handler.js 按 URL 分发到各业务路由。
import vercelHandler from './vercel-handler.js';

export default vercelHandler.handleAll;
