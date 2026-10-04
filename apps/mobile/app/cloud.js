// ===== 新传研背 学生端 · 云端账号与数据同步模块（V6.0）=====
// 职责：注册/登录（JWT）、收藏/笔记/掌握度的云端双向同步。
//
// 地址优先级：设置页填写的服务器地址(xc_server_url) > 默认云端地址 > 本机后端(开发)
// 离线优先：云端不可用时静默降级为本地数据，登录态与本地功能不受影响。
// 同步协议与后端 /api/sync/* 对齐：增量拉取(since) + 上传(push) + 软删除标记。
var Cloud = (function () {
  // 默认云端地址：部署后端后在此填入线上域名（如 https://xxx.onrender.com/api）
  var DEFAULT_CLOUD = 'https://server-lilac-nu.vercel.app/api';

  var TOKEN_KEY = 'xc_token';
  var USER_KEY = 'xc_user';
  var SINCE_KEY = 'xc_sync_since';
  var PUSHLOG_KEY = 'xc_push_log'; // 已推送的 questionId 集合（用于同步删除标记）
  var SYNCFAIL_KEY = 'xc_sync_fail'; // 云同步失败标记（时间+原因），用于向用户明确提示"本地已保存，联网后自动同步"

  function getBase() {
    try {
      var custom = localStorage.getItem('xc_server_url');
      if (custom) return custom.replace(/\/+$/, '');
    } catch (e) { /* 忽略 */ }
    if (DEFAULT_CLOUD) return DEFAULT_CLOUD;
    var proto = typeof location !== 'undefined' ? location.protocol : '';
    if (proto === 'file:') return 'http://localhost:3000/api';
    return '/api/backend';
  }

  function apiUrl(path) {
    return getBase() + '/' + String(path).replace(/^\//, '');
  }

  function req(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(apiUrl(path), {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return { code: r.status, message: '服务器响应异常', data: null }; });
    }).then(function (res) {
      if (res && res.code === 0) return res;
      var err = new Error((res && res.message) || '请求失败');
      err.code = res && res.code;
      throw err;
    });
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
  }

  function isLoggedIn() {
    return !!getToken();
  }

  /** 登录；未注册账号自动注册（手机号/用户名 + 密码）。 */
  function login(username, password) {
    return req('auth/login', { method: 'POST', body: { username: username, password: password } })
      .then(function (res) { return applyAuth(res.data); })
      .catch(function (err) {
        if (err.code === 401) {
          // 账号不存在 -> 自动注册；注册返回 409 说明账号已存在但密码错误
          return req('auth/register', { method: 'POST', body: { username: username, password: password } })
            .then(function (res) { return applyAuth(res.data); })
            .catch(function (e2) {
              if (e2.code === 409) { err.message = '账号已存在，密码错误'; }
              throw err;
            });
        }
        throw err;
      });
  }

  function applyAuth(data) {
    if (!data || !data.token) throw new Error('登录响应缺少令牌');
    // 换账号登录：清空上一账号的本地学习数据，防止误推给新账号（数据隔离）
    var prev = getUser();
    if (prev && prev.id && data.user && data.user.id && Number(prev.id) !== Number(data.user.id)) {
      try {
        // 云同步四类（会推送云端，必须清）
        localStorage.removeItem('favorites');
        localStorage.removeItem('notes');
        localStorage.removeItem('wordRatings');
        localStorage.removeItem('exam_history');
        // 其他用户级本地数据（不推送云端但避免显示串号）
        localStorage.removeItem('posts');
        localStorage.removeItem('memMethods');
        localStorage.removeItem('masteredCount');
        localStorage.removeItem('favoriteCount');
        localStorage.removeItem('noteCount');
        localStorage.removeItem('studyDays');
        localStorage.removeItem('lastStudyDate');
        localStorage.removeItem('statBase');
        localStorage.removeItem('userNickname');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('avatarColor');
        localStorage.removeItem('avatarText');
        localStorage.removeItem('lastGeneratedVideoUrl');
        localStorage.removeItem('userPhone');
        // 考试作答记录（各题型答案与分析，用户级）
        localStorage.removeItem('exam_answers');
        localStorage.removeItem('exam_analyses');
        localStorage.removeItem('comment_answers');
        localStorage.removeItem('copywriting_answers');
        localStorage.removeItem('health_answers');
        localStorage.removeItem('marketing_answers');
        localStorage.removeItem('news_answers');
        // 其他用户内容/账号信息
        localStorage.removeItem('feedbacks');
        localStorage.removeItem('boundEmail');
        localStorage.removeItem('localPasswordHint');
        localStorage.removeItem('avatarImage');
        localStorage.removeItem('aiPromptTemplate');
        localStorage.removeItem('aiCache');
      } catch (e) { /* 忽略 */ }
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user || {}));
    localStorage.removeItem(SINCE_KEY);
    localStorage.removeItem(SYNCFAIL_KEY);
    return { user: data.user };
  }

  /** 退出登录：清空本地登录态与同步进度（保留本地收藏/笔记数据）。 */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SINCE_KEY);
    localStorage.removeItem(PUSHLOG_KEY);
    localStorage.removeItem(SYNCFAIL_KEY);
  }

  /** 校验登录态（启动时静默调用；失败仅清除 token，不影响本地使用）。 */
  function checkSession() {
    if (!getToken()) return Promise.resolve({ ok: false });
    return req('auth/me').then(function (res) {
      var u = res.data && res.data.user;
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      return { ok: true, user: u };
    }).catch(function () {
      localStorage.removeItem(TOKEN_KEY);
      return { ok: false };
    });
  }

  // ---------- 收藏 ----------

  function favKey(f) { return f.type + ':' + f.id; }

  /** 收藏/取消收藏后调用：把变更推送到云端（已登录时）。失败记录状态并返回 {ok:false}。 */
  function pushFav(fav, deleted) {
    if (!isLoggedIn()) return Promise.resolve({ ok: false, reason: 'not-logged-in' });
    var qid = favKey(fav);
    var log = readLog();
    var body = [{ questionId: qid, updatedAt: new Date().toISOString(), deleted: !!deleted }];
    return req('sync/favorites', { method: 'POST', body: { items: body } }).then(function () {
      if (deleted) delete log[qid]; else log[qid] = 1;
      saveLog(log);
      return { ok: true };
    }).catch(function (err) {
      markSyncFail('favorites', err);
      return { ok: false, offline: true };
    });
  }

  /** 收藏云端合并：云端项并入本地（含软删除处理）。 */
  function mergeFavorites(items) {
    var favs = safeParse('favorites', []);
    var log = readLog();
    var map = {};
    favs.forEach(function (f) { map[favKey(f)] = f; });
    items.forEach(function (it) {
      var m = String(it.questionId || '').match(/^(noun|short|essay):(.+)$/);
      if (!m) return;
      var key = m[1] + ':' + m[2];
      if (it.deleted) {
        if (map[key] && !log[key]) delete map[key];
      } else if (!map[key]) {
        map[key] = { type: m[1], id: m[2], title: m[2], tag: it.tag || '', ts: Date.now() };
      }
    });
    localStorage.setItem('favorites', JSON.stringify(Object.keys(map).map(function (k) { return map[k]; })));
  }

  // ---------- 笔记 ----------

  function noteSid(n) {
    if (n._sid != null) return n._sid;
    var sid = Date.now();
    n._sid = sid;
    return sid;
  }

  /** 新增笔记后调用（已登录时）：上传并回写本地 _sid。失败记录状态并返回 {ok:false}。 */
  function pushNote(note) {
    if (!isLoggedIn()) return Promise.resolve({ ok: false, reason: 'not-logged-in' });
    var sid = noteSid(note);
    var body = [{
      id: sid, questionId: note.questionId || null,
      content: note.content || '', updatedAt: new Date().toISOString(), deleted: false
    }];
    return req('sync/notes', { method: 'POST', body: { items: body } }).then(function (res) {
      // 服务端权威返回，回写 _sid 与时间戳
      if (res.data && res.data[0] && res.data[0].id != null) note._sid = Number(res.data[0].id);
      persistNotes();
      return { ok: true };
    }).catch(function (err) {
      markSyncFail('notes', err);
      return { ok: false, offline: true };
    });
  }

  function persistNotes() {
    localStorage.setItem('notes', JSON.stringify(safeParse('notes', [])));
  }

  function mergeNotes(items) {
    var notes = safeParse('notes', []);
    var exist = {};
    notes.forEach(function (n) { if (n._sid != null) exist[String(n._sid)] = n; });
    items.forEach(function (it) {
      if (it.deleted) {
        if (exist[String(it.id)]) {
          notes = notes.filter(function (n) { return n._sid != null && String(n._sid) !== String(it.id); });
          delete exist[String(it.id)];
        }
        return;
      }
      if (exist[String(it.id)]) return; // 已推送过，以本地为准
      var n = {
        content: it.content || '',
        timestamp: it.updatedAt || new Date().toISOString(),
        _sid: Number(it.id),
        questionId: it.questionId != null ? it.questionId : null
      };
      notes.push(n);
      exist[String(it.id)] = n;
    });
    localStorage.setItem('notes', JSON.stringify(notes));
  }

  // ---------- 掌握度 ----------

  /** 标记掌握度后调用（已登录时）：上传单条。失败记录状态并返回 {ok:false}。 */
  function pushRating(key, rating, ts) {
    if (!isLoggedIn()) return Promise.resolve({ ok: false, reason: 'not-logged-in' });
    var body = [{ questionId: key, rating: rating || 'yes', updatedAt: ts || new Date().toISOString(), deleted: false }];
    return req('sync/progress', { method: 'POST', body: { items: body } })
      .then(function () { return { ok: true }; })
      .catch(function (err) {
        markSyncFail('progress', err);
        return { ok: false, offline: true };
      });
  }

  function mergeProgress(items) {
    var ratings = safeParse('wordRatings', {});
    items.forEach(function (it) {
      var key = String(it.questionId || '');
      if (!key) return;
      if (it.deleted) {
        if (ratings[key]) delete ratings[key];
        return;
      }
      if (ratings[key]) return; // 本地已有（可能更新），以本地为准
      ratings[key] = { rating: it.rating || 'yes', ts: it.updatedAt || new Date().toISOString() };
    });
    localStorage.setItem('wordRatings', JSON.stringify(ratings));
  }

  // ---------- 考试历史 ----------

  function histSid(rec) {
    if (rec._sid != null) return rec._sid;
    var sid = Date.now();
    rec._sid = sid;
    return sid;
  }

  /** 保存考试进度后调用（已登录时）：上传该页进度到云端。失败记录状态并返回 {ok:false}。 */
  function pushHistory(pageId, questionNum) {
    if (!isLoggedIn()) return Promise.resolve({ ok: false, reason: 'not-logged-in' });
    var hist = safeParse('exam_history', {});
    var rec = hist[pageId] || { question: questionNum, timestamp: Date.now() };
    if (!hist[pageId]) hist[pageId] = rec;
    var sid = histSid(rec);
    var body = [{
      id: sid, type: pageId, questionIndex: questionNum || 1,
      answer: '', updatedAt: new Date(rec.timestamp || Date.now()).toISOString(), deleted: false
    }];
    return req('sync/history', { method: 'POST', body: { items: body } }).then(function (res) {
      if (res.data && res.data[0] && res.data[0].id != null) rec._sid = Number(res.data[0].id);
      hist[pageId] = rec;
      localStorage.setItem('exam_history', JSON.stringify(hist));
      return { ok: true };
    }).catch(function (err) {
      markSyncFail('history', err);
      return { ok: false, offline: true };
    });
  }

  /** 考试历史云端合并：按 type(pageId) 并入本地，软删除处理。 */
  function mergeHistory(items) {
    var hist = safeParse('exam_history', {});
    items.forEach(function (it) {
      var t = String(it.type || '');
      if (!t) return;
      if (it.deleted) {
        if (hist[t] && hist[t]._sid != null && String(hist[t]._sid) === String(it.id)) delete hist[t];
        return;
      }
      if (hist[t] && hist[t]._sid != null && String(hist[t]._sid) === String(it.id)) return; // 本地为准
      hist[t] = {
        question: it.questionIndex != null ? Number(it.questionIndex) : 1,
        timestamp: it.updatedAt ? (Date.parse(it.updatedAt) || Date.now()) : Date.now(),
        _sid: Number(it.id)
      };
    });
    localStorage.setItem('exam_history', JSON.stringify(hist));
  }

  // ---------- 同步引擎 ----------

  function safeParse(key, def) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') == null ? def : JSON.parse(localStorage.getItem(key)); }
    catch (e) { return def; }
  }

  function readLog() {
    try { return JSON.parse(localStorage.getItem(PUSHLOG_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveLog(log) { localStorage.setItem(PUSHLOG_KEY, JSON.stringify(log)); }

  function pull(collection, since) {
    return req('sync/' + collection + (since ? '?since=' + encodeURIComponent(since) : ''))
      .then(function (res) { return res.data || []; });
  }

  /**
   * 全量双向同步：拉取云端增量合并到本地；本地有但云端无的变更推送上去。
   * 登录成功 / 应用启动（已登录）时调用。
   * 结果语义：全部成功 → { ok:true } 并清除失败标记；任一失败 → 记录失败标记并返回 { ok:false }（数据仍保留本地）。
   */
  function syncAll() {
    if (!isLoggedIn()) return Promise.resolve({ ok: false, reason: 'not-logged-in' });
    var since = localStorage.getItem(SINCE_KEY) || '';
    var nowIso = new Date().toISOString();

    return Promise.all([
      pull('favorites', since).then(mergeFavorites).catch(function (err) { markSyncFail('favorites', err); return null; }),
      pull('notes', since).then(mergeNotes).catch(function (err) { markSyncFail('notes', err); return null; }),
      pull('progress', since).then(mergeProgress).catch(function (err) { markSyncFail('progress', err); return null; }),
      pull('history', since).then(mergeHistory).catch(function (err) { markSyncFail('history', err); return null; })
    ]).then(function () {
      // 合并后把本地（可能新增/更新的）数据整体推送一次，保证双向收敛
      var ratings = safeParse('wordRatings', {});
      var favItems = safeParse('favorites', []).map(function (f) { return { questionId: favKey(f), updatedAt: new Date().toISOString(), deleted: false }; });
      var noteItems = safeParse('notes', []).map(function (n) { return { id: noteSid(n), questionId: n.questionId || null, content: n.content || '', updatedAt: new Date().toISOString(), deleted: false }; });
      var progItems = Object.keys(ratings).map(function (k) { return { questionId: k, rating: ratings[k].rating || 'yes', updatedAt: ratings[k].ts || new Date().toISOString(), deleted: false }; });
      var histObj = safeParse('exam_history', {});
      var histItems = Object.keys(histObj).map(function (k) {
        var r = histObj[k];
        if (r._sid == null) { r._sid = Date.now(); histObj[k] = r; }
        return { id: r._sid, type: k, questionIndex: r.question || 1, answer: '', updatedAt: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(), deleted: false };
      });
      if (Object.keys(histObj).length) localStorage.setItem('exam_history', JSON.stringify(histObj));

      var jobs = [];
      if (favItems.length) jobs.push(req('sync/favorites', { method: 'POST', body: { items: favItems } })
        .then(function () { return true; })
        .catch(function (err) { markSyncFail('favorites', err); return false; }));
      if (noteItems.length) jobs.push(req('sync/notes', { method: 'POST', body: { items: noteItems } })
        .then(function (res) {
          // 回写服务端权威 id
          if (res.data && res.data.length) {
            var notes = safeParse('notes', []);
            res.data.forEach(function (it) {
              if (it && it.id != null) {
                var m = notes.find(function (n) { return n._sid != null && String(n._sid) === String(it.id); });
                if (m) m._sid = Number(it.id);
              }
            });
            persistNotes();
          }
          return true;
        })
        .catch(function (err) { markSyncFail('notes', err); return false; }));
      if (progItems.length) jobs.push(req('sync/progress', { method: 'POST', body: { items: progItems } })
        .then(function () { return true; })
        .catch(function (err) { markSyncFail('progress', err); return false; }));
      if (histItems.length) jobs.push(req('sync/history', { method: 'POST', body: { items: histItems } })
        .then(function (res) {
          if (res.data && res.data.length) {
            var hist2 = safeParse('exam_history', {});
            res.data.forEach(function (it) {
              if (it && it.id != null && it.type) {
                var rec = hist2[it.type];
                if (rec) rec._sid = Number(it.id);
              }
            });
            localStorage.setItem('exam_history', JSON.stringify(hist2));
          }
          return true;
        })
        .catch(function (err) { markSyncFail('history', err); return false; }));

      return Promise.all(jobs).then(function (results) {
        var allOk = results.every(function (r) { return r !== false; });
        if (allOk) {
          localStorage.setItem(SINCE_KEY, nowIso);
          // 全量推送后重建推送日志（收藏键集合）
          var log = {};
          safeParse('favorites', []).forEach(function (f) { log[favKey(f)] = 1; });
          saveLog(log);
          clearSyncFail();
        } else {
          markSyncFail('push', null);
        }
        return { ok: allOk };
      });
    });
  }

  /** 记录一次云同步失败（本地数据仍保留，联网后自动重试）。 */
  function markSyncFail(collection, err) {
    try {
      var cur = JSON.parse(localStorage.getItem(SYNCFAIL_KEY) || 'null') || { time: 0, collections: [] };
      if (!cur.collections || !cur.collections.length) cur.collections = [];
      if (collection && cur.collections.indexOf(collection) < 0) cur.collections.push(collection);
      cur.time = Date.now();
      cur.reason = (err && err.message) || '网络不可用';
      localStorage.setItem(SYNCFAIL_KEY, JSON.stringify(cur));
    } catch (e) { /* 忽略 */ }
  }

  /** 读取当前同步状态（供 UI 显示"离线已保存，联网后自动同步"）。 */
  function syncStatus() {
    try {
      var s = JSON.parse(localStorage.getItem(SYNCFAIL_KEY) || 'null');
      if (!s || !s.time) return { failed: false };
      return { failed: true, time: s.time, collections: s.collections || [], reason: s.reason || '' };
    } catch (e) { return { failed: false }; }
  }

  function clearSyncFail() {
    try { localStorage.removeItem(SYNCFAIL_KEY); } catch (e) { /* 忽略 */ }
  }

  /** 应用启动：校验登录态 + 增量同步（失败自动记录状态，联网后下次启动自动重试）。 */
  function init() {
    if (!getToken()) return Promise.resolve({ ok: false, reason: 'not-logged-in' });
    return checkSession().then(function (s) {
      if (!s.ok) return { ok: false, reason: 'session-expired' };
      return syncAll();
    });
  }

  return {
    init: init,
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getUser: getUser,
    checkSession: checkSession,
    syncAll: syncAll,
    syncStatus: syncStatus,
    pushFav: pushFav,
    pushNote: pushNote,
    pushRating: pushRating,
    pushHistory: pushHistory
  };
})();

// 浏览器环境：顶层 var 即全局（window.Cloud）；Node 测试环境：导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Cloud;
}
