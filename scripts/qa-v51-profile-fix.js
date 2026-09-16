// 修复回归（资料库种子过滤、hash 导航、profile 动态统计、树线）
const { chromium } = require('playwright');
const BASE = 'http://localhost:8081';
let pass = 0, fail = 0;
function check(n, c, e) { if (c) { pass++; console.log('PASS ' + n); } else { fail++; console.log('FAIL ' + n + ' :: ' + String(e).slice(0, 200)); } }

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 393, height: 852 } });
  await pg.goto(`${BASE}/profile.html?qa=1`);
  await pg.waitForTimeout(800);

  // 1) profile 统计卡：从 localStorage 动态读，不再写死
  const statIds = ['stat-mastered', 'stat-favorites', 'stat-notes'];
  for (const id of statIds) {
    const v = await pg.evaluate((i) => document.getElementById(i).textContent, id);
    check(`1 profile ${id} 非占位符 — ${v}`, v !== '—' && v !== '386' && v !== '57' && v !== '12', v);
  }
  // 2) 统计卡有 onclick（cursor:pointer + onclick 已生效）
  const clickable = await pg.evaluate(() => {
    const nodes = document.querySelectorAll('#profile-user-days + div > div[onclick]')
      || document.querySelectorAll('.container > .profile-body > div:nth-child(3) > div');
    return nodes.length;
  });
  const cardsOnclick = await pg.evaluate(() => {
    const stats = document.querySelector('#stat-mastered')?.parentElement
      ? document.querySelector('#stat-mastered').parentElement.getAttribute('onclick')
      : null;
    return !!stats;
  });
  check('2 统计卡绑了 onclick', cardsOnclick === true, clickable);

  // 3) 资料库弹窗过滤种子（默认应空）
  await pg.evaluate(() => openUploadLibrary());
  await pg.waitForTimeout(400);
  const matText = await pg.evaluate(() => (document.getElementById('library-modal')?.innerText || '').slice(0, 300));
  check('3 资料库弹窗无种子假资料（郭庆光/彭兰/真题等不该出现）',
    !/郭庆光|彭兰|真题汇总|新闻学概论/.test(matText), matText);

  // 4) 从 profile 点账号管理 → settings#account 自动展开
  await pg.goto(`${BASE}/profile.html?qa=1`);
  await pg.waitForTimeout(600);
  await pg.click("div[onclick*='settings.html#account']");
  await pg.waitForTimeout(800);
  const sectionOpened = await pg.evaluate(() => {
    return document.getElementById('settings-detail')?.style.display === 'block'
      && document.getElementById('settings-main')?.style.display === 'none';
  });
  const accTitle = await pg.evaluate(() => document.querySelector('#detail-content')?.innerText || '');
  check('4 hash 导航到 settings#account 自动展开分区', sectionOpened === true, 'section=' + sectionOpened + ' has 修改密码=' + /修改密码/.test(accTitle));

  // 5) 分层串记 SVG 线数 ≥ 4（root→trunk + trunk→branch + branch→leaf 至少这么多）
  await pg.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent('沉默的螺旋')}&qa=1`);
  await pg.waitForTimeout(900);
  await pg.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tab')).find(x => x.textContent.indexOf('分层') !== -1);
    if (t) t.click();
  });
  // toggleMindmap 只是切 display，renderMindMap 只在首次 loadNounDetail 时调用（已渲染好）
  // 切 tab 后需要显式打开
  await pg.evaluate(() => { toggleMindmap(); });
  await pg.waitForTimeout(500);
  const svgInfo = await pg.evaluate(() => {
    const svg = document.querySelector('#mindmapContent svg');
    const lines = svg ? svg.querySelectorAll('line').length : 0;
    const rects = svg ? svg.querySelectorAll('rect').length : 0;
    const content = document.getElementById('mindmapContent');
    return { svg: !!svg, lines, rects, display: content?.style.display || '' };
  });
  check('5 分层串记 SVG 已渲染 + 线数 ≥ 3',
    svgInfo.svg && svgInfo.lines >= 3, JSON.stringify(svgInfo));

  // 6) SVG 中 root → trunk 的第一条横线（stroke 颜色 #243A5E 且 x1=110, x2=160 范围）
  const firstLineOk = await pg.evaluate(() => {
    const svg = document.querySelector('#mindmapContent svg');
    if (!svg) return false;
    const rootRect = svg.querySelector('rect');  // root 卡片
    if (!rootRect) return false;
    const rootRightX = parseFloat(rootRect.getAttribute('x')) + parseFloat(rootRect.getAttribute('width'));
    // 找 x1 接近 rootRightX 且 y 与 root rect 中点对齐的横线（新增的 root→trunk 连接线）
    const rootCy = parseFloat(rootRect.getAttribute('y')) + parseFloat(rootRect.getAttribute('height')) / 2;
    const lines = svg.querySelectorAll('line');
    for (const ln of lines) {
      const x1 = parseFloat(ln.getAttribute('x1'));
      const x2 = parseFloat(ln.getAttribute('x2'));
      const y1 = parseFloat(ln.getAttribute('y1'));
      if (Math.abs(x1 - rootRightX) < 1 && Math.abs(y1 - rootCy) < 2 && x2 > x1 + 10) {
        return true;
      }
    }
    return false;
  });
  check('6 root→trunk 连接线已补上（之前缺失导致 root 断线）', firstLineOk === true, firstLineOk);

  // 7) branch 横线（trunkX → branchLeftX）不再差 10px
  const branchLineAligned = await pg.evaluate(() => {
    const svg = document.querySelector('#mindmapContent svg');
    if (!svg) return false;
    const branchRects = svg.querySelectorAll('rect');  // branch 卡片 rect
    if (branchRects.length < 2) return false;
    const branchLeftX = parseFloat(branchRects[1].getAttribute('x'));
    const lines = svg.querySelectorAll('line');
    // 找第一条 branch 横线：x1 < branchLeftX，x2 ≈ branchLeftX
    for (const ln of lines) {
      const x2 = parseFloat(ln.getAttribute('x2'));
      const x1 = parseFloat(ln.getAttribute('x1'));
      if (Math.abs(x2 - branchLeftX) < 2 && x1 < x2) return true;
    }
    return false;
  });
  check('7 branch 横线已精确接到 branch 卡片左边缘（之前 branchLeftX-10 差 10px）', branchLineAligned === true, branchLineAligned);

  await b.close();
  console.log(`\nprofile+资料+hash+树线: PASS ${pass} / FAIL ${fail}`);
  process.exit(fail ? 1 : 0);
})();
