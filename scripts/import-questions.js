// ===== 题库导入：本地 packages/content -> Turso 云库 =====
// 用法：node import-questions.js
// 数据源：packages/content/{noun-data,short-data,essay-data}.js（CommonJS var 全局）
// 目标：Turso（读 apps/server/data/.deploy-secrets.env 的 XC_TURSO_URL/TOKEN）
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = 'C:/Users/PC/Desktop/产品汇总/xinchuanyanbei-';
const SECRETS = fs.readFileSync(path.join(ROOT, 'apps/server/data/.deploy-secrets.env'), 'utf8');
function envVal(k) { const m = SECRETS.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : ''; }
const TURSO_URL = envVal('XC_TURSO_URL');
const TURSO_TOKEN = envVal('XC_TURSO_TOKEN');
if (!TURSO_URL || !TURSO_TOKEN) { console.error('缺少 Turso 密钥'); process.exit(1); }

function loadGlobal(file, varName) {
  const code = fs.readFileSync(path.join(ROOT, 'packages/content', file), 'utf8');
  const ctx = { module: { exports: {} }, exports: {} };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx[varName];
}

function mapNoun(nounData) {
  const rows = [];
  for (const title of Object.keys(nounData)) {
    const item = nounData[title] || {};
    const content = {
      caption: item.caption || '',
      definition: item.definition || null,
      tree: item.tree || null
    };
    rows.push({
      question_type: 'noun',
      title: title,
      category: item.category || '传播学基础',
      tag: item.tag || '',
      status: 'published',
      content_json: JSON.stringify(content)
    });
  }
  return rows;
}

function mapItems(list, qtype, titleKey) {
  return (list || []).map((item) => ({
    question_type: qtype,
    title: String(item[titleKey] || item.title || '未命名').slice(0, 200),
    category: item.category || '',
    tag: item.tag || '',
    status: 'published',
    content_json: JSON.stringify(item)
  }));
}

(async () => {
  const { createClient } = require(path.join(ROOT, 'node_modules/@libsql/client'));
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

  // 先清空题库（幂等导入）
  await client.execute('DELETE FROM questions');

  const nounData = loadGlobal('noun-data.js', 'nounData');
  const shortData = loadGlobal('short-data.js', 'shortData');
  const essayData = loadGlobal('essay-data.js', 'essayData');

  const nounRows = mapNoun(nounData || {});
  const shortRows = mapItems(shortData && shortData.items, 'short', 'question');
  const essayRows = mapItems(essayData && essayData.items, 'essay', 'question');
  const all = nounRows.concat(shortRows, essayRows);

  console.log('名词:', nounRows.length, '简答:', shortRows.length, '论述:', essayRows.length, '合计:', all.length);

  const stmt = 'INSERT INTO questions (question_type, title, category, tag, status, content_json) VALUES (?,?,?,?,?,?)';
  let ok = 0;
  for (const r of all) {
    try {
      await client.execute({ sql: stmt, args: [r.question_type, r.title, r.category, r.tag, r.status, r.content_json] });
      ok++;
    } catch (e) {
      console.error('行失败:', r.title, e.message);
    }
  }
  console.log('导入成功:', ok, '/', all.length);
  const chk = await client.execute('SELECT question_type, COUNT(*) AS c FROM questions GROUP BY question_type');
  console.log('云端分布:', JSON.stringify(chk.rows));
  client.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
