// ===== 学生端数据同步合并模块（V5.1）=====
// 职责：让「管理后台的题库操作 / 资料上传 / 反馈」真正出现在学生端。
//
// 两种运行环境：
// 1. 网页版（http://localhost:8081 与 /admin/ 同源）：直接读写同源 localStorage
// 2. 桌面版（学生端与管理后台是两个独立 Electron 应用）：通过 preload 暴露的
//    window.xcShared 读写共享文件 <用户目录>/.xinchuan-yanbei/shared.json
//
// 合并规则（题库 overlay xc_question_sync）：
// - 只有管理员真实操作过的题目（新增/编辑/发布/下架/删除）才会进入 overlay
// - status === 'published' 且未删除：覆盖或新增到学生端题库全局对象
// - draft / unpublished / deleted：从学生端题库隐藏（删除静态题库中的同名题）
// - 合并在页面脚本加载早期执行，直接改写题库全局变量（nounData / shortData /
//   essayData / practiceV2Data），因此所有现有页面与自测逻辑自动生效。

var XCSync = (function () {
  var LS_MATERIALS = 'xc_materials';
  var LS_FEEDBACKS = 'feedbacks';
  var LS_OVERLAY = 'xc_question_sync';

  function isElectron() {
    return !!(window.xcShared && window.xcShared.mode === 'electron');
  }

  function sharedAll() {
    try {
      return isElectron() ? window.xcShared.getAll() || {} : {};
    } catch (e) {
      return {};
    }
  }

  function sharedSet(name, value) {
    try {
      if (isElectron()) window.xcShared.setCollection(name, value);
    } catch (e) { /* 桌面桥失败不阻断页面 */ }
  }

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  }

  function readOverlay() {
    if (isElectron()) {
      var all = sharedAll();
      return all[LS_OVERLAY] || {};
    }
    try { return JSON.parse(localStorage.getItem(LS_OVERLAY) || '{}'); }
    catch (e) { return {}; }
  }

  function escapeText(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function plainToHtml(text) {
    return escapeText(text).replace(/\r?\n/g, '<br>');
  }

  // 两个集合按 id 合并（b 覆盖 a）；学生端 id 可能是数字或时间戳字符串
  function unionById(a, b) {
    var map = {};
    (a || []).forEach(function (x) { if (x && x.id != null) map[String(x.id)] = x; });
    (b || []).forEach(function (x) { if (x && x.id != null) map[String(x.id)] = x; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  // 反馈按 时间+内容 去重合并
  function unionFeedback(a, b) {
    var sig = {};
    var out = [];
    (a || []).concat(b || []).forEach(function (f) {
      if (!f) return;
      var k = String(f.id != null ? f.id : (f.timestamp || f.time || '') + '|' + (f.content || f.message || ''));
      if (!sig[k]) { sig[k] = true; out.push(f); }
    });
    return out;
  }

  // 桌面版：把共享文件中的资料/反馈同步成本地 localStorage 镜像，
  // 让现有直接读 localStorage 的页面逻辑（renderUploadedMaterials 等）零改动生效
  function mirrorSharedToLocal() {
    if (!isElectron()) return;
    var all = sharedAll();
    if (Array.isArray(all[LS_MATERIALS])) {
      localStorage.setItem(LS_MATERIALS, JSON.stringify(unionById(readJson(LS_MATERIALS), all[LS_MATERIALS])));
    }
    if (Array.isArray(all[LS_FEEDBACKS])) {
      localStorage.setItem(LS_FEEDBACKS, JSON.stringify(unionFeedback(readJson(LS_FEEDBACKS), all[LS_FEEDBACKS])));
    }
  }

  // 学生端自己写入资料/反馈后调用：把本地全量集合回写共享文件（网页版无需操作）
  function publishLocalCollection(key) {
    if (!isElectron()) return;
    sharedSet(key, readJson(key));
  }

  // ---------- 题库构造 ----------

  function buildNoun(q) {
    var raw = (q.contentJson || '').trim();
    var lines = raw.split(/\r?\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var sections;
    if (lines.length) {
      sections = lines.slice(0, 10).map(function (line, i) {
        return { title: i === 0 ? '题目内容' : '要点 ' + i, content: line };
      });
    } else {
      sections = [{ title: '内容状态', content: '该题已由管理后台发布，详细内容待后台补充。' }];
    }
    return {
      title: q.title,
      tag: q.tag || '新增',
      category: q.category && q.category !== '待分类' ? q.category : '传播学原理',
      caption: lines[0] ? lines[0].slice(0, 40) : '管理后台同步词条',
      definition: { blocks: [{ label: '① 核心内容', sections: sections }] },
      tree: [],
      community: [],
      _fromAdmin: true
    };
  }

  function parseScore(tag, fallback) {
    var m = String(tag || '').match(/(\d+)\s*分/);
    return m ? parseInt(m[1], 10) : fallback;
  }

  function buildTextItem(q, type) {
    var raw = (q.contentJson || '').trim();
    var prefix = type === 'short' ? 'admin_short_' : 'admin_essay_';
    return {
      id: prefix + q.id,
      title: q.title,
      score: parseScore(q.tag, type === 'short' ? 20 : 30),
      wordLimit: type === 'short' ? 800 : 1200,
      category: q.category && q.category !== '待分类' ? q.category : '传播学原理',
      tag: q.tag || (type === 'short' ? '简答' : '论述'),
      topic: '',
      noTopic: false,
      question: q.title,
      variants: [{ title: '原题', content: raw || q.title }],
      framework: [],
      answer: raw ? plainToHtml(raw) : '该题已由管理后台发布，参考答案待后台补充。',
      memoryTip: '',
      selfTest: null,
      _fromAdmin: true
    };
  }

  function buildPractice(q) {
    var raw = (q.contentJson || '').trim();
    return {
      id: 'admin_practice_' + q.id,
      title: q.title,
      score: parseScore(q.tag, 30),
      wordLimit: 800,
      type: '其他实务',
      category: '其他',
      tag: q.tag || '实务',
      question: raw || q.title,
      framework: [],
      fullSample: raw || '该实务题已由管理后台发布，参考范文待后台补充。',
      notes: [],
      masteryLevel: '',
      _fromAdmin: true
    };
  }

  // ---------- overlay 应用 ----------

  var applied = false;

  function applyNoun(q, visible) {
    if (typeof nounData !== 'object' || nounData === null) return;
    var existing = nounData[q.title];
    if (!visible) {
      if (existing) delete nounData[q.title];
      return;
    }
    if (existing) {
      if (q.tag) existing.tag = q.tag;
      if (q.category) existing.category = q.category;
      if ((q.contentJson || '').trim()) {
        var built = buildNoun(q);
        existing.definition = built.definition;
        existing.caption = built.caption;
      }
    } else {
      nounData[q.title] = buildNoun(q);
    }
  }

  function applyArrayItem(globalName, q, visible, builder, kind) {
    var store = window[globalName];
    if (!store || !Array.isArray(store.items)) return;
    var idx = -1;
    for (var i = 0; i < store.items.length; i++) {
      if (store.items[i].title === q.title) { idx = i; break; }
    }
    if (!visible) {
      if (idx >= 0) store.items.splice(idx, 1);
      return;
    }
    if (idx >= 0) {
      var it = store.items[idx];
      if (q.tag) it.tag = q.tag;
      if (q.category) it.category = q.category;
      var raw = (q.contentJson || '').trim();
      if (raw) {
        if (kind === 'practice') it.fullSample = raw;
        else it.answer = plainToHtml(raw);
      }
    } else {
      store.items.push(builder(q));
    }
  }

  function applyOverlay() {
    if (applied) return;
    applied = true;

    var overlay = readOverlay();
    Object.keys(overlay).forEach(function (k) {
      var q = overlay[k];
      if (!q || !q.title || !q.questionType) return;
      var visible = !q.deleted && q.status === 'published';
      try {
        if (q.questionType === 'noun') applyNoun(q, visible);
        else if (q.questionType === 'short') applyArrayItem('shortData', q, visible, function (qq) { return buildTextItem(qq, 'short'); }, 'text');
        else if (q.questionType === 'essay') applyArrayItem('essayData', q, visible, function (qq) { return buildTextItem(qq, 'essay'); }, 'text');
        else if (q.questionType === 'practice') applyArrayItem('practiceV2Data', q, visible, buildPractice, 'practice');
      } catch (e) { /* 单条合并失败不影响其他题目 */ }
    });
  }

  function init() {
    try {
      mirrorSharedToLocal();
      applyOverlay();
      window.XCSyncReady = true;
      document.dispatchEvent(new Event('xcsync:ready'));
    } catch (e) {
      window.XCSyncReady = true;
    }
  }

  // DOM 可能在本脚本之前已就绪（脚本位于 body 底部），立即初始化
  init();

  return {
    init: init,
    publishLocalCollection: publishLocalCollection,
    readOverlay: readOverlay,
    isElectron: isElectron
  };
})();
