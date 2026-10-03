// ===== 管理后台数据管理模块 =====
// 这个文件本质上是一个轻量级「前端数据库」模拟层。
// 使用 localStorage 存储数据，而不是真实后端数据库，便于前端演示和本地运行。
// 主要职责：
// 1. 初始化默认资料、题库、审核内容、发布日志等示例数据
// 2. 提供增删改查接口：材料、内容、题目、日志
// 3. 统计各类数据量，用于 Dashboard 和概览页面
// 4. V5.1：题库的每一次「新增/编辑/删除/发布/下架」都会写入同步层：
//    - 网页版：写入 localStorage，学生端同源页面直接读取
//    - 桌面版：通过 window.xcShared 写入双方共享 JSON 文件
//    注意：初始示例数据不会同步，只有管理员的真实操作才会同步到学生端。

// ===== V6.0：后端同步层 =====
// 题库以云端数据库为唯一数据源：登录后拉取覆盖本地缓存，增删改全部精确写入后端。
// 本地 Electron 无后端时降级为本地存储；网页版直接连 Vercel 后端（无同源代理）。
var XC_API_BASE = (typeof window !== 'undefined' && window.XC_API_BASE) || '';
if (!XC_API_BASE) {
  var _isFileProtocol = typeof location !== 'undefined' && location.protocol === 'file:';
  XC_API_BASE = _isFileProtocol ? 'http://localhost:3000/api' : 'https://server-lilac-nu.vercel.app/api';
}

// 管理端 API 令牌（优先 sessionStorage 登录态，其次本地令牌；网页版直连后端必须携带）
function _adminAuthHeaders() {
  try {
    var t = sessionStorage.getItem('adminToken') || localStorage.getItem('xc_admin_token') || '';
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  } catch (e) { return {}; }
}

/**
 * 登录后拉取云端题库并覆盖本地缓存（种子假数据被真实题库替换）。
 * @returns {Promise<Array>} 云端题目列表
 */
function refreshQuestionsFromServer() {
  return new Promise(function (resolve, reject) {
    if (typeof fetch !== 'function') { reject(new Error('环境不支持 fetch')); return; }
    fetch(XC_API_BASE + '/questions?status=all', { headers: _adminAuthHeaders() })
      .then(function (r) { return r.json().catch(function () { return { code: r.status, message: '响应异常', data: null }; }); })
      .then(function (res) {
        if (!res || res.code !== 0) { reject(new Error((res && res.message) || '云端题库加载失败')); return; }
        var list = Array.isArray(res.data) ? res.data : [];
        localStorage.setItem('xc_questions', JSON.stringify(list));
        // 对齐自增游标，避免新题目 id 撞号
        var maxId = 0;
        list.forEach(function (q) { if (typeof q.id === 'number' && q.id > maxId) maxId = q.id; });
        localStorage.setItem('xc_question_id', String(maxId));
        resolve(list);
      })
      .catch(function (e) { reject(new Error('网络不可用：' + (e && e.message ? e.message : '后端离线'))); });
  });
}

/**
 * 精确写入云端单个题目（新增/编辑），成功后用云端返回结果对齐本地缓存。
 * @param {String} method POST / PUT
 * @param {Number|null} id
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
function writeQuestionToServer(method, id, payload) {
  return new Promise(function (resolve, reject) {
    if (typeof fetch !== 'function') { reject(new Error('环境不支持 fetch')); return; }
    var url = XC_API_BASE + '/questions' + (id != null ? '/' + id : '');
    fetch(url, {
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, _adminAuthHeaders()),
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().catch(function () { return { code: r.status, message: '响应异常', data: null }; }); })
      .then(function (res) {
        if (!res || res.code !== 0) { reject(new Error((res && res.message) || '云端保存失败')); return; }
        resolve(res.data || {});
      })
      .catch(function (e) { reject(new Error('网络不可用：' + (e && e.message ? e.message : '后端离线'))); });
  });
}

/**
 * 异步把题库全量推送到后端（兼容旧调用；新代码走精确 CRUD，不依赖此函数）。
 */
function syncQuestionsToServer(list) {
  try {
    if (typeof fetch !== 'function') return;
    fetch(XC_API_BASE + '/questions/sync', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _adminAuthHeaders()),
      body: JSON.stringify({ items: list || [] })
    }).catch(function () { /* 后端离线：静默 */ });
  } catch (e) { /* 环境不支持 fetch：静默 */ }
}

// ===== V5.1 数据同步层 =====
var XCSyncBridge = {
  isElectron: function() {
    return !!(window.xcShared && window.xcShared.mode === 'electron');
  },
  getAll: function() {
    try {
      return this.isElectron() ? window.xcShared.getAll() : {};
    } catch (e) {
      return {};
    }
  },
  setCollection: function(name, value) {
    try {
      if (this.isElectron()) window.xcShared.setCollection(name, value);
    } catch (e) { /* 同步失败不影响后台本机操作 */ }
  },
  // 合并两个数组（按 id 去重，b 覆盖 a）
  unionById: function(a, b) {
    var map = {};
    (a || []).forEach(function(x) { if (x && x.id != null) map[String(x.id)] = x; });
    (b || []).forEach(function(x) { if (x && x.id != null) map[String(x.id)] = x; });
    return Object.keys(map).map(function(k) { return map[k]; });
  }
};

// ===== V5.1 管理员账号校验 =====
// 无后端的本地演示形态：默认 admin / admin123（与登录页提示一致）；
// 允许通过 localStorage.xc_admin_credential 覆盖为 {username,password}（例如部署方自改密码）。
function getAdminCredential() {
  try {
    var raw = localStorage.getItem('xc_admin_credential');
    if (raw) {
      var c = JSON.parse(raw);
      if (c && typeof c.username === 'string' && typeof c.password === 'string' &&
          c.username.trim() && c.password) {
        return { username: c.username.trim(), password: c.password };
      }
    }
  } catch (e) { /* 覆盖数据损坏时回退默认账号 */ }
  return { username: 'admin', password: 'admin123' };
}

function verifyAdminCredential(username, password) {
  var cred = getAdminCredential();
  return username === cred.username && password === cred.password;
}

var DB = {
  // 初始化默认数据
  init: function() {
    if (!localStorage.getItem('xc_admin_init')) {
      // 资料表
      var materials = [
        {
          id: 1, title: '传播学教程（郭庆光）', sourceType: '教材', fileType: 'PDF',
          wordCount: 320000, chapterInfo: '共15章', parseStatus: 'done',
          uploadedBy: 'admin', createdAt: '2026-01-15 10:30:00', _seed: true
        },
        {
          id: 2, title: '2025新传考研真题汇总', sourceType: '真题', fileType: 'Word',
          wordCount: 12000, chapterInfo: '共6套真题', parseStatus: 'done',
          uploadedBy: 'admin', createdAt: '2026-01-10 14:20:00', _seed: true
        },
        {
          id: 3, title: '新闻学概论（李良荣）', sourceType: '教材', fileType: 'PDF',
          wordCount: 280000, chapterInfo: '共12章', parseStatus: 'done',
          uploadedBy: 'admin', createdAt: '2026-01-12 09:15:00', _seed: true
        },
        {
          id: 4, title: '网络传播概论（彭兰）', sourceType: '教材', fileType: 'PDF',
          wordCount: 240000, chapterInfo: '共10章', parseStatus: 'parsing',
          uploadedBy: 'admin', createdAt: '2026-01-16 11:00:00', _seed: true
        }
      ];

      // AI生成内容表
      var contents = [
        {
          id: 1, materialId: 1, questionType: 'noun', title: '议程设置',
          aiModel: 'DeepSeek', status: 'reviewing', createdAt: '2026-01-16 12:00:00',
          contentData: '{"定义":"议程设置是大众传播媒介影响社会的重要方式","提出":"麦库姆斯和肖1972年提出","特征":"媒介不能决定人们怎么想，但能决定人们想什么"}'
        },
        {
          id: 2, materialId: 2, questionType: 'noun', title: '沉默的螺旋',
          aiModel: 'DeepSeek', status: 'reviewing', createdAt: '2026-01-16 12:05:00',
          contentData: '{"定义":"沉默的螺旋是诺依曼提出的受众理论","提出":"诺依曼1974年提出","特征":"个体害怕因持少数意见而被孤立"}'
        },
        {
          id: 3, materialId: 1, questionType: 'short', title: '沉默的螺旋理论',
          aiModel: 'DeepSeek', status: 'approved', createdAt: '2026-01-15 16:00:00',
          contentData: '{"框架":"总-分-总","要点":["定义","提出","特征","评价"]}'
        }
      ];

      // 题库表
      var questions = [
        { id: 1, contentId: 3, questionType: 'noun', title: '沉默的螺旋', category: '传播学原理', tag: '高频', status: 'published', publishedAt: '2026-01-15 18:00:00' },
        { id: 2, contentId: null, questionType: 'noun', title: '新闻价值', category: '新闻学概论', tag: '高频', status: 'published', publishedAt: '2026-01-14 10:00:00' },
        { id: 3, contentId: null, questionType: 'noun', title: '议程设置', category: '传播学原理', tag: '高频', status: 'draft', publishedAt: null },
        { id: 4, contentId: null, questionType: 'noun', title: '编码解码模型', category: '传播学原理', tag: '高频', status: 'published', publishedAt: '2026-01-13 15:00:00' },
        { id: 5, contentId: null, questionType: 'short', title: '霍尔编码解码模型', category: '传播学原理', tag: '20分', status: 'published', publishedAt: '2026-01-12 14:00:00' },
        { id: 6, contentId: null, questionType: 'essay', title: '媒介素养的内涵与演变', category: '新媒体概论', tag: '30分', status: 'published', publishedAt: '2026-01-11 16:00:00' },
        { id: 7, contentId: null, questionType: 'noun', title: '把关人', category: '传播学原理', tag: '重点', status: 'unpublished', publishedAt: null }
      ];

      // 发布日志
      var publishLogs = [
        { id: 1, questionIds: '[1,2]', publishType: 'immediate', status: 'success', createdAt: '2026-01-15 18:00:00' },
        { id: 2, questionIds: '[4]', publishType: 'immediate', status: 'success', createdAt: '2026-01-13 15:00:00' }
      ];

      localStorage.setItem('xc_materials', JSON.stringify(materials));
      localStorage.setItem('xc_contents', JSON.stringify(contents));
      localStorage.setItem('xc_questions', JSON.stringify(questions));
      localStorage.setItem('xc_publish_logs', JSON.stringify(publishLogs));
      localStorage.setItem('xc_admin_init', 'true');
      localStorage.setItem('xc_material_id', '4');
      localStorage.setItem('xc_content_id', '3');
      localStorage.setItem('xc_question_id', '7');
      localStorage.setItem('xc_log_id', '2');
    }

    // V5.1：桌面版启动时，把共享文件中另一端（学生端上传的资料/反馈、本端历史同步）合并进来
    var shared = XCSyncBridge.getAll();
    if (shared && Object.keys(shared).length) {
      if (Array.isArray(shared.xc_materials) && shared.xc_materials.length) {
        var mergedMaterials = XCSyncBridge.unionById(this.getMaterials(), shared.xc_materials);
        localStorage.setItem('xc_materials', JSON.stringify(mergedMaterials));
        this._reseedId('xc_material_id', mergedMaterials);
      }
      if (Array.isArray(shared.xc_questions) && shared.xc_questions.length) {
        var mergedQuestions = XCSyncBridge.unionById(this.getQuestions(), shared.xc_questions);
        localStorage.setItem('xc_questions', JSON.stringify(mergedQuestions));
        this._reseedId('xc_question_id', mergedQuestions);
      }
      if (Array.isArray(shared.feedbacks) && shared.feedbacks.length) {
        var localFeedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
        var sig = {};
        var fbKey = function(f) { return String(f.id != null ? f.id : (f.timestamp || f.time || '') + '|' + (f.content || f.message || '')); };
        localFeedbacks.forEach(function(f) { sig[fbKey(f)] = true; });
        shared.feedbacks.forEach(function(f) {
          var k = fbKey(f);
          if (!sig[k]) { localFeedbacks.push(f); sig[k] = true; }
        });
        localStorage.setItem('feedbacks', JSON.stringify(localFeedbacks));
      }
      if (shared.xc_question_sync && !localStorage.getItem('xc_question_sync')) {
        localStorage.setItem('xc_question_sync', JSON.stringify(shared.xc_question_sync));
      }
    }
  },

  // 同步自增 id 游标，避免合并进来的数据 id 与新建数据撞号
  _reseedId: function(key, list) {
    var max = parseInt(localStorage.getItem(key) || '0', 10);
    list.forEach(function(x) { if (typeof x.id === 'number' && x.id > max) max = x.id; });
    localStorage.setItem(key, String(max));
  },

  // ===== V6.0 题库 CRUD（本地乐观更新 + 云端精确写入，返回 Promise） =====
  // 本地先写入立即渲染，云端写成功后 resolve；云端失败 reject（调用方可提示"仅保存在本机"）。
  addQuestion: function(data) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    var id = parseInt(localStorage.getItem('xc_question_id') || '0') + 1;
    data.id = id;
    list.unshift(data);
    localStorage.setItem('xc_questions', JSON.stringify(list));
    localStorage.setItem('xc_question_id', id.toString());
    this._localSyncSnapshot();
    // 云端写入（成功后用云端返回的 id/字段对齐本地）
    return writeQuestionToServer('POST', null, {
      questionType: data.questionType, title: data.title, category: data.category,
      tag: data.tag, status: data.status || 'draft', contentJson: data.contentJson || null
    }).then(function (serverQ) {
      if (serverQ && serverQ.id != null) {
        var cur = JSON.parse(localStorage.getItem('xc_questions') || '[]');
        var idx = cur.findIndex(function (q) { return q.id === id; });
        if (idx > -1) cur[idx] = serverQ;
        localStorage.setItem('xc_questions', JSON.stringify(cur));
        // 对齐游标
        var mx = Math.max(id, serverQ.id);
        localStorage.setItem('xc_question_id', String(mx));
      }
      return serverQ;
    });
  },
  updateQuestion: function(id, data) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    var item = list.find(function(q) { return q.id === id; });
    if (item) {
      Object.keys(data).forEach(function(k) { item[k] = data[k]; });
      localStorage.setItem('xc_questions', JSON.stringify(list));
      this._localSyncSnapshot();
    }
    // 云端写入
    return writeQuestionToServer('PUT', id, {
      questionType: data.questionType != null ? data.questionType : item.questionType,
      title: data.title != null ? data.title : item.title,
      category: data.category != null ? data.category : item.category,
      tag: data.tag != null ? data.tag : item.tag,
      status: data.status != null ? data.status : item.status,
      contentJson: data.contentJson != null ? data.contentJson : item.contentJson
    }).then(function (serverQ) {
      if (serverQ && serverQ.id != null) {
        var cur = JSON.parse(localStorage.getItem('xc_questions') || '[]');
        var idx = cur.findIndex(function (q) { return q.id === serverQ.id; });
        if (idx > -1) cur[idx] = serverQ;
        localStorage.setItem('xc_questions', JSON.stringify(cur));
      }
      return serverQ;
    });
  },
  deleteQuestion: function(id) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    var item = list.find(function(q) { return q.id === id; });
    list = list.filter(function(q) { return q.id !== id; });
    localStorage.setItem('xc_questions', JSON.stringify(list));
    if (item) this._localSyncSnapshot();
    // 云端删除
    return new Promise(function (resolve, reject) {
      if (typeof fetch !== 'function') { reject(new Error('环境不支持 fetch')); return; }
      fetch(XC_API_BASE + '/questions/' + id, { method: 'DELETE', headers: _adminAuthHeaders() })
        .then(function (r) { return r.json().catch(function () { return { code: r.status, message: '响应异常', data: null }; }); })
        .then(function (res) {
          if (!res || res.code !== 0) { reject(new Error((res && res.message) || '云端删除失败')); return; }
          resolve(res.data || {});
        })
        .catch(function (e) { reject(new Error('网络不可用：' + (e && e.message ? e.message : '后端离线'))); });
    });
  },
  // 本地快照同步（Electron 共享文件 / 学生端同源读取），云端以精确 CRUD 为准
  _localSyncSnapshot: function() {
    try {
      XCSyncBridge.setCollection('xc_questions', this.getQuestions());
    } catch (e) { /* 桌面端缺桥：忽略 */ }
  },

  // 资料管理
  getMaterials: function() {
    return JSON.parse(localStorage.getItem('xc_materials') || '[]');
  },
  getMaterial: function(id) {
    var list = this.getMaterials();
    return list.find(function(m) { return m.id === id; });
  },
  addMaterial: function(data) {
    var list = this.getMaterials();
    var id = parseInt(localStorage.getItem('xc_material_id') || '0') + 1;
    data.id = id;
    data.createdAt = new Date().toLocaleString('zh-CN');
    list.unshift(data);
    localStorage.setItem('xc_materials', JSON.stringify(list));
    localStorage.setItem('xc_material_id', id.toString());
    XCSyncBridge.setCollection('xc_materials', list); // V5.1 同步到学生端
    return data;
  },
  deleteMaterial: function(id) {
    var list = this.getMaterials();
    list = list.filter(function(m) { return m.id !== id; });
    localStorage.setItem('xc_materials', JSON.stringify(list));
    XCSyncBridge.setCollection('xc_materials', list); // V5.1 同步删除
  },

  // 内容管理
  getContents: function(status) {
    var list = JSON.parse(localStorage.getItem('xc_contents') || '[]');
    if (status) {
      list = list.filter(function(c) { return c.status === status; });
    }
    return list;
  },
  getContent: function(id) {
    var list = JSON.parse(localStorage.getItem('xc_contents') || '[]');
    return list.find(function(c) { return c.id === id; });
  },
  addContent: function(data) {
    var list = JSON.parse(localStorage.getItem('xc_contents') || '[]');
    var id = parseInt(localStorage.getItem('xc_content_id') || '0') + 1;
    data.id = id;
    data.createdAt = new Date().toLocaleString('zh-CN');
    list.unshift(data);
    localStorage.setItem('xc_contents', JSON.stringify(list));
    localStorage.setItem('xc_content_id', id.toString());
    return data;
  },
  updateContentStatus: function(id, status) {
    var list = JSON.parse(localStorage.getItem('xc_contents') || '[]');
    var item = list.find(function(c) { return c.id === id; });
    if (item) {
      item.status = status;
      localStorage.setItem('xc_contents', JSON.stringify(list));
    }
  },

  // 题库管理
  getQuestions: function(type) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    if (type && type !== 'all') {
      list = list.filter(function(q) { return q.questionType === type; });
    }
    return list;
  },
  getQuestion: function(id) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    return list.find(function(q) { return q.id === id; });
  },

  // 发布日志
  getPublishLogs: function() {
    return JSON.parse(localStorage.getItem('xc_publish_logs') || '[]');
  },
  addPublishLog: function(data) {
    var list = this.getPublishLogs();
    var id = parseInt(localStorage.getItem('xc_log_id') || '0') + 1;
    data.id = id;
    data.createdAt = new Date().toLocaleString('zh-CN');
    list.unshift(data);
    localStorage.setItem('xc_publish_logs', JSON.stringify(list));
    localStorage.setItem('xc_log_id', id.toString());
    return data;
  },

  // 统计
  getStats: function() {
    var materials = this.getMaterials();
    var contents = this.getContents();
    var questions = this.getQuestions();
    var logs = this.getPublishLogs();

    return {
      materials: materials.length,
      materialsDone: materials.filter(function(m) { return m.parseStatus === 'done'; }).length,
      contentsReviewing: contents.filter(function(c) { return c.status === 'reviewing'; }).length,
      contentsApproved: contents.filter(function(c) { return c.status === 'approved'; }).length,
      questionsPublished: questions.filter(function(q) { return q.status === 'published'; }).length,
      questionsDraft: questions.filter(function(q) { return q.status === 'draft'; }).length,
      questionsUnpublished: questions.filter(function(q) { return q.status === 'unpublished'; }).length,
      nounCount: questions.filter(function(q) { return q.questionType === 'noun'; }).length,
      shortCount: questions.filter(function(q) { return q.questionType === 'short'; }).length,
      essayCount: questions.filter(function(q) { return q.questionType === 'essay'; }).length,
      practiceCount: questions.filter(function(q) { return q.questionType === 'practice'; }).length,
      publishLogs: logs.length
    };
  }
};

// 初始化
DB.init();
