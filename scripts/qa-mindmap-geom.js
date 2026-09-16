// 诊断 renderMindMap 的 line 坐标——找出 trunk 竖线到底在哪、为什么看不见
const { chromium } = require('playwright');
const BASE = 'http://localhost:8081';

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 393, height: 852 } });
  for (const term of ['新闻价值', '沉默的螺旋']) {
    console.log(`\n=== ${term} ===`);
    await pg.goto(`${BASE}/noun-detail.html?term=${encodeURIComponent(term)}&qa=1`);
    await pg.waitForTimeout(900);
    // 切到分层串记 tab
    await pg.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tab')).find(x => x.textContent.indexOf('分层') !== -1);
      if (t) t.click();
      if (typeof toggleMindmap === 'function') toggleMindmap();
    });
    await pg.waitForTimeout(600);

    const info = await pg.evaluate(() => {
      const svg = document.querySelector('#mindmapContent svg');
      if (!svg) return { svg: false };
      const rects = svg.querySelectorAll('rect');
      const lines = svg.querySelectorAll('line');
      const root = rects[0];
      const rootRect = root ? {
        x: parseFloat(root.getAttribute('x')),
        y: parseFloat(root.getAttribute('y')),
        w: parseFloat(root.getAttribute('width')),
        h: parseFloat(root.getAttribute('height')),
        cy: parseFloat(root.getAttribute('y')) + parseFloat(root.getAttribute('height'))/2
      } : null;
      const allLines = Array.from(lines).map((ln, i) => ({
        i,
        x1: parseFloat(ln.getAttribute('x1')).toFixed(1),
        y1: parseFloat(ln.getAttribute('y1')).toFixed(1),
        x2: parseFloat(ln.getAttribute('x2')).toFixed(1),
        y2: parseFloat(ln.getAttribute('y2')).toFixed(1),
        w: ln.getAttribute('stroke-width'),
        o: ln.getAttribute('opacity'),
        vert: parseFloat(ln.getAttribute('x1')) === parseFloat(ln.getAttribute('x2')),
        horiz: parseFloat(ln.getAttribute('y1')) === parseFloat(ln.getAttribute('y2'))
      }));
      const branchRects = Array.from(rects).slice(1).map(r => ({
        x: parseFloat(r.getAttribute('x')).toFixed(1),
        y: parseFloat(r.getAttribute('y')).toFixed(1),
        w: parseFloat(r.getAttribute('width')).toFixed(1),
        h: parseFloat(r.getAttribute('height')).toFixed(1)
      }));
      return {
        svg: true,
        rootRect,
        totalRects: rects.length,
        branchAndLeafRects: branchRects,
        totalLines: lines.length,
        lines: allLines
      };
    });
    console.log('root=', JSON.stringify(info.rootRect));
    console.log('rects total=', info.totalRects, 'branches+leaves=', info.branchAndLeafRects.length);
    console.log('lines total=', info.totalLines);
    info.lines.forEach(l => console.log(`  L${l.i} (${l.vert?'VERT':'HORIZ'}) ${l.x1},${l.y1} → ${l.x2},${l.y2} sw=${l.w} o=${l.o}`));
    // 画 trunk 的预期位置
    if (info.rootRect) {
      const expTrunkX = info.rootRect.x + info.rootRect.w + 18 + 18;  // rootRightX + lineGap + lineGap
      console.log(`  预期 trunkX ≈ ${expTrunkX.toFixed(1)} — 检查是否有 vertical line 在 x1≈${expTrunkX.toFixed(1)}`);
    }
  }
  await b.close();
})();
