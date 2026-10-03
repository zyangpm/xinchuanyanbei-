// ===== 新传研背 后端 · 认证模块（JWT + scrypt，crypto 实现，零第三方依赖）=====
// 令牌格式：标准 JWT（HS256），三段 base64url，HMAC-SHA256 签名。
// 密钥来源：环境变量 XC_JWT_SECRET > data/.jwt_secret 持久化文件 > 自动生成。
// 密码：scrypt（salt:hash 十六进制），登录时重算比对。
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./db');

const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');
// 生产环境（Vercel / NODE_ENV=production / Serverless）：必须显式配置 XC_JWT_SECRET。
// 禁止依赖 Serverless 本地文件保存密钥（无持久磁盘、每次冷启动随机会导致全体用户登出）。
// 本地开发（无以上标记）：自动生成并持久化到 data/.jwt_secret，保持开发体验。
const IS_PROD_SERVERLESS =
  process.env.VERCEL === '1' ||
  process.env.NODE_ENV === 'production' ||
  !!process.env.SERVERLESS ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME;

let SECRET = process.env.XC_JWT_SECRET || '';
if (!SECRET && IS_PROD_SERVERLESS) {
  console.error('[auth] 生产环境必须显式配置 XC_JWT_SECRET 环境变量（当前未配置）。' +
    '请在 Vercel Project Settings → Environment Variables 添加后重新部署。拒绝进入生产模式。');
  process.exit(1);
}
if (!SECRET) {
  try { SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch (e) { SECRET = ''; }
}
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, SECRET, 'utf8');
  } catch (e) { /* 写失败不阻塞 */ }
}

const TOKEN_TTL_SEC = 7 * 24 * 3600; // 7 天

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 签发 JWT：payload 内不可含敏感信息。 */
function signToken(payload, ttlSec = TOKEN_TTL_SEC) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(Object.assign({}, payload, { exp: Math.floor(Date.now() / 1000) + ttlSec })));
  const sig = crypto.createHmac('sha256', SECRET).update(header + '.' + body).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return header + '.' + body + '.' + sig;
}

/** 校验 JWT：成功返回 payload，失败返回 null。 */
function verifyToken(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const expect = crypto.createHmac('sha256', SECRET).update(parts[0] + '.' + parts[1]).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (expect !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/** 密码哈希：返回 "salt:hash"（scrypt，64 字节）。 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return salt + ':' + hash;
}

/** 校验密码：与存储值比对，防时序侧信道用 timingSafeEqual。 */
function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const calc = crypto.scryptSync(String(password), salt, 64);
    const expect = Buffer.from(hash, 'hex');
    return calc.length === expect.length && crypto.timingSafeEqual(calc, expect);
  } catch (e) {
    return false;
  }
}

/** 公开用户信息（不返回 password_hash）。 */
function publicUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname || row.username,
    role: row.role || 'student',
    createdAt: row.created_at
  };
}

module.exports = { signToken, verifyToken, hashPassword, verifyPassword, publicUser, TOKEN_TTL_SEC };
