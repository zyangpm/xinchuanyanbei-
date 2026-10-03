// ===== 新传研背 后端 · Vercel Serverless 适配层 =====
// 用法：apps/server/api/<path>.js 各自 require 本层导出的工具，
//      由 Vercel 按路径约定分发请求（api/health.js -> /api/health 等）。
// 与 src/server.js（本地/Render 常驻版）共享同一套业务逻辑，
// 区别仅是：Vercel 每实例惰性初始化云库（幂等建表 + 幂等建管理员）。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createDb, initSchema } = require('../src/db');
const { verifyToken, hashPassword } = require('../src/auth');
const { sendJson } = require('../src/util');
const { handleRegister, handleLogin, handleMe } = require('../src/routes/auth');
const { handleQuestions, handleQuestionSync } = require('../src/routes/questions');
const { handlePull, handlePush, COLLECTIONS } = require('../src/routes/sync');
const { handleAdminUsers, handleAdminStats } = require('../src/routes/admin');

// ---------- 惰性全局数据库（同一实例内复用；Vercel 多实例各自初始化，幂等安全） ----------
let dbPromise = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await createDb();
      await initSchema(db);
      await ensureAdmin(db);
      return db;
    })();
  }
  return dbPromise;
}

/** 首次启动确保管理员账号存在（环境变量 XC_ADMIN_USERNAME / XC_ADMIN_PASSWORD）。 */
async function ensureAdmin(db) {
  const name = process.env.XC_ADMIN_USERNAME || 'admin';
  const pass = process.env.XC_ADMIN_PASSWORD;
  if (!pass) return;
  const exists = await db.prepare('SELECT id FROM users WHERE username = ?').get(name);
  if (!exists) {
    await db.prepare('INSERT INTO users (username, password_hash, nickname, role) VALUES (?,?,?,?)')
      .run(name, hashPassword(pass), '管理员', 'admin');
  }
}

// ---------- API 令牌（写操作兼容旧机制：Bearer <api_token> 或 Bearer <JWT>） ----------
// Vercel 无持久磁盘：固定令牌请用环境变量 XC_API_TOKEN 注入；否则每次冷启动随机（仅影响旧批量写入客户端）。
const API_TOKEN = process.env.XC_API_TOKEN || '';

/** 鉴权上下文：返回 { via, user? } 或 null。 */
function authCtx(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return null;
  if (t === API_TOKEN) return { via: 'api-token', user: null };
  const payload = verifyToken(t);
  if (payload && payload.uid) return { via: 'jwt', user: payload };
  return null;
}

/** CORS 预检：返回 true 表示已处理（204），调用方直接 return。 */
function corsPreflight(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }
  return false;
}

/** 解析请求路径（/api/...）。 */
function reqUrl(req) {
  return new URL(req.url || '/', 'http://localhost');
}

// ---------- 各 API 路由处理器（供 api/*.js 薄包装调用） ----------
async function health(req, res) {
  const db = await getDb();
  return sendJson(res, 200, {
    code: 0, message: 'ok',
    data: { status: 'healthy', service: 'xinchuan-server', mode: db.mode, time: new Date().toISOString() }
  });
}

async function register(req, res) {
  const db = await getDb();
  return handleRegister(req, res, db);
}

async function login(req, res) {
  const db = await getDb();
  return handleLogin(req, res, db);
}

async function me(req, res) {
  const db = await getDb();
  const ctx = authCtx(req);
  if (!ctx || !ctx.user) return sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
  return handleMe(req, res, db, ctx);
}

async function questions(req, res) {
  const db = await getDb();
  const url = reqUrl(req);
  if (req.method === 'POST' && !authCtx(req)) {
    return sendJson(res, 401, { code: 401, message: '未授权：缺少或错误的 API 令牌', data: null });
  }
  return handleQuestions(req, res, db, url, null);
}

async function questionSync(req, res) {
  const db = await getDb();
  if (!authCtx(req)) return sendJson(res, 401, { code: 401, message: '未授权：缺少或错误的 API 令牌', data: null });
  return handleQuestionSync(req, res, db);
}

async function questionById(req, res, id) {
  const db = await getDb();
  const url = reqUrl(req);
  if (req.method !== 'GET' && !authCtx(req)) {
    return sendJson(res, 401, { code: 401, message: '未授权：缺少或错误的 API 令牌', data: null });
  }
  return handleQuestions(req, res, db, url, Number(id));
}

async function adminGuard(req, res) {
  const ctx = authCtx(req);
  if (!ctx || !ctx.user) return sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
  if (ctx.user.role !== 'admin') return sendJson(res, 403, { code: 403, message: '无权限：需要管理员账号', data: null });
  return ctx;
}

async function adminUsers(req, res) {
  const db = await getDb();
  await adminGuard(req, res);
  return handleAdminUsers(req, res, db);
}

async function adminStats(req, res) {
  const db = await getDb();
  await adminGuard(req, res);
  return handleAdminStats(req, res, db);
}

async function sync(req, res, collection) {
  const db = await getDb();
  if (!COLLECTIONS[collection]) return sendJson(res, 404, { code: 404, message: '未知同步集合: ' + collection, data: null });
  const ctx = authCtx(req);
  if (!ctx || !ctx.user) return sendJson(res, 401, { code: 401, message: '未登录或登录已过期', data: null });
  if (req.method === 'GET') return handlePull(req, res, db, reqUrl(req), ctx, collection);
  if (req.method === 'POST') return handlePush(req, res, db, ctx, collection);
  return sendJson(res, 405, { code: 405, message: '方法不允许', data: null });
}

// ---------- 总路由入口（Vercel 单函数服务器模式用；api/*.js 薄封装亦可复用各 handler） ----------
// 按 URL 路径分发：/api/health、/api/auth/*、/api/questions*、/api/admin/*、/api/sync/* 等。
async function handleAll(req, res) {
  corsPreflight(req, res);
  const url = reqUrl(req);
  const segs = url.pathname.split('/').filter(Boolean);
  if (segs[0] !== 'api') {
    return sendJson(res, 200, {
      ok: true, service: 'xinchuan-api',
      note: 'API 入口在 /api/*，请访问 /api/health 验证'
    });
  }
  const sub = segs.slice(1);
  try {
    if (sub.length === 1 && sub[0] === 'health') return health(req, res);
    if (sub.length === 1 && sub[0] === 'questions') return questions(req, res);
    if (sub.length === 2 && sub[0] === 'questions' && sub[1] === 'sync') return questionSync(req, res);
    if (sub.length === 2 && sub[0] === 'questions') return questionById(req, res, sub[1]);
    if (sub.length === 2 && sub[0] === 'auth' && sub[1] === 'register') return register(req, res);
    if (sub.length === 2 && sub[0] === 'auth' && sub[1] === 'login') return login(req, res);
    if (sub.length === 2 && sub[0] === 'auth' && sub[1] === 'me') return me(req, res);
    if (sub.length === 2 && sub[0] === 'admin' && sub[1] === 'users') return adminUsers(req, res);
    if (sub.length === 2 && sub[0] === 'admin' && sub[1] === 'stats') return adminStats(req, res);
    if (sub.length === 2 && sub[0] === 'sync') return sync(req, res, sub[1]);
    return sendJson(res, 404, { code: 404, message: '接口不存在: /' + segs.join('/'), data: null });
  } catch (e) {
    return sendJson(res, 500, { code: 500, message: '服务器错误: ' + e.message, data: null });
  }
}

module.exports = { getDb, authCtx, corsPreflight, reqUrl, health, register, login, me, questions, questionSync, questionById, adminUsers, adminStats, sync, handleAll };
