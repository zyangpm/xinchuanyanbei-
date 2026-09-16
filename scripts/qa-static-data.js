const fs = require('fs');
const c = fs.readFileSync('apps/mobile/app/app.js', 'utf8');
console.log('setInterval:', (c.match(/setInterval/g) || []).length, 'clearInterval:', (c.match(/clearInterval/g) || []).length);
const nd = fs.readFileSync('packages/content/noun-data.js', 'utf8');
const keys = [...nd.matchAll(/^\s*"([^"]+)":\s*\{/gm)].map(m => m[1]);
console.log('nounData键数:', keys.length, JSON.stringify(keys));
const kb = fs.readFileSync('apps/mobile/app/knowledge.html', 'utf8');
const kbTerms = [...kb.matchAll(/<div class="lib-name">([^<]+)</g)].map(m => m[1].trim());
const cnt = {};
kbTerms.forEach(t => cnt[t] = (cnt[t] || 0) + 1);
console.log('知识库静态行数:', kbTerms.length, '重名:', JSON.stringify(Object.entries(cnt).filter(([k, v]) => v > 1)));
const sd = fs.readFileSync('packages/content/short-data.js', 'utf8');
console.log('short条目:', (sd.match(/id:\s*'short\d+'/g) || []).length);
const ed = fs.readFileSync('packages/content/essay-data.js', 'utf8');
console.log('essay条目:', (ed.match(/id:\s*'essay\d+'/g) || []).length);
// 首页宣称数量
const idx = fs.readFileSync('apps/mobile/app/index.html', 'utf8');
const claim = [...idx.matchAll(/(\d+)个?词条|(\d+)道/g)].map(m => m[0]);
console.log('首页宣称:', JSON.stringify(claim));
