// ===== 学生端通用应用逻辑 =====
// 这个脚本主要负责：
// 1. 初始化默认登录状态和用户信息
// 2. 主题、字体、学习模式等设置
// 3. 统一的页面导航、弹窗与页面交互辅助函数
// 4. 共享给多个 HTML 页面使用的通用能力

// ===== V5.1 本地存储安全读写 =====
// 脏数据容错：任一集合 JSON 损坏时回退到 fallback，绝不让单条坏数据中断整页初始化
function safeParseStorage(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null || raw === '') return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('本地数据损坏，已回退默认值：' + key);
    return fallback;
  }
}

// 配额容错：写入失败（如 QuotaExceededError）返回 false，由调用方给用户明确提示
function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn('本地存储写入失败：' + key, e);
    return false;
  }
}

// ===== V5.1 登录态与路由守卫 =====
// 不再"访问即自动登录"；除登录页/闪屏页外，未登录一律跳转登录页，退出登录立即生效
(function setupAuthGuard() {
  try {
    var pageFile = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (pageFile === 'login.html' || pageFile === 'splash.html') {
      // 已登录用户再打开登录页，直接回首页
      if (pageFile === 'login.html' && localStorage.getItem('isLoggedIn') === 'true') {
        window.location.replace('index.html');
      }
      return;
    }
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      window.location.replace('login.html');
    }
  } catch (e) { /* 守卫自身异常不阻断页面 */ }
})();

// 登录成功后补齐演示用户的默认资料（替代旧的"访问即写默认登录态"）
function ensureDefaultProfile() {
  if (!localStorage.getItem('loginType')) localStorage.setItem('loginType', 'password');
  if (!localStorage.getItem('userNickname')) localStorage.setItem('userNickname', '新传研友');
  if (!localStorage.getItem('studyDays')) localStorage.setItem('studyDays', '1');
}

// ===== V5.1 PWA Service Worker 统一注册 =====
// 所有页面都会加载 app.js，在此注册一次即可覆盖全部页面；
// 仅 http(s) 网页/PWA 环境注册（Electron file:// 与不支持 SW 的环境自动跳过）
(function setupServiceWorker() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol.indexOf('http') !== 0) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function (e) {
        console.warn('Service Worker 注册失败：', e);
      });
    });
  } catch (e) { /* 注册失败不影响页面 */ }
})();

function getUserInfo() {
  return {
    nickname: localStorage.getItem('userNickname') || '新传研友',
    days: localStorage.getItem('studyDays') || '1',
    masteredCount: localStorage.getItem('masteredCount') || '386',
    favoriteCount: localStorage.getItem('favoriteCount') || '57',
    noteCount: localStorage.getItem('noteCount') || '12'
  };
}

// ===== V5.0 学习统计真实化 =====
// 首次升级时把旧默认统计值（386/57/12）固化为基数，之后所有学习动作在此基础上累加，避免数字跳变
function initStatBase() {
  if (localStorage.getItem('statBase')) return;
  localStorage.setItem('statBase', JSON.stringify({
    mastered: parseInt(localStorage.getItem('masteredCount') || '386', 10) || 386,
    fav: parseInt(localStorage.getItem('favoriteCount') || '57', 10) || 57,
    note: parseInt(localStorage.getItem('noteCount') || '12', 10) || 12
  }));
  if (!localStorage.getItem('masteredCount')) localStorage.setItem('masteredCount', '386');
  if (!localStorage.getItem('favoriteCount')) localStorage.setItem('favoriteCount', '57');
  if (!localStorage.getItem('noteCount')) localStorage.setItem('noteCount', '12');
}

// 统计计数增减（delta 为负表示减少，最小为 0）
function bumpStat(key, delta) {
  var defaults = { masteredCount: '386', favoriteCount: '57', noteCount: '12' };
  var current = parseInt(localStorage.getItem(key) || defaults[key] || '0', 10) || 0;
  current = Math.max(0, current + delta);
  localStorage.setItem(key, String(current));
}

// 学习天数按自然日去重累加：同一天多次学习只计一次；首次记录当天不改变既有天数，避免升级后跳变
function markStudyDay() {
  var d = new Date();
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  var todayStr = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  if (localStorage.getItem('lastStudyDate') === todayStr) return;
  var last = localStorage.getItem('lastStudyDate');
  if (last) {
    var yesterday = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    var yesterdayStr = yesterday.getFullYear() + '-' + pad(yesterday.getMonth() + 1) + '-' + pad(yesterday.getDate());
    var days = parseInt(localStorage.getItem('studyDays') || '0', 10) || 0;
    days = (last === yesterdayStr) ? days + 1 : 1; // 昨天学过则连续累加，中断则重新计数
    localStorage.setItem('studyDays', String(days));
  }
  localStorage.setItem('lastStudyDate', todayStr);
}

// ===== V5.0 掌握度落库（wordRatings）=====
// 依据当前页面与 URL 参数推导自评对象 key，形如 noun:新闻价值 / short:short001 / essay:essay001
function getCurrentRatingKey() {
  var urlParams = new URLSearchParams(window.location.search);
  var page = (window.location.pathname.split('/').pop() || '').replace('.html', '');
  if (page === 'noun-detail' && typeof currentTerm !== 'undefined' && currentTerm) {
    return 'noun:' + currentTerm;
  }
  var id = urlParams.get('term') || urlParams.get('short') || urlParams.get('essay') || '';
  return id ? (page + ':' + id) : '';
}

// 写入掌握度记录；返回是否为该内容首次标记（供"认识"计数去重）
function rateWord(rating) {
  var key = getCurrentRatingKey();
  if (!key) return false;
  var ratings = safeParseStorage('wordRatings', {});
  var isFirst = !ratings[key];
  ratings[key] = { rating: rating, ts: new Date().toISOString() };
  localStorage.setItem('wordRatings', JSON.stringify(ratings));
  return isFirst;
}

function navigateTo(url) {
  window.location.href = url;
}

function openStudyModeModal() {
  var currentMode = localStorage.getItem('studyMode') || 'recite';
  
  var html = '<div class="modal-overlay" style="display:flex;" id="study-mode-modal" onclick="closeModal(\'study-mode-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">学习模式切换</div>' +
      '<div class="modal-close" onclick="closeModal(\'study-mode-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<div class="fontsize-option ' + (currentMode === 'recite' ? 'active' : '') + '" onclick="setStudyMode(\'recite\')">' +
          '<div class="fontsize-label">背诵学习模式</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">名词解释、简答题背诵复习</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentMode === 'exam' ? 'active' : '') + '" onclick="setStudyMode(\'exam\')">' +
          '<div class="fontsize-label">考试训练模式</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">实务题答题框架训练</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  
  var old = document.getElementById('study-mode-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function setStudyMode(mode) {
  localStorage.setItem('studyMode', mode);
  
  var modeNames = { recite: '背诵学习', exam: '考试训练' };
  var valEl = document.getElementById('study-mode-val');
  if (valEl) valEl.textContent = modeNames[mode] + ' ›';
  
  closeModal('study-mode-modal');
  
  if (mode === 'exam') {
    navigateTo('exam-home.html');
  } else {
    navigateTo('index.html');
  }
}

function initThemeAndFont() {
  var darkMode = localStorage.getItem('darkMode');
  var themeVersion = localStorage.getItem('themeVersion');
  if (darkMode === null || darkMode === undefined || themeVersion !== 'v3') {
    darkMode = 'false';
    localStorage.setItem('darkMode', 'false');
    localStorage.setItem('themeVersion', 'v3');
  }
  // V5.0：深色模式三档——"跟随系统"按系统偏好即时决定
  if (darkMode === 'auto') {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkMode = prefersDark ? 'true' : 'false';
  }
  if (darkMode === 'true') {
    applyDarkMode();
    var darkSwitch = document.getElementById('darkmode-switch');
    if (darkSwitch) {
      darkSwitch.classList.remove('off');
      darkSwitch.classList.add('on');
    }
  } else {
    applyLightMode();
    var darkSwitch = document.getElementById('darkmode-switch');
    if (darkSwitch) {
      darkSwitch.classList.remove('on');
      darkSwitch.classList.add('off');
    }
  }

  var fontSize = localStorage.getItem('fontSize');
  if (fontSize) {
    applyFontSize(fontSize);
    var sizeNames = { small: '小号', normal: '标准', large: '大号', xlarge: '特大' };
    var fontSizeVal = document.querySelector('.settings-row[onclick="openFontSizeModal()"] .val');
    if (fontSizeVal) {
      fontSizeVal.textContent = sizeNames[fontSize] + ' ›';
    }
  }

  var reminderEnabled = localStorage.getItem('reminderEnabled');
  if (reminderEnabled !== null) {
    var reminderSwitch = document.getElementById('reminder-switch');
    if (reminderSwitch) {
      if (reminderEnabled === 'true') {
        reminderSwitch.classList.remove('off');
        reminderSwitch.classList.add('on');
      } else {
        reminderSwitch.classList.remove('on');
        reminderSwitch.classList.add('off');
      }
    }
  }

  var autoPlay = localStorage.getItem('autoPlayVideo');
  if (autoPlay !== null) {
    var autoPlaySwitch = document.getElementById('autoplay-switch');
    if (autoPlaySwitch) {
      if (autoPlay === 'true') {
        autoPlaySwitch.classList.remove('off');
        autoPlaySwitch.classList.add('on');
      } else {
        autoPlaySwitch.classList.remove('on');
        autoPlaySwitch.classList.add('off');
      }
    }
  }

  var avatarColor = localStorage.getItem('avatarColor');
  var avatarText = localStorage.getItem('avatarText');
  var nickname = localStorage.getItem('userNickname');
  
  if (avatarColor) {
    var profileAvatar = document.querySelector('.profile-avatar');
    if (profileAvatar) {
      profileAvatar.style.background = avatarColor;
      profileAvatar.style.backgroundImage = 'none';
    }
    var homeAvatar = document.querySelector('.home-user .avatar');
    if (homeAvatar) {
      homeAvatar.style.background = avatarColor;
      homeAvatar.style.backgroundImage = 'none';
    }
  }
  
  if (nickname) {
    var names = document.querySelectorAll('.profile-name, .name');
    names.forEach(function(name) {
      name.textContent = nickname;
    });
    var displayText = avatarText || nickname.charAt(0);
    var profileAvatar = document.querySelector('.profile-avatar');
    if (profileAvatar) profileAvatar.textContent = displayText;
    var homeAvatar = document.querySelector('.home-user .avatar');
    if (homeAvatar) homeAvatar.textContent = displayText;
  }

  var notes = safeParseStorage('notes', []);
  var noteCountEl = document.querySelector('.settings-row[onclick="openNoteList()"] .val');
  if (noteCountEl) {
    noteCountEl.textContent = notes.length + '条 ›';
  }

  var materials = safeParseStorage('xc_materials', []);
  var materialCountEl = document.querySelector('.settings-row[onclick="openUploadLibrary()"] .val');
  if (materialCountEl) {
    materialCountEl.textContent = materials.length + '份 ›';
  }

  var aiModel = localStorage.getItem('aiModel') || 'DeepSeek';
  var aiModelEl = document.querySelector('.settings-row[onclick="openAiModal()"] .val');
  if (aiModelEl) {
    aiModelEl.textContent = aiModel + ' ›';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  initStatBase();
  localStorage.setItem('APP_VERSION', 'v5.1.0');
  initThemeAndFont();
  initFavoriteStar();
  renderCollections();
  fillHomeCounts();       // B4：首页入口卡片动态数字
  fillProfileStats();     // B2：profile 统计卡动态数字
});

// B4：首页核心入口卡片——动态显示词条数量，不再显示"加载中…"
function fillHomeCounts() {
  var nounEl = document.getElementById('home-noun-count');
  var shortEl = document.getElementById('home-short-count');
  var essayEl = document.getElementById('home-essay-count');
  if (nounEl && typeof nounData !== 'undefined') {
    // nounData 是对象，keys 是词条名；V5.1 恢复入口描述文案（·视频+知识框架）
    var n = Object.keys(nounData).length;
    nounEl.textContent = n + ' 个名词词条 · 视频+知识框架';
  }
  if (shortEl && typeof shortData !== 'undefined') {
    var s = (shortData.items || []).length;
    shortEl.textContent = s + ' 道简答题 · 答题框架+关键词';
  }
  if (essayEl && typeof essayData !== 'undefined') {
    var e = (essayData.items || []).length;
    essayEl.textContent = e + ' 道论述题 · 文章结构+观点展开';
  }
}

// B2：profile 页面——统计卡动态读取 localStorage
function fillProfileStats() {
  var statM = document.getElementById('stat-mastered');
  var statF = document.getElementById('stat-favorites');
  var statN = document.getElementById('stat-notes');
  if (statM) {
    var v = parseInt(localStorage.getItem('masteredCount') || '0', 10);
    statM.textContent = v || '0';
  }
  if (statF) {
    var favs = safeParseStorage('favorites', []);
    statF.textContent = favs.length || '0';
  }
  if (statN) {
    var notes = safeParseStorage('notes', []);
    statN.textContent = notes.length || '0';
  }
}

// V5.1：详情页（名词/简答/论述/实训）顶部 breadcrumb 的"返回"统一跳知识库 knowledge.html，
// 而不是 history.back() 回到上一个名词——切上一个名词是底部 prevTerm/prevShort/prevEssay 的职责。
// 其他页面（如 settings 子区）保持 history.back()，避免破坏既有导航链。
function goBack() {
  var page = '';
  try {
    var p = window.location.pathname;
    page = p.substring(p.lastIndexOf('/') + 1).toLowerCase();
  } catch (e) {}
  var isDetailPage = page === 'noun-detail.html'
    || page === 'short-detail.html'
    || page === 'essay-detail.html'
    || page === 'training-detail.html';
  if (isDetailPage) {
    navigateTo('knowledge.html');
    return;
  }
  if (history.length > 1) {
    history.back();
  } else {
    navigateTo('index.html');
  }
}

function switchTab(tabElement, panelId) {
  var tabs = tabElement.parentElement.querySelectorAll('.tab');
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
  });
  tabElement.classList.add('active');
  
  var panels = document.querySelectorAll('.panel');
  panels.forEach(function(panel) {
    panel.classList.remove('active');
  });
  var targetPanel = document.getElementById(panelId);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
}

function switchVideoSource(source) {
  var pills = document.querySelectorAll('.toggle-pill');
  pills.forEach(function(pill) {
    pill.classList.remove('active');
  });
  
  var sourceText = '';
  if (source === 'official') {
    pills[0].classList.add('active');
    sourceText = '官方教材视频';
  } else {
    pills[1].classList.add('active');
    sourceText = '用户上传视频';
  }
  
  var sourceSpan = document.querySelector('.src-row b');
  if (sourceSpan) {
    sourceSpan.textContent = sourceText;
  }
}

function openSourceModal() {
  var modal = document.getElementById('source-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function switchToUserVideo(userName) {
  closeModal('source-modal');
  switchVideoSource('user');
  
  var sourceSpan = document.querySelector('.src-row b');
  if (sourceSpan) {
    sourceSpan.textContent = '@' + userName;
  }
  
  var caption = document.querySelector('.caption-line');
  if (caption) {
    caption.textContent = userName + '上传的记忆视频——沉默的螺旋快速记忆法...';
  }
}

// ===== V5.1 名词详情页：七厂商 AI 模型弹窗 =====
var aiModalSelectedKey = null;
var aiChatAbort = null;

function openAiModal() {
  var modal = document.getElementById('ai-modal');
  if (!modal) return;

  // 回填画质 / 详略
  var formSelects = modal.querySelectorAll('.form-select');
  if (formSelects[0]) formSelects[0].value = localStorage.getItem('videoQuality') || '标准';
  if (formSelects[1]) formSelects[1].value = localStorage.getItem('detailLevel') || '标准';

  // 当前选中厂商（默认上次选择，否则 deepseek）
  aiModalSelectedKey = localStorage.getItem('aiModel') || 'deepseek';
  if (!AiService.isModelSupported(aiModalSelectedKey)) aiModalSelectedKey = 'deepseek';

  renderAiProviderList();
  fillAiConfigPanel();
  modal.style.display = 'flex';
}

// 渲染 7 家可点选厂商，徽标如实反映配置状态（绝不出现"待接入"）
function renderAiProviderList() {
  var box = document.getElementById('ai-provider-list');
  if (!box) return;
  var keys = AiService.providerKeys;
  var html = '';
  keys.forEach(function (key) {
    var p = AiService.getProvider(key);
    var configured = AiService.isConfigured(key);
    var badge, badgeColor;
    if (configured) { badge = '已配置'; badgeColor = '#1e7d4f'; }
    else if (p.builtin) { badge = '待填 Key'; badgeColor = '#a87b1f'; }
    else { badge = '需自行配置'; badgeColor = '#8a8f99'; }
    var active = key === aiModalSelectedKey;
    html += '<div class="ai-provider-item" data-model="' + key + '" onclick="selectAiModel(\'' + key + '\')" ' +
      'style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;margin-bottom:8px;' +
      'border:1px solid ' + (active ? 'var(--primary,#8C4A3C)' : 'var(--paper-line,#e6e1d6)') + ';' +
      'border-radius:10px;cursor:pointer;background:' + (active ? '#f2f5fa' : 'var(--paper,#fff)') + ';' +
      'transition:border-color .15s,background .15s,transform .12s;" ' +
      'onmousedown="this.style.transform=\'scale(0.98)\'" onmouseup="this.style.transform=\'scale(1)\'" onmouseleave="this.style.transform=\'scale(1)\'">' +
      '<div>' +
        '<div style="font-weight:600;font-size:14px;color:var(--ink,#222);">' + escapeHtml(p.label) + '</div>' +
        '<div style="font-size:11px;margin-top:2px;color:' + badgeColor + ';font-weight:600;">' + badge + '</div>' +
      '</div>' +
      '<div class="check" style="font-size:16px;color:var(--primary,#8C4A3C);font-weight:700;">' + (active ? '✓' : '') + '</div>' +
    '</div>';
  });
  box.innerHTML = html;
}

// 回填当前厂商的接口地址 / 模型名 / Key
function fillAiConfigPanel() {
  var p = AiService.getProvider(aiModalSelectedKey);
  if (!p) return;
  var label = document.getElementById('ai-cfg-label');
  var hint = document.getElementById('ai-cfg-hint');
  var ep = document.getElementById('ai-endpoint-input');
  var md = document.getElementById('ai-model-input');
  var ky = document.getElementById('ai-key-input');
  if (label) label.textContent = '接口配置 · ' + p.label;
  if (hint) hint.textContent = p.hint || '';
  if (ep) {
    ep.value = p.endpoint || '';
    // DeepSeek 内置官方地址，不允许在名词详情里改（避免误填导致不可用）
    ep.disabled = !!p.builtin;
    ep.style.background = p.builtin ? '#f1efe9' : '#fff';
  }
  if (md) {
    md.value = p.model || '';
    md.disabled = !!p.builtin;
    md.style.background = p.builtin ? '#f1efe9' : '#fff';
  }
  if (ky) ky.value = p.keyVal || '';
}

function selectAiModel(key) {
  if (!AiService.isModelSupported(key)) return;
  aiModalSelectedKey = key;
  renderAiProviderList();
  fillAiConfigPanel();
}

function saveAiSettings() {
  var key = aiModalSelectedKey || 'deepseek';
  var p = AiService.getProvider(key);
  var epEl = document.getElementById('ai-endpoint-input');
  var mdEl = document.getElementById('ai-model-input');
  var kyEl = document.getElementById('ai-key-input');

  var endpoint = epEl ? epEl.value.trim() : '';
  var model = mdEl ? mdEl.value.trim() : '';
  var keyVal = kyEl ? kyEl.value.trim() : '';

  // 画质 / 详略落库
  var formSelects = document.querySelectorAll('#ai-modal .form-select');
  localStorage.setItem('videoQuality', formSelects[0] ? formSelects[0].value : '标准');
  localStorage.setItem('detailLevel', formSelects[1] ? formSelects[1].value : '标准');

  if (p.builtin) {
    // DeepSeek：内置 endpoint/model，只存 Key（沿用 apiKey 字段）
    localStorage.setItem('apiKey', keyVal);
  } else {
    // 其余厂商：endpoint/model/key 存独立配置
    AiService.saveProviderConfig(key, { endpoint: endpoint, model: model, key: keyVal });
  }

  localStorage.setItem('aiModel', key);
  localStorage.setItem('aiModelName', p.label);

  // 同步设置页 AI 行文案
  updateSettingsRowValSafe('openAiModelSetting()', p.label + ' ›');

  closeModal('ai-modal');

  if (AiService.isConfigured(key)) {
    showConfirm('AI设置', '已保存并启用「' + p.label + '」，现在可以使用 AI 助记了。', 'success');
  } else if (p.builtin) {
    showConfirm('AI设置', '已选择「' + p.label + '」，但还未填写 API Key，暂不能调用。', 'warning');
  } else {
    showConfirm('AI设置', '已选择「' + p.label + '」，但接口地址或 API Key 未填写完整，暂不能调用。', 'warning');
  }
}

// 设置页可能尚未渲染对应行，做安全更新
function updateSettingsRowValSafe(onclickAttr, val) {
  try {
    if (typeof updateSettingsRowVal === 'function') updateSettingsRowVal(onclickAttr, val);
  } catch (e) {}
}

function openAiAssistModal() {
  var modal = document.getElementById('ai-assist-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function useTemplate(type) {
  // V5.0：模板预填随当前词条动态化（原为硬编码"沉默的螺旋"）
  var templates = {
    'memory-method': '针对"' + currentTerm + '"这个概念，有什么好的背诵技巧或记忆口诀吗？',
    'real-example': '能举一个现实生活中关于"' + currentTerm + '"的实例来帮助理解吗？',
    'compare': '"' + currentTerm + '"与相近概念（如"第三人效应"或"多元无知"）有什么核心区别？',
    'exam-tip': '在考研考试中，"' + currentTerm + '"通常以什么形式考查？有哪些高频考点？'
  };
  
  var input = document.getElementById('ai-assist-input');
  if (input && templates[type]) {
    input.value = templates[type];
  }
}

// ===== V5.1 AI 助记：真实调用大模型（未配置零请求拦截） =====
var aiLoadingEl = null;
function showAiLoading(modelLabel) {
  hideAiLoading();
  var el = document.createElement('div');
  el.id = 'ai-loading-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:9999;';
  el.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:22px 24px;width:min(78vw,300px);text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.2);">' +
      '<div style="width:34px;height:34px;border:3px solid #e0e0e0;border-top-color:#8C4A3C;border-radius:50%;margin:0 auto 12px;animation:aiSpin .8s linear infinite;"></div>' +
      '<div style="font-size:14px;font-weight:600;color:#222;">AI 思考中…</div>' +
      '<div style="font-size:12px;color:#8a8f99;margin-top:4px;">' + escapeHtml(modelLabel || '') + '</div>' +
    '</div>';
  document.body.appendChild(el);
  if (!document.getElementById('ai-spin-style')) {
    var st = document.createElement('style');
    st.id = 'ai-spin-style';
    st.textContent = '@keyframes aiSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  }
  aiLoadingEl = el;
}
function hideAiLoading() {
  if (aiLoadingEl && aiLoadingEl.parentNode) aiLoadingEl.parentNode.removeChild(aiLoadingEl);
  aiLoadingEl = null;
}

function submitAiAssist() {
  var input = document.getElementById('ai-assist-input');
  var question = input ? input.value.trim() : '';
  if (!question) {
    showConfirm('提示', '请输入您的问题或选择一个模板', 'warning');
    return;
  }

  var modelKey = localStorage.getItem('aiModel') || 'deepseek';
  if (!AiService.isModelSupported(modelKey)) modelKey = 'deepseek';
  var provider = AiService.getProvider(modelKey);

  // 未配置：不发任何网络请求，明确拦截并引导去配置
  if (!AiService.isConfigured(modelKey)) {
    var msg = provider.builtin
      ? '当前模型「' + provider.label + '」还未配置 API Key。是否现在去配置？'
      : '模型「' + provider.label + '」尚未配置：需要填写接口地址（URL）和 API Key。是否现在去配置？';
    showConfirm('AI 未配置', msg, 'warning', function () { openAiModal(); }, null, true);
    return;
  }

  closeModal('ai-assist-modal');

  var detailLevel = localStorage.getItem('detailLevel') || '标准';
  var lenHint = detailLevel === '简洁' ? '回答尽量精炼（200字内）'
    : detailLevel === '详细' ? '回答详尽、分点展开，可适当举例'
    : '回答结构清晰、分点说明（400字左右）';
  var systemPrompt = '你是新闻传播学考研的助教，请围绕词条「' + currentTerm +
    '」帮助学生理解与记忆。要求：专业准确、贴合考研答题、用中文、' + lenHint + '。';

  showAiLoading(provider.label);

  var controller = new AbortController();
  aiChatAbort = controller;

  AiService.chat({
    modelKey: modelKey,
    signal: controller.signal,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ]
  }).then(function (answer) {
    hideAiLoading();
    aiChatAbort = null;
    var html = escapeHtml(answer).replace(/\n/g, '<br>');
    var modelName = localStorage.getItem('aiModelName') || provider.label;
    showConfirm('AI助记 · ' + modelName, html, 'info');
  }).catch(function (err) {
    hideAiLoading();
    aiChatAbort = null;
    var friendly = AiService.friendlyError(err);
    var needConfig = err && (err.code === 'NO_KEY' || err.code === 'NOT_CONFIGURED');
    showConfirm('AI助记失败', friendly, 'error', needConfig ? function () { openAiModal(); } : null, null, needConfig);
  });
}

function openPostModal() {
  var modal = document.getElementById('post-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function openUploadModal() {
  var modal = document.getElementById('upload-modal');
  if (modal) {
    modal.style.display = 'flex';
    var fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.onchange = function(e) {
        var file = e.target.files[0];
        if (file) {
          var uploadArea = modal.querySelector('.upload-area');
          if (uploadArea) {
            uploadArea.querySelector('.upload-text').textContent = file.name;
            uploadArea.querySelector('.upload-hint').textContent = (file.size / 1024).toFixed(1) + ' KB';
          }
        }
      };
    }
  }
}

// ===== V5.1 学生端资料解析：PDF / Word 动态加载真实解析库 =====
var PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
var PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
var MAMMOTH_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

function loadExternalLib(globalName, src) {
  return new Promise(function (resolve, reject) {
    if (window[globalName]) { resolve(window[globalName]); return; }
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function () {
      if (window[globalName]) resolve(window[globalName]);
      else reject(new Error('lib loaded but global missing'));
    };
    s.onerror = function () { reject(new Error('network')); };
    document.head.appendChild(s);
  });
}

function extractPdfText(file) {
  return loadExternalLib('pdfjsLib', PDFJS_CDN).then(function (pdfjsLib) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
    } catch (e) { /* fake worker 兜底 */ }
    return file.arrayBuffer().then(function (buf) {
      return pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    }).then(function (pdf) {
      var pages = [];
      for (var p = 1; p <= pdf.numPages; p++) pages.push(p);
      return pages.reduce(function (chain, pageNum) {
        return chain.then(function (all) {
          return pdf.getPage(pageNum).then(function (page) {
            return page.getTextContent();
          }).then(function (content) {
            all.push(content.items.map(function (it) { return it.str; }).join('\n'));
            return all;
          });
        });
      }, Promise.resolve([])).then(function (pageTexts) {
        return pageTexts.join('\n\n');
      });
    });
  });
}

function extractWordText(file) {
  return loadExternalLib('mammoth', MAMMOTH_CDN).then(function (mammoth) {
    return file.arrayBuffer().then(function (buf) {
      return mammoth.extractRawText({ arrayBuffer: buf });
    }).then(function (result) {
      return result.value || '';
    });
  });
}

function saveKnowledgeMaterial(title, book, file, content) {
  var materials = safeParseStorage('xc_materials', []);
  var material = {
    id: Date.now(),
    title: title,
    sourceType: book,
    fileType: file.name.split('.').pop().toUpperCase(),
    wordCount: content.length,
    chapterInfo: '-',
    parseStatus: 'done',
    uploadedBy: 'user',
    createdAt: new Date().toLocaleString('zh-CN'),
    fileContent: content
  };
  materials.push(material);
  // 配额保护：写入失败（空间满/隐私模式）明确告知，绝不假装成功
  if (!safeSetStorage('xc_materials', JSON.stringify(materials))) {
    return false;
  }
  renderUploadedMaterials();
  return true;
}

function handleKnowledgeUpload() {
  var modal = document.getElementById('upload-modal');
  var fileInput = document.getElementById('file-input');
  var titleInput = modal.querySelector('.form-input[type="text"]');
  var select = modal.querySelector('.form-select');
  var saveBtn = modal.querySelector('.save-btn');

  var title = titleInput ? titleInput.value.trim() : '';
  var book = select ? select.value : '';

  if (!title) {
    showConfirm('提示', '请输入资料名称', 'warning');
    return;
  }
  if (!fileInput || !fileInput.files[0]) {
    showConfirm('提示', '请选择文件', 'warning');
    return;
  }

  var file = fileInput.files[0];
  var ext = (file.name.split('.').pop() || '').toLowerCase();
  var originalBtnText = saveBtn ? saveBtn.textContent : '';
  if (saveBtn) { saveBtn.textContent = '解析中...'; saveBtn.disabled = true; }

  function restoreBtn() {
    if (saveBtn) { saveBtn.textContent = originalBtnText; saveBtn.disabled = false; }
  }
  function fail(msg) {
    restoreBtn();
    showConfirm('解析失败', msg, 'warning');
  }
  function finish(content) {
    // V5.1：空文本视为解析失败（常见于纯扫描图片 PDF），不得提示成功
    if (!content || !content.replace(/\s/g, '')) {
      fail('未能从文件中提取到文字（该 PDF 可能是扫描图片版），请改用含可选中文本的文件或 TXT/Word。');
      return;
    }
    var ok = saveKnowledgeMaterial(title, book, file, content);
    restoreBtn();
    if (!ok) {
      showConfirm('存储空间不足', '本地存储空间已满，资料未保存。请先在「我的收藏/笔记」中清理部分内容后重试。', 'warning');
      return;
    }
    closeModal('upload-modal');
    showConfirm('上传成功', '资料已解析并保存到「' + book + '」分类（共 ' + content.length + ' 字）', 'success');
    if (titleInput) titleInput.value = '';
    if (fileInput) fileInput.value = '';
  }

  if (ext === 'txt') {
    var reader = new FileReader();
    reader.onload = function (e) { finish(e.target.result); };
    reader.onerror = function () { fail('文件读取失败，请重试。'); };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'pdf') {
    extractPdfText(file).then(finish).catch(function (err) {
      console.error('PDF 解析失败：', err);
      fail('PDF 解析失败：文件可能已损坏/加密，或当前网络无法加载解析组件。请联网后重试，或改用 TXT/Word。');
    });
  } else if (ext === 'doc' || ext === 'docx') {
    if (ext === 'doc') {
      fail('暂不支持旧版 .doc 格式，请用 Word 另存为 .docx 后再上传。');
      return;
    }
    extractWordText(file).then(finish).catch(function (err) {
      console.error('Word 解析失败：', err);
      fail('Word 解析失败：文件可能已损坏，或当前网络无法加载解析组件。请联网后重试，或改用 TXT/PDF。');
    });
  } else {
    restoreBtn();
    showConfirm('提示', '仅支持 TXT、PDF、DOCX 格式文件', 'warning');
  }
}

function renderUploadedMaterials() {
  var materials = safeParseStorage('xc_materials', []);
  if (materials.length === 0) return;

  var existingIds = {};
  document.querySelectorAll('.lib-row[data-material-id]').forEach(function(row) {
    existingIds[row.getAttribute('data-material-id')] = true;
  });

  materials.forEach(function(mat) {
    if (existingIds[mat.id]) return;

    var targetGroup = null;
    var groups = document.querySelectorAll('[data-book-group]');
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].getAttribute('data-book-group') === mat.sourceType ||
          groups[i].getAttribute('data-book-group').indexOf(mat.sourceType) >= 0) {
        targetGroup = groups[i];
        break;
      }
    }

    if (!targetGroup) {
      targetGroup = document.querySelector('[data-book-group="传播学原理"]') ||
                    document.querySelector('[data-book-group]');
    }

    if (targetGroup) {
      var row = document.createElement('div');
      row.className = 'lib-row uploaded-material';
      row.setAttribute('data-material-id', mat.id);
      row.setAttribute('data-source-type', mat.sourceType);
      row.setAttribute('draggable', 'true');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--paper);border:1px solid var(--seal);border-radius:var(--radius);margin-bottom:6px;cursor:pointer;position:relative;';
      row.innerHTML = '<span>' + escapeHtml(mat.title) + '</span><span class="tag" style="background:var(--seal);color:#fff;">' + escapeHtml(mat.sourceType) + '</span>';

      row.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', mat.id.toString());
        e.dataTransfer.effectAllowed = 'move';
        row.style.opacity = '0.5';
      });
      row.addEventListener('dragend', function() {
        row.style.opacity = '1';
      });

      targetGroup.appendChild(row);
    }
  });

  initMaterialDragToFolder();
}

// ===== V5.1 知识库列表与题库同步数据对齐 =====
// knowledge.html 的名词/简答/论述行原为写死的静态 HTML，后台发布的新题不显示、
// 下架的题入口残留。页面加载时依据 XCSync 合并后的 nounData/shortData/essayData 校正：
// 1) 给静态题行打 data-kb-type/data-kb-id 标记；2) 删除数据中已不存在（下架/删除）的行；
// 3) 追加数据中存在但列表缺失的题（含后台新发布题）；4) 移除变空的分组。
function knowledgeCollectNoun() {
  if (typeof nounData !== 'object' || nounData === null) return [];
  return Object.keys(nounData).map(function(title) {
    var item = nounData[title];
    return {
      id: title,
      title: item.title || title,
      category: item.category || '传播学原理',
      tag: item.tag || '新增',
      url: 'noun-detail.html?term=' + encodeURIComponent(title)
    };
  });
}

function knowledgeCollectArray(storeName, page, idKey) {
  var store = window[storeName];
  if (!store || !Array.isArray(store.items)) return [];
  return store.items.map(function(item) {
    // 修复：题目数据的标识字段是 item.id（不是 item[idKey]）；idKey 仅用于拼 URL 参数名（short/essay）
    var id = item.id;
    return {
      id: id,
      title: item.title || id,
      category: item.category || '传播学原理',
      tag: item.tag || '新增',
      url: page + '?' + idKey + '=' + encodeURIComponent(id)
    };
  });
}

function parseKnowledgeRowTarget(row) {
  var oc = row.getAttribute('onclick') || '';
  var m = oc.match(/'(noun-detail|short-detail|essay-detail)\.html\?(term|short|essay)=([^']+)'/);
  if (!m) return null;
  var type = m[1] === 'noun-detail' ? 'noun' : (m[1] === 'short-detail' ? 'short' : 'essay');
  var id;
  try { id = decodeURIComponent(m[3]); } catch (e) { id = m[3]; }
  return { type: type, id: id };
}

function knowledgeTypeLabel(type) {
  return { noun: '名词解释', short: '简答题', essay: '论述题' }[type] || '题目';
}

function findKnowledgeGroup(type, category) {
  var groups = document.querySelectorAll('[data-book-group]');
  var sameCat = null, sameType = null;
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var rows = g.querySelectorAll('.lib-row[data-kb-type]');
    var typeMatch = false;
    for (var j = 0; j < rows.length; j++) {
      if (rows[j].getAttribute('data-kb-type') === type) { typeMatch = true; break; }
    }
    if (!typeMatch) continue;
    if (g.getAttribute('data-book-group') === category) { sameCat = g; break; }
    if (!sameType) sameType = g;
  }
  return sameCat || sameType;
}

function createKnowledgeGroup(type, category) {
  var appBody = document.querySelector('.app-body');
  if (!appBody) return null;
  var wrapper = document.createElement('div');
  wrapper.setAttribute('data-book-group', category);
  wrapper.setAttribute('data-kb-dynamic', type);
  var head = document.createElement('div');
  head.className = 'lib-group';
  head.style.marginTop = '10px';
  head.textContent = category + ' · ' + knowledgeTypeLabel(type) + '（后台同步）';
  wrapper.appendChild(head);
  appBody.appendChild(wrapper);
  return wrapper;
}

function createKnowledgeRow(type, item) {
  var row = document.createElement('div');
  row.className = 'lib-row';
  row.setAttribute('data-type', type);
  row.setAttribute('data-book', item.category);
  row.setAttribute('data-kb-type', type);
  row.setAttribute('data-kb-id', item.id);
  var name = document.createElement('span');
  name.textContent = item.title;
  var tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = item.tag;
  row.appendChild(name);
  row.appendChild(tag);
  row.addEventListener('click', function() { navigateTo(item.url); });
  return row;
}

function renderKnowledgeDynamicRows() {
  if (!document.querySelector('.lib-row')) return;

  var sources = {
    noun: knowledgeCollectNoun(),
    short: knowledgeCollectArray('shortData', 'short-detail.html', 'short'),
    essay: knowledgeCollectArray('essayData', 'essay-detail.html', 'essay')
  };

  // 1) 标记静态题行，并删除数据中已不存在的行（下架/删除）
  var rows = document.querySelectorAll('.lib-row[data-type]');
  Array.prototype.forEach.call(rows, function(row) {
    var target = parseKnowledgeRowTarget(row);
    if (!target) return; // 非题目行（如用户上传资料行）不动
    row.setAttribute('data-kb-type', target.type);
    row.setAttribute('data-kb-id', target.id);
    var exists = sources[target.type].some(function(it) { return String(it.id) === String(target.id); });
    if (!exists) row.remove();
  });

  // 2) 清理没有任何题行/资料行的空分组
  var groups = document.querySelectorAll('[data-book-group]');
  Array.prototype.forEach.call(groups, function(g) {
    if (!g.querySelector('.lib-row')) g.remove();
  });

  // 3) 追加数据中存在但列表缺失的题
  Object.keys(sources).forEach(function(type) {
    sources[type].forEach(function(item) {
      var selector = '.lib-row[data-kb-type="' + type + '"][data-kb-id="' + String(item.id).replace(/"/g, '\\"') + '"]';
      if (document.querySelector(selector)) return;
      var group = findKnowledgeGroup(type, item.category) || createKnowledgeGroup(type, item.category);
      if (group) group.appendChild(createKnowledgeRow(type, item));
    });
  });
}

function initMaterialDragToFolder() {
  var chips = document.querySelectorAll('.textbook-chip');
  chips.forEach(function(chip) {
    chip.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      chip.style.background = 'var(--seal)';
      chip.style.color = '#fff';
    });
    chip.addEventListener('dragleave', function() {
      chip.style.background = '';
      chip.style.color = '';
    });
    chip.addEventListener('drop', function(e) {
      e.preventDefault();
      chip.style.background = '';
      chip.style.color = '';
      var materialId = e.dataTransfer.getData('text/plain');
      if (!materialId) return;

      var onclickAttr = chip.getAttribute('onclick') || '';
      var match = onclickAttr.match(/filterByBook\('([^']+)'\)/);
      if (!match) return;
      var newBook = match[1];
      if (newBook === 'all') return;

      var materials = safeParseStorage('xc_materials', []);
      var material = materials.find(function(m) { return m.id == materialId; });
      if (!material) return;

      material.sourceType = newBook;
      localStorage.setItem('xc_materials', JSON.stringify(materials));

      var row = document.querySelector('.lib-row[data-material-id="' + materialId + '"]');
      if (row) {
        var targetGroup = null;
        var groups = document.querySelectorAll('[data-book-group]');
        for (var i = 0; i < groups.length; i++) {
          if (groups[i].getAttribute('data-book-group') === newBook) {
            targetGroup = groups[i];
            break;
          }
        }
        if (targetGroup) {
          targetGroup.appendChild(row);
          var tag = row.querySelector('.tag');
          if (tag) tag.textContent = newBook;
        }
      }

      showConfirm('分类成功', '资料已移至「' + newBook + '」', 'success');
    });
  });
}

function closeModal(modalId) {
  var modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

function showConfirm(title, message, type, onConfirm, onCancel, showCancel) {
  var overlay = document.getElementById('confirm-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-modal-overlay';
    overlay.className = 'confirm-modal-overlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
  }
  
  var icons = {
    info: 'ℹ',
    success: '✓',
    error: '✕',
    warning: '⚠'
  };
  
  var iconType = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
  var hasCancel = showCancel || onCancel;
  
  overlay.innerHTML = `
    <div class="confirm-modal" onclick="event.stopPropagation()">
      <div class="confirm-icon ${iconType}">${icons[type] || icons.info}</div>
      <div class="confirm-title">${title}</div>
      <div class="confirm-message">${message}</div>
      <div class="confirm-buttons">
        ${hasCancel ? '<div class="confirm-btn cancel" onclick="handleConfirmModal(false)">取消</div>' : ''}
        <div class="confirm-btn confirm" onclick="handleConfirmModal(true)">确定</div>
      </div>
    </div>
  `;
  
  window.confirmCallback = function(confirmed) {
    closeConfirmModal();
    if (confirmed && onConfirm) {
      onConfirm();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
  };
  
  overlay.style.display = 'flex';
}

function closeConfirmModal() {
  var overlay = document.getElementById('confirm-modal-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function handleConfirmModal(confirmed) {
  if (window.confirmCallback) {
    window.confirmCallback(confirmed);
  }
}

function fillBlank(element, answer) {
  element.textContent = answer;
  element.classList.add('filled');
}

function filterByType(type, evt) {
  var target = evt ? evt.target : (event ? event.srcElement : null);
  if (!target) return;
  var chips = document.querySelectorAll('.filter-chip');
  chips.forEach(function(chip) {
    chip.classList.remove('active');
  });
  target.classList.add('active');

  var rows = document.querySelectorAll('.lib-row');
  var groups = document.querySelectorAll('[data-book-group]');

  if (type === 'all') {
    rows.forEach(function(row) {
      row.style.display = 'flex';
    });
    groups.forEach(function(group) {
      group.style.display = 'block';
    });
  } else {
    rows.forEach(function(row) {
      var rowType = row.getAttribute('data-type') || 'noun';
      if (rowType === type) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
    groups.forEach(function(group) {
      var hasVisible = group.querySelector('.lib-row[style*="display: flex"], .lib-row:not([style])');
      if (hasVisible) {
        group.style.display = 'block';
      } else {
        group.style.display = 'none';
      }
    });
  }
}

function filterByBook(book, evt) {
  var target = evt ? evt.target : (event ? event.srcElement : null);
  if (!target) return;
  var chips = document.querySelectorAll('.textbook-chip');
  chips.forEach(function(chip) {
    chip.classList.remove('active');
  });
  target.classList.add('active');

  var rows = document.querySelectorAll('.lib-row');
  var groups = document.querySelectorAll('[data-book-group]');

  if (book === 'all') {
    rows.forEach(function(row) {
      row.style.display = 'flex';
    });
    groups.forEach(function(group) {
      group.style.display = 'block';
    });
  } else {
    rows.forEach(function(row) {
      var rowBook = row.getAttribute('data-book');
      if (rowBook === book) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });

    groups.forEach(function(group) {
      var hasVisibleRow = group.querySelector('.lib-row[style*="display: flex"]');
      if (hasVisibleRow) {
        group.style.display = 'block';
      } else {
        group.style.display = 'none';
      }
    });
  }
}

function filterCollection(type, evt) {
  var target = evt ? evt.target : (event ? event.srcElement : null);
  if (!target) return;
  var chips = document.querySelectorAll('.filter-chip');
  chips.forEach(function(chip) {
    chip.classList.remove('active');
  });

  target.classList.add('active');
  
  var rows = document.querySelectorAll('.lib-row[data-type]');
  var groups = document.querySelectorAll('[data-collection-group]');
  
  if (type === 'all') {
    rows.forEach(function(row) {
      var title = row.querySelector('span:first-child').textContent.toLowerCase();
      var tagEl = row.querySelector('.tag');
      var tag = tagEl ? tagEl.textContent.toLowerCase() : '';
      if (!currentSearchKeyword || title.indexOf(currentSearchKeyword) !== -1 || tag.indexOf(currentSearchKeyword) !== -1) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
  } else {
    rows.forEach(function(row) {
      var rowType = row.getAttribute('data-type');
      var title = row.querySelector('span:first-child').textContent.toLowerCase();
      var tagEl = row.querySelector('.tag');
      var tag = tagEl ? tagEl.textContent.toLowerCase() : '';
      
      var matchesType = (rowType === type);
      var matchesSearch = !currentSearchKeyword || title.indexOf(currentSearchKeyword) !== -1 || tag.indexOf(currentSearchKeyword) !== -1;
      
      if (matchesType && matchesSearch) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
  }
  
  groups.forEach(function(group) {
    var hasVisibleRow = false;
    var nextElement = group.nextElementSibling;
    while (nextElement && nextElement.classList.contains('lib-row')) {
      if (nextElement.style.display !== 'none') {
        hasVisibleRow = true;
        break;
      }
      nextElement = nextElement.nextElementSibling;
    }
    group.style.display = hasVisibleRow ? 'block' : 'none';
  });
}

var currentSearchKeyword = '';

function filterCollectionsBySearch(keyword) {
  currentSearchKeyword = keyword.toLowerCase().trim();
  var activeChip = document.querySelector('.filter-chip.active');
  var activeType = activeChip ? activeChip.getAttribute('onclick') : '';
  var filterType = 'all';
  
  if (activeType && activeType.indexOf("'") !== -1) {
    var match = activeType.match(/'([^']+)'/);
    if (match) filterType = match[1];
  }
  
  var rows = document.querySelectorAll('.lib-row[data-type]');
  var groups = document.querySelectorAll('[data-collection-group]');
  
  rows.forEach(function(row) {
    var rowType = row.getAttribute('data-type');
    var title = row.querySelector('span:first-child').textContent.toLowerCase();
    var tagEl = row.querySelector('.tag');
    var tag = tagEl ? tagEl.textContent.toLowerCase() : '';
    
    var matchesFilter = (filterType === 'all' || rowType === filterType);
    var matchesSearch = !currentSearchKeyword || 
                        title.indexOf(currentSearchKeyword) !== -1 || 
                        tag.indexOf(currentSearchKeyword) !== -1;
    
    if (matchesFilter && matchesSearch) {
      row.style.display = 'flex';
    } else {
      row.style.display = 'none';
    }
  });
  
  groups.forEach(function(group) {
    var hasVisibleRow = false;
    var nextElement = group.nextElementSibling;
    while (nextElement && nextElement.classList.contains('lib-row')) {
      if (nextElement.style.display !== 'none') {
        hasVisibleRow = true;
        break;
      }
      nextElement = nextElement.nextElementSibling;
    }
    group.style.display = hasVisibleRow ? 'block' : 'none';
  });
}

function switchLoginTab(type) {
  var tabs = document.querySelectorAll('.login-tab');
  var forms = document.querySelectorAll('.login-form');
  
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
  });
  
  forms.forEach(function(form) {
    form.style.display = 'none';
  });
  
  if (type === 'password') {
    tabs[0].classList.add('active');
    document.getElementById('password-login').style.display = 'block';
  } else {
    tabs[1].classList.add('active');
    document.getElementById('code-login').style.display = 'block';
  }
}

var codeCountdown = 0;
var codeTimer = null;

function sendCode() {
  var phone = document.getElementById('code-phone-input').value.trim();
  if (!phone || phone.length !== 11) {
    showConfirm('提示', '请输入正确的手机号', 'warning');
    return;
  }
  
  if (codeCountdown > 0) return;
  
  codeCountdown = 60;
  var btn = document.getElementById('send-code-btn');
  btn.disabled = true;
  btn.textContent = codeCountdown + 's';
  
  codeTimer = setInterval(function() {
    codeCountdown--;
    if (codeCountdown <= 0) {
      clearInterval(codeTimer);
      btn.disabled = false;
      btn.textContent = '获取验证码';
    } else {
      btn.textContent = codeCountdown + 's';
    }
  }, 1000);
  
  showConfirm('验证码', '验证码已发送（测试码：1234）', 'success');
}

function handleLogin() {
  var phone = document.getElementById('phone-input').value.trim();
  var password = document.getElementById('password-input').value.trim();
  var agreement = document.getElementById('agreement').checked;
  
  if (!agreement) {
    showConfirm('提示', '请先阅读并同意用户协议和隐私政策', 'warning');
    return;
  }
  
  if (!phone || phone.length !== 11) {
    showConfirm('提示', '请输入正确的手机号', 'warning');
    return;
  }
  
  if (!password || password.length < 6) {
    showConfirm('提示', '请输入至少6位密码', 'warning');
    return;
  }
  
  doLogin(phone, 'password');
}

function handleCodeLogin() {
  var phone = document.getElementById('code-phone-input').value.trim();
  var code = document.getElementById('code-input').value.trim();
  var agreement = document.getElementById('agreement').checked;
  
  if (!agreement) {
    showConfirm('提示', '请先阅读并同意用户协议和隐私政策', 'warning');
    return;
  }
  
  if (!phone || phone.length !== 11) {
    showConfirm('提示', '请输入正确的手机号', 'warning');
    return;
  }
  
  if (!code) {
    showConfirm('提示', '请输入验证码', 'warning');
    return;
  }
  
  if (code !== '1234') {
    showConfirm('提示', '验证码错误（测试码：1234）', 'error');
    return;
  }
  
  doLogin(phone, 'code');
}

function thirdPartyLogin(type) {
  var agreement = document.getElementById('agreement');
  if (agreement && !agreement.checked) {
    showConfirm('提示', '请先阅读并同意用户协议和隐私政策', 'warning');
    return;
  }
  
  var typeNames = {
    wechat: '微信',
    qq: 'QQ',
    weibo: '微博'
  };
  
  showConfirm('登录中', '正在跳转' + typeNames[type] + '授权页面...', 'info');
  
  setTimeout(function() {
    doLogin('用户' + Math.floor(Math.random() * 10000), type);
  }, 1500);
}

function doLogin(phone, type) {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('loginType', type);
  localStorage.setItem('userPhone', phone);
  ensureDefaultProfile();
  
  showConfirm('登录成功', '欢迎回来！', 'success', function() {
    navigateTo('index.html');
  });
}

function handleLogout() {
  showConfirm('退出登录', '确定要退出登录吗？', 'warning', 
    function() {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loginType');
      navigateTo('login.html');
    },
    null,
    true
  );
}

function initDragAndDrop() {
  var chipPools = document.querySelectorAll('.chip-pool');
  
  chipPools.forEach(function(pool) {
    var chips = pool.querySelectorAll('.chip');
    
    chips.forEach(function(chip) {
      chip.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', chip.textContent);
        chip.classList.add('dragging');
      });
      
      chip.addEventListener('dragend', function() {
        chip.classList.remove('dragging');
      });
      
      chip.addEventListener('dragover', function(e) {
        e.preventDefault();
      });
      
      chip.addEventListener('drop', function(e) {
        e.preventDefault();
        var draggedChip = document.querySelector('.dragging');
        if (draggedChip && draggedChip !== chip) {
          var parent = chip.parentElement;
          var children = Array.from(parent.children);
          var draggedIndex = children.indexOf(draggedChip);
          var targetIndex = children.indexOf(chip);
          
          if (draggedIndex < targetIndex) {
            parent.insertBefore(draggedChip, chip.nextSibling);
          } else {
            parent.insertBefore(draggedChip, chip);
          }
        }
      });
    });
    
    pool.addEventListener('dragover', function(e) {
      e.preventDefault();
    });
    
    pool.addEventListener('drop', function(e) {
      e.preventDefault();
    });
  });
}

var statusClickCount = 0;

function handleStatus(status) {
  if (status === 'yes') {
    statusClickCount++;
    var btn = document.getElementById('status-yes-btn');
    
    if (btn) {
      if (statusClickCount === 1) {
        switchTab(document.querySelector('.tab:nth-child(2)'), 'panel-text');
        btn.textContent = '已认识，下一个';
      } else {
        var nextTerms = ['编码解码模型', '议程设置', '知沟理论', '第三人效应'];
        var randomTerm = nextTerms[Math.floor(Math.random() * nextTerms.length)];
        navigateTo('noun-detail.html?term=' + randomTerm);
      }
    } else {
      showConfirm('学习记录', '已标记为"认识"，将进入复习队列', 'success');
    }
  } else {
    statusClickCount = 0;
    if (status === 'no') {
      showConfirm('学习记录', '已标记为"不会"，将在复习列表中重点呈现', 'error');
    } else if (status === 'blur') {
      showConfirm('学习记录', '已标记为"模糊"，稍后将进行复习', 'warning');
    }
  }

  // V5.0：自评/自测掌握度落库（wordRatings）；同一内容重复标记不重复计入已背数
  var firstRating = rateWord(status);
  if (status === 'yes' && firstRating) {
    bumpStat('masteredCount', 1);
  }
  markStudyDay();
}

function handleSearch(query) {
  var queryLower = query.toLowerCase().trim();
  
  if (!queryLower) {
    var rows = document.querySelectorAll('.lib-row');
    rows.forEach(function(row) {
      row.style.display = 'flex';
    });
    
    var groups = document.querySelectorAll('.lib-group');
    groups.forEach(function(group) {
      group.style.display = 'block';
    });
    
    var resultCount = document.getElementById('search-result-count');
    if (resultCount) {
      resultCount.classList.remove('show');
    }

    // V5.0：隐藏搜索空态
    var emptyEl = document.getElementById('search-empty-state');
    if (emptyEl) emptyEl.style.display = 'none';
    return;
  }
  
  var rows = document.querySelectorAll('.lib-row');
  var visibleRows = [];
  
  rows.forEach(function(row) {
    var title = row.querySelector('span:first-child').textContent.toLowerCase();
    var tag = row.querySelector('.tag') ? row.querySelector('.tag').textContent.toLowerCase() : '';
    
    var matchesTitle = title.includes(queryLower);
    var matchesTag = tag.includes(queryLower);
    var fuzzyMatch = false;
    
    if (!matchesTitle && !matchesTag) {
      var keywords = queryLower.split('');
      var titleChars = title.split('');
      var matchCount = 0;
      var lastIndex = -1;
      
      for (var i = 0; i < keywords.length; i++) {
        var idx = titleChars.indexOf(keywords[i], lastIndex + 1);
        if (idx !== -1) {
          matchCount++;
          lastIndex = idx;
        }
      }
      if (matchCount >= Math.ceil(keywords.length * 0.5)) {
        fuzzyMatch = true;
      }
    }
    
    if (matchesTitle || matchesTag || fuzzyMatch) {
      row.style.display = 'flex';
      visibleRows.push(row);
    } else {
      row.style.display = 'none';
    }
  });
  
  var groups = document.querySelectorAll('.lib-group');
  groups.forEach(function(group) {
    var hasVisibleRow = false;
    var nextElement = group.nextElementSibling;
    while (nextElement && nextElement.classList.contains('lib-row')) {
      if (nextElement.style.display !== 'none') {
        hasVisibleRow = true;
        break;
      }
      nextElement = nextElement.nextElementSibling;
    }
    group.style.display = hasVisibleRow ? 'block' : 'none';
  });
  
  var resultCount = document.getElementById('search-result-count');
  if (resultCount) {
    resultCount.textContent = '找到 ' + visibleRows.length + ' 个结果';
    resultCount.classList.add('show');
  }

  // V5.0：搜索无结果时展示空态
  var emptyEl = document.getElementById('search-empty-state');
  if (emptyEl) {
    emptyEl.style.display = visibleRows.length === 0 ? 'block' : 'none';
  }
}

function openVideoGenModal() {
  var modal = document.getElementById('video-gen-modal');
  if (!modal) return;
  var promptInput = document.getElementById('video-prompt');
  if (promptInput && currentTerm === '沉默的螺旋') {
    promptInput.value = '用动画讲解沉默的螺旋理论，重点突出诺依曼提出的孤立恐惧和意见气候概念，展示少数意见如何趋于沉默，多数意见如何愈发强势的螺旋过程';
  }
  renderVideoApiOptions();
  modal.style.display = 'flex';
}

// V5.1：动态填充视频生成 API 下拉，只列出用户已配置的视频 provider；
// 未配置任何 provider 时，下拉只放占位项并引导去设置。
function renderVideoApiOptions() {
  var sel = document.getElementById('video-api');
  var hint = document.getElementById('video-api-hint');
  if (!sel) return;
  sel.innerHTML = '';
  var selectedKey = localStorage.getItem('aiVideoProvider') || 'jimeng';
  var configuredKeys = (AiService.videoProviderKeys || []).filter(function (k) {
    return AiService.isVideoConfigured(k);
  });
  if (configuredKeys.length === 0) {
    sel.innerHTML = '<option value="">未配置任何视频生成 API</option>';
    if (hint) hint.innerHTML = '请先到「我的 → 设置 → AI模型自定义管理 → 视频生成 API」填写接口地址与 Key。<br><a href="settings.html#ai" style="color:var(--blue);">去配置 ›</a>';
    return;
  }
  configuredKeys.forEach(function (k) {
    var p = AiService.getVideoProvider(k);
    if (!p) return;
    var opt = document.createElement('option');
    opt.value = k;
    opt.textContent = p.label + ' · ' + (p.model || '默认模型');
    if (k === selectedKey) opt.selected = true;
    sel.appendChild(opt);
  });
  if (hint) hint.textContent = '已配置 ' + configuredKeys.length + ' 个视频 API。可在「设置」中继续添加。';
}

// V5.1：当前已生成的视频 URL（由 generateVideo 成功后写入；playVideo 真实播放）
var currentVideoUrl = null;
var videoAbortController = null;

function generateVideo() {
  var promptEl = document.getElementById('video-prompt');
  var apiSelect = document.getElementById('video-api');
  var durEl = document.getElementById('video-duration');
  var prompt = promptEl ? promptEl.value.trim() : '';
  var providerKey = apiSelect ? (apiSelect.value || '') : '';
  var duration = durEl ? parseInt(durEl.value, 10) || 5 : 5;

  if (!prompt) { alert('请输入视频内容描述'); return; }
  if (!providerKey || !AiService.isVideoConfigured(providerKey)) {
    alert('未配置可用的视频生成 API。请到「我的 → 设置 → 视频生成 API」填写接口地址与 Key 后再试。');
    return;
  }

  var btn = document.getElementById('video-gen-start-btn') || document.querySelector('#video-gen-modal .save-btn');
  var originalText = btn ? btn.textContent : '开始生成';
  if (btn) { btn.textContent = '提交任务中...'; btn.disabled = true; }

  if (videoAbortController) { try { videoAbortController.abort(); } catch (e) {} }
  videoAbortController = new AbortController();

  var attemptCount = 0;

  AiService.generateVideo({
    providerKey: providerKey,
    prompt: prompt,
    duration: duration,
    signal: videoAbortController.signal,
    onProgress: function (status, attempt) {
      attemptCount = attempt;
      if (btn) btn.textContent = '生成中... 已查询 ' + attempt + ' 次';
    }
  }).then(function (result) {
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
    closeModal('video-gen-modal');
    currentVideoUrl = result.videoUrl;
    try { localStorage.setItem('lastGeneratedVideoUrl', result.videoUrl); } catch (e) {}

    var videoGenBtn = document.getElementById('video-gen-btn');
    if (videoGenBtn) {
      videoGenBtn.textContent = '视频已就绪，点击播放 ▶';
      videoGenBtn.style.backgroundColor = '#1e7d4f';
    }
    var videoCaption = document.getElementById('video-caption');
    if (videoCaption) {
      videoCaption.textContent = '【AI生成】已生成「' + currentTerm + '」专属记忆视频，点击播放按钮观看。';
    }
    showConfirm('视频生成', '已为「' + currentTerm + '」生成专属记忆视频，现在可以点击播放按钮观看。', 'success');
  }).catch(function (err) {
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
    showConfirm('视频生成失败', AiService.friendlyError(err), 'error');
  });
}

var videoTimer = null;
var videoCurrentTime = 0;
var videoDuration = 5;
// V5.1：当前页面挂载的真实 <video> 元素（如有）
var liveVideoEl = null;

function playVideo() {
  var playBtn = document.getElementById('play-btn');
  var videoBox = document.getElementById('video-box');
  var progressBar = document.getElementById('video-progress-bar');
  var timeDisplay = document.getElementById('video-time');
  var placeholder = document.getElementById('video-placeholder');
  if (!playBtn || !videoBox) return;

  // 优先走真实 video URL 播放路径
  var videoUrl = currentVideoUrl;
  if (!videoUrl) {
    try { videoUrl = localStorage.getItem('lastGeneratedVideoUrl') || null; } catch (e) {}
  }

  if (videoUrl) {
    // 复用已挂载的 <video>；首次播放时挂载一个真实 video 元素到 video-box
    if (!liveVideoEl || !videoBox.contains(liveVideoEl)) {
      // 清掉旧的模拟 placeholder/bg
      videoBox.innerHTML = '';
      liveVideoEl = document.createElement('video');
      liveVideoEl.src = videoUrl;
      liveVideoEl.controls = true;
      liveVideoEl.playsInline = true;
      liveVideoEl.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;border-radius:10px;display:block;';
      videoBox.appendChild(liveVideoEl);
      // 真实进度/时长驱动 UI
      liveVideoEl.addEventListener('timeupdate', function () {
        videoCurrentTime = Math.floor(liveVideoEl.currentTime || 0);
        var dur = liveVideoEl.duration || 0;
        if (dur > 0) videoDuration = Math.floor(dur);
        if (progressBar) progressBar.style.width = (dur > 0 ? (videoCurrentTime / dur) * 100 : 0) + '%';
        if (timeDisplay) timeDisplay.textContent = formatTime(videoCurrentTime) + ' / ' + formatTime(videoDuration);
      });
      liveVideoEl.addEventListener('ended', function () {
        if (playBtn) playBtn.textContent = '▶';
        videoBox.classList.remove('playing');
      });
    }
    if (playBtn.textContent === '▶') {
      liveVideoEl.play().then(function () {
        playBtn.textContent = '⏸';
        videoBox.classList.add('playing');
      }).catch(function () {
        // 自动播放被阻止或地址不可访问——回退到原模拟流程
        runFakePlayback(playBtn, videoBox, progressBar, timeDisplay, placeholder);
      });
    } else {
      liveVideoEl.pause();
      playBtn.textContent = '▶';
      videoBox.classList.remove('playing');
    }
    return;
  }

  // 无真实 URL 时：保留原模拟播放，至少有视觉反馈
  runFakePlayback(playBtn, videoBox, progressBar, timeDisplay, placeholder);
}

function runFakePlayback(playBtn, videoBox, progressBar, timeDisplay, placeholder) {
  if (playBtn.textContent === '▶') {
    playBtn.textContent = '⏸';
    videoBox.classList.add('playing');
    if (placeholder) placeholder.style.display = 'none';
    if (videoTimer) clearInterval(videoTimer);
    videoTimer = setInterval(function () {
      videoCurrentTime++;
      var progress = (videoCurrentTime / videoDuration) * 100;
      if (progressBar) progressBar.style.width = progress + '%';
      if (timeDisplay) timeDisplay.textContent = formatTime(videoCurrentTime) + ' / ' + formatTime(videoDuration);
      if (videoCurrentTime >= videoDuration) stopVideo();
    }, 1000);
  } else {
    pauseVideo();
  }
}

function formatTime(sec) {
  var s = Math.max(0, Math.floor(sec || 0));
  var m = Math.floor(s / 60);
  var r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}

function seekVideo(event) {
  var progressBar = document.getElementById('video-progress-bar');
  var barBg = event.currentTarget;
  if (!progressBar || !barBg) return;

  var rect = barBg.getBoundingClientRect();
  var clickX = event.clientX - rect.left;
  var percent = clickX / rect.width;

  // 真实 video 优先
  if (liveVideoEl && liveVideoEl.duration) {
    liveVideoEl.currentTime = percent * liveVideoEl.duration;
    return;
  }

  videoCurrentTime = Math.floor(percent * videoDuration);
  progressBar.style.width = (videoCurrentTime / videoDuration * 100) + '%';

  var timeDisplay = document.getElementById('video-time');
  if (timeDisplay) {
    timeDisplay.textContent = formatTime(videoCurrentTime) + ' / ' + formatTime(videoDuration);
  }
}

function pauseVideo() {
  var playBtn = document.getElementById('play-btn');
  var videoBox = document.getElementById('video-box');
  // 真实 video 优先暂停
  if (liveVideoEl) { try { liveVideoEl.pause(); } catch (e) {} }
  if (playBtn && videoBox) {
    playBtn.textContent = '▶';
    videoBox.classList.remove('playing');
    if (videoTimer) {
      clearInterval(videoTimer);
      videoTimer = null;
    }
  }
}

function stopVideo() {
  pauseVideo();
  videoCurrentTime = 0;
  var progressBar = document.getElementById('video-progress-bar');
  var timeDisplay = document.getElementById('video-time');
  var placeholder = document.getElementById('video-placeholder');
  if (progressBar) progressBar.style.width = '0%';
  if (timeDisplay) timeDisplay.textContent = '00:00 / 00:05';
  if (placeholder) placeholder.style.display = 'block';
}

function openEditModal(type) {
  var modal = document.getElementById('edit-modal');
  var title = document.getElementById('edit-modal-title');
  var input = document.getElementById('edit-input');
  
  if (type === 'avatar') {
    title.textContent = '修改头像';
    input.placeholder = '请输入头像文字（1个字符）';
    input.dataset.type = 'avatar';
  } else if (type === 'nickname') {
    title.textContent = '修改昵称';
    input.placeholder = '请输入新昵称';
    input.dataset.type = 'nickname';
  }
  
  if (modal) {
    modal.style.display = 'flex';
  }
}

function saveEdit() {
  var input = document.getElementById('edit-input');
  var value = input.value.trim();
  
  if (!value) {
    alert('请输入内容');
    return;
  }
  
  var type = input.dataset.type;
  if (type === 'avatar') {
    if (value.length > 1) {
      alert('头像只能输入1个字符');
      return;
    }
    localStorage.setItem('userAvatar', value);
    var avatar = document.querySelector('.profile-avatar');
    if (avatar) avatar.textContent = value;
  } else if (type === 'nickname') {
    localStorage.setItem('userNickname', value);
    var names = document.querySelectorAll('.profile-name, .name');
    names.forEach(function(name) {
      name.textContent = value;
    });
  }
  
  closeModal('edit-modal');
  input.value = '';
}

// ===== V5.0 收藏全链路 =====
// 依据当前详情页推导收藏条目（类型/ID/标题/标签），用于写入 favorites
function getFavoriteEntry() {
  var page = (window.location.pathname.split('/').pop() || '').replace('.html', '');
  var typeMap = { 'noun-detail': 'noun', 'short-detail': 'short', 'essay-detail': 'essay' };
  var type = typeMap[page];
  if (!type) return null;
  var urlParams = new URLSearchParams(window.location.search);
  var id = urlParams.get('term') || urlParams.get('short') || urlParams.get('essay') || '';
  if (page === 'noun-detail' && !id && typeof currentTerm !== 'undefined' && currentTerm) {
    id = currentTerm;
  }
  if (!id) return null;
  var titleEl = document.getElementById('noun-title') || document.getElementById('short-title') || document.getElementById('essay-title');
  var tagEl = document.getElementById('noun-tag') || document.getElementById('short-tag') || document.getElementById('essay-tag');
  return {
    type: type,
    id: id,
    title: titleEl ? titleEl.textContent.trim() : id,
    tag: tagEl ? tagEl.textContent.trim() : '',
    ts: Date.now()
  };
}

// 详情页载入时回显收藏状态：已收藏的条目星标显示为实心
function initFavoriteStar() {
  var entry = getFavoriteEntry();
  if (!entry) return;
  var favs = safeParseStorage('favorites', []);
  var exists = favs.some(function(f) { return f.type === entry.type && f.id === entry.id; });
  if (exists) {
    var btn = document.querySelector('.icon-btn');
    if (btn && btn.textContent.trim() === '☆') {
      btn.textContent = '★';
      btn.style.color = 'var(--gold)';
    }
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 收藏页渲染真实收藏数据（沿用 lib-row / lib-group 既有样式，视觉不变）
function renderCollections() {
  var container = document.getElementById('collection-list');
  if (!container) return;
  var favs = safeParseStorage('favorites', []);
  var typeLabels = { noun: '名词解释', short: '简答题', essay: '论述题' };
  var order = ['noun', 'short', 'essay'];

  if (!favs.length) {
    // V5.1：恢复 V4.0 静态示例收藏内容（无真实收藏时展示，点击可进入详情）
    var demo = [
      { type: 'noun', title: '沉默的螺旋', tag: '高频', id: '沉默的螺旋' },
      { type: 'noun', title: '编码解码模型', tag: '高频', id: '编码解码模型' },
      { type: 'noun', title: '议程设置', tag: '重点', id: '议程设置' },
      { type: 'short', title: '霍尔编码解码模型', tag: '20分', id: 'short002' },
      { type: 'short', title: '知沟理论的内涵', tag: '15分', id: 'short003' },
      { type: 'essay', title: '媒介素养的内涵与演变', tag: '30分', id: 'essay001' },
      { type: 'essay', title: '网络舆论的形成机制', tag: '25分', id: 'essay002' }
    ];
    var demoHtml = '';
    var isFirst = true;
    order.forEach(function (type) {
      var dItems = demo.filter(function (d) { return d.type === type; });
      if (!dItems.length) return;
      demoHtml += '<div data-collection-group="' + type + '"><div class="lib-group"' + (isFirst ? '' : ' style="margin-top:10px;"') + '>' + typeLabels[type] + '</div>';
      dItems.forEach(function (d) {
        var dUrl;
        if (type === 'noun') dUrl = 'noun-detail.html?term=' + encodeURIComponent(d.id);
        else if (type === 'short') dUrl = 'short-detail.html?short=' + encodeURIComponent(d.id);
        else dUrl = 'essay-detail.html?essay=' + encodeURIComponent(d.id);
        demoHtml += '<div class="lib-row" data-type="' + type + '" onclick="navigateTo(\'' + dUrl + '\')">' +
          '<span>' + d.title + '</span><span class="tag">' + d.tag + '</span></div>';
      });
      demoHtml += '</div>';
      isFirst = false;
    });
    container.innerHTML = demoHtml;
    return;
  }

  var html = '';
  order.forEach(function(type) {
    var items = favs.filter(function(f) { return f.type === type; });
    if (!items.length) return;
    html += '<div data-collection-group="' + type + '"><div class="lib-group"' + (html ? ' style="margin-top:10px;"' : '') + '>' + typeLabels[type] + '</div></div>';
    items.forEach(function(f) {
      var url;
      if (f.type === 'noun') url = 'noun-detail.html?term=' + encodeURIComponent(f.id);
      else if (f.type === 'short') url = 'short-detail.html?short=' + encodeURIComponent(f.id);
      else url = 'essay-detail.html?essay=' + encodeURIComponent(f.id);
      html += '<div class="lib-row" data-type="' + f.type + '" onclick="navigateTo(\'' + url + '\')">' +
        '<span>' + escapeHtml(f.title) + '</span>' +
        (f.tag ? '<span class="tag">' + escapeHtml(f.tag) + '</span>' : '') +
        '<span style="margin-left:auto;color:var(--gold);cursor:pointer;font-size:15px;flex-shrink:0;" onclick="unfavoriteItem(event, \'' + f.type + '\', \'' + escapeHtml(f.id) + '\')">★</span>' +
        '</div>';
    });
  });
  container.innerHTML = html;

  // 渲染后按当前筛选片与搜索词恢复过滤状态（不改动既有筛选函数）
  var filterType = 'all';
  var activeChip = document.querySelector('.filter-chip.active');
  if (activeChip) {
    var m = (activeChip.getAttribute('onclick') || '').match(/filterCollection\('([^']+)'/);
    if (m) filterType = m[1];
  }
  container.querySelectorAll('.lib-row[data-type]').forEach(function(row) {
    var title = row.querySelector('span:first-child').textContent.toLowerCase();
    var tagEl = row.querySelector('.tag');
    var tag = tagEl ? tagEl.textContent.toLowerCase() : '';
    var ok = (filterType === 'all' || row.getAttribute('data-type') === filterType) &&
             (!currentSearchKeyword || title.indexOf(currentSearchKeyword) !== -1 || tag.indexOf(currentSearchKeyword) !== -1);
    row.style.display = ok ? 'flex' : 'none';
  });
  container.querySelectorAll('[data-collection-group]').forEach(function(group) {
    var hasVisibleRow = false;
    var nextElement = group.nextElementSibling;
    while (nextElement && nextElement.classList.contains('lib-row')) {
      if (nextElement.style.display !== 'none') { hasVisibleRow = true; break; }
      nextElement = nextElement.nextElementSibling;
    }
    group.style.display = hasVisibleRow ? 'block' : 'none';
  });
}

// 收藏页行内取消收藏：确认后移除并刷新列表
function unfavoriteItem(e, type, id) {
  if (e && e.stopPropagation) e.stopPropagation();
  showConfirm('取消收藏', '确定取消收藏该内容吗？', 'warning', function() {
    var favs = safeParseStorage('favorites', []);
    var before = favs.length;
    favs = favs.filter(function(f) { return !(f.type === type && f.id === id); });
    if (favs.length === before) return;
    localStorage.setItem('favorites', JSON.stringify(favs));
    bumpStat('favoriteCount', -1);
    renderCollections();
    showConfirm('收藏', '已取消收藏', 'info');
  });
}

function toggleFavorite(e) {
  var btn = e && e.target ? e.target : (event && event.srcElement ? event.srcElement : null);
  if (!btn) {
    btn = document.querySelector('.icon-btn');
  }
  if (!btn) return;
  var entry = getFavoriteEntry();
  var favs = safeParseStorage('favorites', []);
  var existIdx = entry ? favs.findIndex(function(f) { return f.type === entry.type && f.id === entry.id; }) : -1;

  if (btn.textContent.trim() === '☆') {
    btn.textContent = '★';
    btn.style.color = 'var(--gold)';
    if (entry && existIdx === -1) {
      favs.push(entry);
      localStorage.setItem('favorites', JSON.stringify(favs));
      bumpStat('favoriteCount', 1); // V5.0：收藏计数落库
    }
    markStudyDay();
    showConfirm('收藏', '已收藏该内容', 'success');
  } else {
    btn.textContent = '☆';
    btn.style.color = '';
    if (entry && existIdx !== -1) {
      favs.splice(existIdx, 1);
      localStorage.setItem('favorites', JSON.stringify(favs));
      bumpStat('favoriteCount', -1); // V5.0：取消收藏同步递减
    }
    showConfirm('收藏', '已取消收藏', 'info');
  }
}

function openNoteModal() {
  var modal = document.getElementById('note-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function saveNote() {
  var textarea = document.getElementById('note-text');
  if (!textarea) return;
  var content = textarea.value.trim();
  
  if (!content) {
    alert('请输入笔记内容');
    return;
  }
  
  var notes = safeParseStorage('notes', []);
  notes.push({
    content: content,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('notes', JSON.stringify(notes));
  bumpStat('noteCount', 1); // V5.0：笔记计数落库
  markStudyDay();
  
  closeModal('note-modal');
  textarea.value = '';
  showConfirm('笔记', '笔记已保存', 'success');
}

function publishPost() {
  var textarea = document.querySelector('#post-modal textarea');
  var content = textarea.value.trim();
  
  if (!content) {
    alert('请输入分享内容');
    return;
  }
  
  var posts = safeParseStorage('posts', []);
  posts.unshift({
    user: '我',
    avatar: '我',
    content: content,
    time: '刚刚',
    likes: 0,
    comments: 0
  });
  localStorage.setItem('posts', JSON.stringify(posts));
  
  closeModal('post-modal');
  textarea.value = '';
  
  renderPosts();
}

function renderPosts() {
  var posts = safeParseStorage('posts', []);
  var container = document.querySelector('.community-section');
  
  if (!container) return;
  
  posts.forEach(function(post) {
    var postDiv = document.createElement('div');
    postDiv.className = 'community-post';
    postDiv.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${post.avatar}</div>
        <div>
          <div class="post-user">${post.user}</div>
          <div class="post-time">${post.time}</div>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      <div class="post-actions">
        <span class="post-action">👍 ${post.likes}</span>
        <span class="post-action">💬 ${post.comments}</span>
      </div>
    `;
    
    var addBtn = container.querySelector('.add-post-btn');
    container.insertBefore(postDiv, addBtn);
  });
}

function switchSelfTestMode(mode) {
  var panels = document.querySelectorAll('.selftest-panel');
  panels.forEach(function(panel) {
    panel.style.display = 'none';
  });
  
  var activeBtn = document.querySelector('.selftest-btn.active');
  if (activeBtn) activeBtn.classList.remove('active');
  
  var targetBtn = document.querySelector('.selftest-btn[onclick*="' + mode + '"]');
  if (targetBtn) targetBtn.classList.add('active');
  
  var targetPanel = document.getElementById('selftest-' + mode);
  if (targetPanel) {
    targetPanel.style.display = 'block';
  }
}

function toggleRedFilm(element) {
  element.classList.toggle('revealed');
}

function toggleFlashcard(element) {
  var hiddenDiv = element.querySelector('.flashcard-answer-hidden');
  if (hiddenDiv) {
    hiddenDiv.remove();
    var answerText = '';

    if (element.id === 'short-flashcard-answer') {
      var short = getCurrentShort();
      if (short) {
        var flashData = short.selfTest && short.selfTest.flashcard;
        answerText = flashData ? flashData.answer : short.answer;
      }
    } else if (element.id === 'essay-flashcard-answer') {
      var essay = getCurrentEssay();
      if (essay) {
        var flashData = essay.selfTest && essay.selfTest.flashcard;
        answerText = flashData ? flashData.answer : essay.answer;
      }
    }

    element.innerHTML = '<div style="font-size:12px;line-height:1.6;color:var(--ink);">' + answerText + '</div>';
  }
}

function showFrameworkAnswer() {
  var answer = document.querySelector('.framework-answer');
  if (answer) {
    answer.classList.add('show');
  }
}

function completeSelfTest() {
  markStudyDay(); // V5.0：完成自测计入学习天数
  var modal = document.getElementById('complete-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

var ttsUtterance = null;
var ttsPlaying = false;

var currentTerm = '沉默的螺旋';

// V5.1：词条/题目已下架或不存在时，明确展示空态并引导返回，禁止回落到默认词条造成"串题"
function showDetailNotFound(descText) {
  var body = document.querySelector('.app-body');
  if (body) {
    body.innerHTML = '<div style="padding:72px 24px;text-align:center;">' +
      '<div style="font-size:44px;margin-bottom:16px;line-height:1;">📭</div>' +
      '<div style="font-size:17px;font-weight:600;margin-bottom:8px;">内容不存在或已下架</div>' +
      '<div style="font-size:13px;color:var(--ink-light);margin-bottom:28px;word-break:break-all;">' + escapeHtml(descText || '') + '</div>' +
      '<button class="save-btn" type="button" onclick="goBack()" style="max-width:220px;margin:0 auto;">返回上一页</button>' +
      '</div>';
  }
}

function loadNounDetail() {
  var urlParams = new URLSearchParams(window.location.search);
  var term = urlParams.get('term') || '沉默的螺旋';

  // 严格按 URL 词条取数据：取不到说明已被后台下架/删除，展示空态而不是回落"沉默的螺旋"
  var data = (typeof nounData === 'object' && nounData !== null) ? nounData[term] : null;
  if (!data) {
    currentTerm = term;
    var missTitle = document.getElementById('noun-title');
    if (missTitle) missTitle.textContent = '词条不存在';
    var missTag = document.getElementById('noun-tag');
    if (missTag) missTag.style.display = 'none';
    showDetailNotFound('名词解释「' + term + '」可能已被下架，或链接有误。');
    return;
  }
  currentTerm = data.title;
  
  var titleEl = document.getElementById('noun-title');
  if (titleEl) titleEl.textContent = data.title;

  // V5.0：思维导图标题随词条联动（修复写死"沉默的螺旋"的显示瑕疵）
  var mindmapTitleEl = document.getElementById('mindmapTitle');
  if (mindmapTitleEl) mindmapTitleEl.textContent = data.title;
  
  var tagEl = document.getElementById('noun-tag');
  if (tagEl) tagEl.textContent = data.tag;
  
  var categoryEl = document.getElementById('noun-category');
  if (categoryEl) categoryEl.textContent = '‹ ' + data.category;
  
  var captionEl = document.getElementById('noun-caption');
  if (captionEl) captionEl.textContent = data.caption;
  
  var videoCaption = document.getElementById('video-caption');
  if (videoCaption) videoCaption.textContent = data.caption;
  
  var videoGenBtn = document.getElementById('video-gen-btn');
  if (videoGenBtn) {
    videoGenBtn.style.display = 'block';
    videoGenBtn.textContent = '生成AI记忆视频';
  }
  
  renderDefinition(data.definition);
  renderMindMap(data.definition, data.title);
  renderCommunity(data.community);
}

function renderDefinition(definition) {
  var container = document.getElementById('panel-text');
  if (!container) return;
  
  var textSection = container.querySelector('.text-section');
  if (!textSection) return;
  
  textSection.innerHTML = '';
  
  definition.blocks.forEach(function(block) {
    var blockDiv = document.createElement('div');
    blockDiv.className = 'fw-block';
    
    var labelDiv = document.createElement('div');
    labelDiv.className = 'fw-label';
    labelDiv.textContent = block.label;
    blockDiv.appendChild(labelDiv);
    
    if (block.sections) {
      block.sections.forEach(function(section) {
        var subSection = document.createElement('div');
        subSection.className = 'sub-section';
        
        var subTitle = document.createElement('div');
        subTitle.className = 'sub-section-title';
        subTitle.textContent = section.title;
        subSection.appendChild(subTitle);
        
        var subContent = document.createElement('div');
        subContent.className = 'sub-section-content';
        subContent.textContent = section.content;
        subSection.appendChild(subContent);
        
        blockDiv.appendChild(subSection);
      });
    } else if (block.content) {
      var contentDiv = document.createElement('div');
      contentDiv.className = 'sub-section-content';
      contentDiv.textContent = block.content;
      blockDiv.appendChild(contentDiv);
    }
    
    textSection.appendChild(blockDiv);
  });
}

function renderMindMap(definition, title) {
  var content = document.getElementById('mindmapContent');
  if (!content) return;
  
  if (content.innerHTML && content.getAttribute('data-rendered') === 'true') {
    if (content.style.display === 'none') {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
    return;
  }
  
  var data = [];
  if (definition && definition.blocks) {
    data = definition.blocks.map(function(block) {
      var items = [];
      var blockLabel = block.label.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '');
      if (block.sections && block.sections.length > 0) {
        items = block.sections.map(function(s) {
          return { title: s.title, content: s.content };
        });
      } else if (block.content) {
        items = [{ title: blockLabel, content: block.content }];
      }
      return {
        label: blockLabel,
        items: items
      };
    });
  }
  
  if (data.length === 0) return;
  
  var leafHeight = 32;
  var leafGap = 12;
  var gap = 32;
  var rootWidth = 90;
  var minLeafWidth = 120;
  var hGap = 50;
  var lineGap = 20;
  
  // V5.1：预扫每个 branch 独立宽度（之前全局固定 100px，长文字会截断）
  var branchWidths = [];
  var maxBranchW = 0;
  data.forEach(function(block) {
    var bw = Math.max(70, (block.label || '').length * 11 + 28);
    branchWidths.push(bw);
    if (bw > maxBranchW) maxBranchW = bw;
  });
  
  var branchHeights = [];
  var totalHeight = 0;
  
  data.forEach(function(block) {
    var leafCount = block.items && block.items.length > 0 ? block.items.length : 1;
    var height = leafCount * (leafHeight + leafGap) - leafGap;
    branchHeights.push(height);
    totalHeight += height + gap;
  });
  totalHeight -= gap;
  if (totalHeight < 100) totalHeight = 100;
  
  var rootX = 20;
  var rootY = totalHeight / 2;
  var rootRightX = rootX + rootWidth;
  var trunkX = rootRightX + lineGap;
  var branchLeftX = trunkX + lineGap;
  // V5.1 branchRightX 取所有 branch 中最宽的右边缘——这样所有 leaf 卡片左边缘对齐
  var branchRightX = branchLeftX + maxBranchW;
  var leafLeftX = branchRightX + lineGap;
  
  var maxLeafWidth = minLeafWidth;
  data.forEach(function(block) {
    if (block.items && block.items.length > 0) {
      block.items.forEach(function(item) {
        var textLen = (item.title || '').length;
        var w = Math.max(minLeafWidth, textLen * 11 + 24);
        if (w > maxLeafWidth) maxLeafWidth = w;
      });
    }
  });
  
  var svgWidth = leafLeftX + maxLeafWidth + 40;
  var svgHeight = totalHeight + 80;
  
  var svgId = 'mm-svg-' + Date.now();
  
  var svg = '<svg id="' + svgId + '" width="' + svgWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="display:block;">';
  svg += '<defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">';
  svg += '<stop offset="0%" style="stop-color:#8C4A3C"/><stop offset="100%" style="stop-color:#A85A48"/>';
  svg += '</linearGradient></defs>';
  
  svg += '<rect x="' + rootX + '" y="' + (rootY - 22) + '" width="' + rootWidth + '" height="44" rx="22" fill="url(#rg)"/>';
  svg += '<text x="' + (rootX + rootWidth/2) + '" y="' + (rootY + 5) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="600">' + escapeHtml(title || '核心概念') + '</text>';
  // V5.1 补 root→trunk 横线（原始代码缺失，导致 root 看起来和 trunk 断开）
  svg += '<line x1="' + rootRightX + '" y1="' + rootY + '" x2="' + trunkX + '" y2="' + rootY + '" stroke="#8C4A3C" stroke-width="1.2" opacity="0.55"/>';
  
  var curY = 0;
  var leafNodes = [];
  
  data.forEach(function(block, idx) {
    var bH = branchHeights[idx];
    var bCY = curY + bH / 2;
    var branchHeight = 38;
    var branchY = bCY - branchHeight / 2;
    // V5.1 当前 branch 自己的宽度和右边缘
    var bW = branchWidths[idx];
    var curBranchRight = branchLeftX + bW;
    
    svg += '<line x1="' + trunkX + '" y1="' + bCY + '" x2="' + (branchLeftX - 10) + '" y2="' + bCY + '" stroke="#8C4A3C" stroke-width="1.2" opacity="0.5"/>';
    // V5.1 删掉循环里分散的 trunk 分段（每个 branch 只画自己内部那一小段，branch 之间 gap 段完全没竖线→看起来断着）
    // 改在循环外画一条完整的 trunk 竖线
    
    var bl = escapeHtml(block.label);
    // V5.1 branch 卡片 width 用 branchWidths[idx] 自适应
    svg += '<rect x="' + branchLeftX + '" y="' + branchY + '" width="' + bW + '" height="' + branchHeight + '" rx="8" fill="#FFFEF7" stroke="#8C4A3C" stroke-width="1.2"/>';
    svg += '<text x="' + (branchLeftX + bW/2) + '" y="' + (bCY + 4) + '" text-anchor="middle" fill="#8C4A3C" font-size="11" font-weight="600">' + bl + '</text>';
    
    if (block.items && block.items.length > 0) {
      block.items.forEach(function(item, li) {
        var lY = curY + li * (leafHeight + leafGap);
        var lCY = lY + leafHeight / 2;
        var lt = escapeHtml(item.title || '');
        var leafW = Math.max(minLeafWidth, (item.title || '').length * 11 + 24);
        
        var nodeId = 'leaf-' + idx + '-' + li;
        svg += '<g id="' + nodeId + '" style="cursor:pointer;">';
        // V5.1 leaf 横线 x1 用 curBranchRight（当前 branch 自己的右边缘），不再用全局固定的 branchRightX
        svg += '<line x1="' + curBranchRight + '" y1="' + lCY + '" x2="' + leafLeftX + '" y2="' + lCY + '" stroke="#A85A48" stroke-width="1" opacity="0.4"/>';
        svg += '<line x1="' + curBranchRight + '" y1="' + bCY + '" x2="' + curBranchRight + '" y2="' + lCY + '" stroke="#A85A48" stroke-width="0.8" opacity="0.3"/>';
        svg += '<rect x="' + leafLeftX + '" y="' + lY + '" width="' + leafW + '" height="' + leafHeight + '" rx="6" fill="#F5F0E8" stroke="#A85A48" stroke-width="0.8" stroke-opacity="0.4"/>';
        if (lt) {
          svg += '<text x="' + (leafLeftX + 8) + '" y="' + (lCY + 4) + '" fill="#1C1917" font-size="11">' + lt + '</text>';
        }
        svg += '</g>';
        
        leafNodes.push({
          id: nodeId,
          title: item.title || '',
          content: item.content || '',
          x: leafLeftX + leafW / 2,
          y: lY - 8
        });
      });
    }
    curY += bH + gap;
  });
  // V5.1：trunk 竖线精确接到第一个 branch 卡片中点和最后一个 branch 卡片中点——之前 y1=0 超出顶部，y2=totalHeight 超出底部
  var _firstCY = branchHeights[0] / 2;
  var _lastCY = totalHeight - branchHeights[branchHeights.length - 1] / 2;
  svg += '<line x1="' + trunkX + '" y1="' + _firstCY + '" x2="' + trunkX + '" y2="' + _lastCY + '" stroke="#8C4A3C" stroke-width="1" opacity="0.35"/>';
  svg += '</svg>';
  
  var tooltipHtml = '<div id="mm-tooltip" style="display:none;position:absolute;background:rgba(36,58,94,0.95);color:#fff;padding:10px 14px;border-radius:8px;font-size:12px;max-width:240px;z-index:999;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.2);line-height:1.5;"></div>';
  
  content.innerHTML = '<div id="mm-scroll" style="overflow-x:auto;overflow-y:auto;padding:4px 0;max-height:460px;">' + svg + '</div>' + tooltipHtml;
  content.style.display = 'none';
  content.setAttribute('data-rendered', 'true');
  
  window._mmSvgId = svgId;
  window._mmLeafNodes = leafNodes;
  
  setTimeout(function() {
    var svgEl = document.getElementById(svgId);
    if (!svgEl) return;
    
    var tooltip = document.getElementById('mm-tooltip');
    if (!tooltip) return;
    
    leafNodes.forEach(function(node) {
      var el = document.getElementById(node.id);
      if (!el) return;
      
      el.addEventListener('mouseenter', function(e) {
        var text = node.title ? '<div style="font-weight:600;margin-bottom:4px;color:#FFD58A;">' + escapeHtml(node.title) + '</div>' : '';
        text += escapeHtml(node.content);
        tooltip.innerHTML = text;
        tooltip.style.display = 'block';
      });
      
      el.addEventListener('mousemove', function(e) {
        var rect = document.getElementById('mm-scroll').getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
        tooltip.style.top = (e.clientY - rect.top + 12) + 'px';
      });
      
      el.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
      });
      
      el.addEventListener('click', function() {
        alert((node.title ? node.title + '\n\n' : '') + node.content);
      });
    });
  }, 100);
}

function toggleMindmap() {
  var c = document.getElementById('mindmapContent');
  if (!c) return;
  c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function parseTermText(term) {
  if (term === '沉默的螺旋') {
    return [
      {
        label: '概念提出',
        items: [
          { title: '提出者', content: '诺依曼于1974年在《重归大众传播的强力观》中提出' },
          { title: '研究领域', content: '大众传播效果/民意形成研究领域' }
        ]
      },
      {
        label: '起源背景',
        items: [
          { title: '生成诱因', content: '源于对纽伦堡审判前后民意变化的观察' },
          { title: '理论起源', content: '研究起源于对舆论形成机制的探索，前期铺垫理论包括舆论学、社会心理学' }
        ]
      },
      {
        label: '核心内容',
        items: [
          { title: '核心表现', content: '因个体害怕因持少数意见而被孤立，外在表现为敢言的多数意见愈发强势、不敢言的少数意见趋于沉默' },
          { title: '适用范围', content: '适配选举、公共议题等群体舆论形成场景，覆盖大众传播效果研究范畴' }
        ]
      },
      {
        label: '理论特征',
        items: [
          { title: '内在规律', content: '假设受众具有"准感官统计"能力，能感知周围意见气候' },
          { title: '概念区分', content: '与"第三人效应""多元无知"区分——后者强调对他人影响的错误估计，而非从众发声行为本身' }
        ]
      },
      {
        label: '影响与评价',
        items: [
          { title: '现实危害', content: '可能导致"多数暴政"，压制少数群体真实意见的表达，助长舆论极化；在算法推荐环境下，这种压制效应可能被进一步放大' },
          { title: '研究价值', content: '为理解舆论"一边倒"现象提供解释框架，奠定受众心理研究基础' }
        ]
      },
      {
        label: '应对对策',
        items: [
          { title: '媒体责任', content: '媒体应保护多元意见表达空间' },
          { title: '平台策略', content: '平台需警惕算法放大主流声音、抑制少数声音的机制' }
        ]
      }
    ];
  }
  return [];
}

function renderCommunity(community) {
  var container = document.getElementById('panel-community');
  if (!container) return;
  
  var section = container.querySelector('.community-section');
  if (!section) return;
  
  var addBtn = section.querySelector('.add-post-btn');
  section.innerHTML = '';
  
  community.forEach(function(post) {
    var postDiv = document.createElement('div');
    postDiv.className = 'community-post';
    postDiv.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${post.avatar}</div>
        <div>
          <div class="post-user">${post.user}</div>
          <div class="post-time">${post.time}</div>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      <div class="post-actions">
        <span class="post-action">👍 ${post.likes}</span>
        <span class="post-action">💬 ${post.comments}</span>
      </div>
    `;
    section.appendChild(postDiv);
  });
  
  section.appendChild(addBtn);
}

function prevTerm() {
  var terms = getAllTerms();
  var currentIndex = terms.indexOf(currentTerm);
  if (currentIndex === -1) currentIndex = terms.indexOf('沉默的螺旋');
  var prevIndex = (currentIndex - 1 + terms.length) % terms.length;
  navigateTo('noun-detail.html?term=' + terms[prevIndex]);
}

function nextTerm() {
  var terms = getAllTerms();
  var currentIndex = terms.indexOf(currentTerm);
  if (currentIndex === -1) currentIndex = terms.indexOf('沉默的螺旋');
  var nextIndex = (currentIndex + 1) % terms.length;
  navigateTo('noun-detail.html?term=' + terms[nextIndex]);
}

function toggleTTS(type) {
  if (ttsPlaying) {
    window.speechSynthesis.cancel();
    ttsPlaying = false;
    var btn = document.querySelector('.tts-btn');
    if (btn) btn.textContent = '▶';
    return;
  }
  
  var text = '';
  if (type === 'short') {
    text = document.getElementById('short-answer-text')?.textContent || '霍尔编码解码模型。前提：受众主动但受结构制约，社会地位、意识形态框架会影响其解读。模型：编码是传者按规则转化讯息，解码是受众按规则解读，主导意识形态借此渗入文本。三种解码：偏好式——完全认同主导意义；妥协式——部分认同+部分保留自身立场；对抗式——理解但反其道解读。';
  } else if (type === 'essay') {
    text = document.getElementById('essay-answer-text')?.textContent || '媒介素养指公众获取、分析、衡量、批判和传播媒介讯息的能力。其研究经历保护主义（提高免疫力）、辨识能力（培养批判性思维）、能动赋权（培养合格数字公众）三个阶段。新媒体时代，受众需具备媒介使用与人机协同、信息消费与内容批判、内容生产与跨媒介叙事三方面素养。';
  }
  
  if (!text) return;
  
  ttsUtterance = new SpeechSynthesisUtterance(text);
  ttsUtterance.lang = 'zh-CN';
  ttsUtterance.rate = 0.9;
  
  ttsUtterance.onstart = function() {
    ttsPlaying = true;
    var btn = document.querySelector('.tts-btn');
    if (btn) btn.textContent = '⏸';
  };
  
  ttsUtterance.onend = function() {
    ttsPlaying = false;
    var btn = document.querySelector('.tts-btn');
    if (btn) btn.textContent = '▶';
  };
  
  window.speechSynthesis.speak(ttsUtterance);
}

function openSubmitMemModal() {
  var modal = document.getElementById('submit-mem-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function submitMemoryMethod() {
  var textarea = document.getElementById('mem-submit-text');
  var content = textarea.value.trim();
  
  if (!content) {
    alert('请输入记忆方法内容');
    return;
  }
  
  var memMethods = safeParseStorage('memMethods', []);
  memMethods.push({
    content: content,
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
  localStorage.setItem('memMethods', JSON.stringify(memMethods));
  bumpStat('noteCount', 1); // V5.0：发布分享计入笔记/分享数
  markStudyDay();
  
  closeModal('submit-mem-modal');
  textarea.value = '';
  showConfirm('提交成功', '您的记忆方法将进入审核队列，审核通过后将展示给其他考生。', 'success');
}

function toggleMemLike(element) {
  element.classList.toggle('liked');
  var text = element.textContent;
  var match = text.match(/(\d+)/);
  if (match) {
    var count = parseInt(match[1]);
    if (element.classList.contains('liked')) {
      element.textContent = '👍 ' + (count + 1);
    } else {
      element.textContent = '👍 ' + (count - 1);
    }
  }
}

function openAvatarColorModal() {
  var modal = document.getElementById('avatar-color-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function selectAvatarColor(color) {
  var nickname = localStorage.getItem('userNickname') || '阿宇';
  var avatarText = nickname.charAt(0);
  
  var profileAvatar = document.querySelector('.profile-avatar');
  if (profileAvatar) {
    profileAvatar.style.background = color;
    profileAvatar.style.backgroundImage = 'none';
    profileAvatar.textContent = avatarText;
  }
  
  var homeAvatar = document.querySelector('.home-user .avatar');
  if (homeAvatar) {
    homeAvatar.style.background = color;
    homeAvatar.style.backgroundImage = 'none';
    homeAvatar.textContent = avatarText;
  }
  
  localStorage.setItem('avatarColor', color);
  localStorage.setItem('avatarText', avatarText);
  localStorage.removeItem('avatarImage');
  closeModal('avatar-color-modal');
  showConfirm('设置成功', '头像颜色已更新', 'success');
}

function uploadAvatar(input) {
  if (input.files && input.files[0]) {
    var file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      showConfirm('提示', '图片大小不能超过2MB，请选择较小的图片', 'warning');
      return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
      var imgData = e.target.result;
      
      var profileAvatar = document.querySelector('.profile-avatar');
      if (profileAvatar) {
        profileAvatar.style.backgroundImage = 'url(' + imgData + ')';
        profileAvatar.style.backgroundSize = 'cover';
        profileAvatar.style.backgroundPosition = 'center';
        profileAvatar.textContent = '';
      }
      
      var homeAvatar = document.querySelector('.home-user .avatar');
      if (homeAvatar) {
        homeAvatar.style.backgroundImage = 'url(' + imgData + ')';
        homeAvatar.style.backgroundSize = 'cover';
        homeAvatar.style.backgroundPosition = 'center';
      }
      
      localStorage.setItem('avatarImage', imgData);
      closeModal('avatar-color-modal');
      showConfirm('设置成功', '头像已更新', 'success');
    };
    reader.readAsDataURL(file);
  }
}

function toggleReminder() {
  var switchEl = document.getElementById('reminder-switch');
  if (switchEl) {
    var isOn = switchEl.classList.contains('on');
    if (isOn) {
      switchEl.classList.remove('on');
      localStorage.setItem('reminderEnabled', 'false');
      showConfirm('背诵提醒', '已关闭背诵提醒', 'info');
    } else {
      switchEl.classList.add('on');
      localStorage.setItem('reminderEnabled', 'true');
      showConfirm('背诵提醒', '已开启背诵提醒，将在每天固定时间提醒您背诵', 'success');
    }
  }
}

function toggleAutoPlay() {
  var switchEl = document.getElementById('autoplay-switch');
  if (switchEl) {
    var isOn = switchEl.classList.contains('on');
    if (isOn) {
      switchEl.classList.remove('on');
      localStorage.setItem('autoPlayVideo', 'false');
      showConfirm('自动播放', '已关闭视频自动播放', 'info');
    } else {
      switchEl.classList.add('on');
      localStorage.setItem('autoPlayVideo', 'true');
      showConfirm('自动播放', '已开启视频自动播放', 'success');
    }
  }
}

// ===== V5.0 设置中心激活 =====
// 按行 onclick 属性定位对应设置行的 .val 并更新显示文字
function updateSettingsRowVal(onclickAttr, text) {
  var el = document.querySelector('.settings-row[onclick="' + onclickAttr + '"] .val');
  if (el) el.textContent = text;
}

function maskPhone(phone) {
  var p = phone || '';
  if (p.length < 7) return p || '未绑定';
  return p.slice(0, 3) + '****' + p.slice(-4);
}

// —— 账号管理 ——

function openChangePasswordModal() {
  var inputStyle = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--paper-line);border-radius:10px;font-size:13px;margin-bottom:10px;outline:none;background:var(--paper);color:var(--ink);';
  var html = '<div class="modal-overlay" style="display:flex;" id="pwd-modal" onclick="closeModal(\'pwd-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">修改密码</div>' +
      '<div class="modal-close" onclick="closeModal(\'pwd-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<input type="password" id="pwd-new" placeholder="请输入新密码（至少6位）" style="' + inputStyle + '">' +
        '<input type="password" id="pwd-confirm" placeholder="请再次输入新密码" style="' + inputStyle + '">' +
        '<div style="font-size:12px;color:var(--ink-light);margin:4px 0 14px;">当前版本密码仅保存在本机，不会上传服务器</div>' +
        '<div class="save-btn" style="text-align:center;" onclick="submitChangePassword()">确认修改</div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('pwd-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function submitChangePassword() {
  var pwdNew = document.getElementById('pwd-new');
  var pwdConfirm = document.getElementById('pwd-confirm');
  if (!pwdNew || !pwdConfirm) return;
  var v1 = pwdNew.value;
  var v2 = pwdConfirm.value;
  if (v1.length < 6) {
    showConfirm('提示', '新密码长度至少为6位', 'warning');
    return;
  }
  if (v1 !== v2) {
    showConfirm('提示', '两次输入的密码不一致，请重新输入', 'warning');
    return;
  }
  var masked = v1.charAt(0) + '***' + v1.charAt(v1.length - 1);
  localStorage.setItem('localPasswordHint', masked);
  closeModal('pwd-modal');
  updateSettingsRowVal('openChangePasswordModal()', '已设置 ›');
  showConfirm('修改成功', '密码已保存在本机（仅本机生效）', 'success');
}

function openBindEmailModal() {
  var html = '<div class="modal-overlay" style="display:flex;" id="email-modal" onclick="closeModal(\'email-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">绑定邮箱</div>' +
      '<div class="modal-close" onclick="closeModal(\'email-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<input type="text" id="email-input" placeholder="请输入邮箱地址" value="' + escapeHtml(localStorage.getItem('boundEmail') || '') + '" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--paper-line);border-radius:10px;font-size:13px;margin-bottom:10px;outline:none;background:var(--paper);color:var(--ink);">' +
        '<div style="font-size:12px;color:var(--ink-light);margin:4px 0 14px;">当前版本邮箱仅保存在本机，不会上传服务器</div>' +
        '<div class="save-btn" style="text-align:center;" onclick="submitBindEmail()">保存</div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('email-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function submitBindEmail() {
  var input = document.getElementById('email-input');
  if (!input) return;
  var email = input.value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showConfirm('提示', '请输入正确的邮箱地址', 'warning');
    return;
  }
  localStorage.setItem('boundEmail', email);
  closeModal('email-modal');
  updateSettingsRowVal('openBindEmailModal()', escapeHtml(email) + ' ›');
  showConfirm('绑定成功', '邮箱已保存在本机（仅本机生效）', 'success');
}

// —— 学习偏好 ——

function openDailyGoalModal() {
  var current = localStorage.getItem('dailyGoal') || '20';
  var html = '<div class="modal-overlay" style="display:flex;" id="goal-modal" onclick="closeModal(\'goal-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">每日学习目标</div>' +
      '<div class="modal-close" onclick="closeModal(\'goal-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<div class="fontsize-option ' + (current === '10' ? 'active' : '') + '" onclick="setDailyGoal(\'10\')"><div class="fontsize-label">轻松目标</div><div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">每天 10 个词条</div></div>' +
        '<div class="fontsize-option ' + (current === '20' ? 'active' : '') + '" onclick="setDailyGoal(\'20\')"><div class="fontsize-label">标准目标</div><div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">每天 20 个词条</div></div>' +
        '<div class="fontsize-option ' + (current === '30' ? 'active' : '') + '" onclick="setDailyGoal(\'30\')"><div class="fontsize-label">冲刺目标</div><div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">每天 30 个词条</div></div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('goal-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function setDailyGoal(goal) {
  localStorage.setItem('dailyGoal', goal);
  closeModal('goal-modal');
  updateSettingsRowVal('openDailyGoalModal()', goal + '个 ›');
  showConfirm('每日目标', '已设置为每天 ' + goal + ' 个词条', 'success');
}

function openStudySpeedModal() {
  var current = localStorage.getItem('studySpeed') || 'normal';
  var names = { slow: '慢速', normal: '标准', fast: '快速' };
  var descs = { slow: '逐句精读，适合首轮背诵', normal: '按节奏推进，适合日常巩固', fast: '快速过卡，适合冲刺复习' };
  var html = '<div class="modal-overlay" style="display:flex;" id="speed-modal" onclick="closeModal(\'speed-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">背诵速度</div>' +
      '<div class="modal-close" onclick="closeModal(\'speed-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<div class="fontsize-option ' + (current === 'slow' ? 'active' : '') + '" onclick="setStudySpeed(\'slow\')"><div class="fontsize-label">慢速</div><div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">' + descs.slow + '</div></div>' +
        '<div class="fontsize-option ' + (current === 'normal' ? 'active' : '') + '" onclick="setStudySpeed(\'normal\')"><div class="fontsize-label">标准</div><div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">' + descs.normal + '</div></div>' +
        '<div class="fontsize-option ' + (current === 'fast' ? 'active' : '') + '" onclick="setStudySpeed(\'fast\')"><div class="fontsize-label">快速</div><div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">' + descs.fast + '</div></div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('speed-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function setStudySpeed(speed) {
  localStorage.setItem('studySpeed', speed);
  var names = { slow: '慢速', normal: '标准', fast: '快速' };
  closeModal('speed-modal');
  updateSettingsRowVal('openStudySpeedModal()', names[speed] + ' ›');
  showConfirm('背诵速度', '已设置为' + names[speed], 'success');
}

function toggleReminderSetting() {
  var enabled = localStorage.getItem('reminderEnabled') !== 'false';
  localStorage.setItem('reminderEnabled', enabled ? 'false' : 'true');
  updateSettingsRowVal('toggleReminderSetting()', (enabled ? '关闭' : '开启') + ' ›');
  if (enabled) {
    showConfirm('复习提醒', '已关闭复习提醒', 'info');
  } else {
    showConfirm('复习提醒', '已开启复习提醒，将在每天固定时间提醒您背诵', 'success');
  }
}

function toggleAutoPlaySetting() {
  var enabled = localStorage.getItem('autoPlayVideo') !== 'false';
  localStorage.setItem('autoPlayVideo', enabled ? 'false' : 'true');
  updateSettingsRowVal('toggleAutoPlaySetting()', (enabled ? '关闭' : '开启') + ' ›');
  showConfirm('自动播放', enabled ? '已关闭视频自动播放' : '已开启视频自动播放，进入词条页将自动播放记忆视频', 'success');
}

// —— 系统通用 ——

function openDarkModeModal() {
  var current = localStorage.getItem('darkMode') || 'false';
  var options = [
    { key: 'auto', name: '跟随系统', desc: '随系统深浅色自动切换' },
    { key: 'true', name: '深色模式', desc: '始终使用深色主题' },
    { key: 'false', name: '浅色模式', desc: '始终使用浅色主题' }
  ];
  var html = '<div class="modal-overlay" style="display:flex;" id="darkmode-modal" onclick="closeModal(\'darkmode-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">深色模式</div>' +
      '<div class="modal-close" onclick="closeModal(\'darkmode-modal\')">×</div>' +
      '<div style="padding:16px 0;">';
  options.forEach(function(opt) {
    html += '<div class="fontsize-option ' + (current === opt.key ? 'active' : '') + '" onclick="setDarkModeMode(\'' + opt.key + '\')">' +
      '<div class="fontsize-label">' + opt.name + '</div>' +
      '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">' + opt.desc + '</div>' +
      '</div>';
  });
  html += '</div></div></div>';
  var old = document.getElementById('darkmode-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function setDarkModeMode(mode) {
  localStorage.setItem('darkMode', mode);
  localStorage.setItem('themeVersion', 'v3');
  var names = { auto: '跟随系统', 'true': '开启', 'false': '关闭' };
  if (mode === 'auto') {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyDarkMode();
    else applyLightMode();
  } else if (mode === 'true') {
    applyDarkMode();
  } else {
    applyLightMode();
  }
  var darkSwitch = document.getElementById('darkmode-switch');
  if (darkSwitch) {
    var isDark = (mode === 'true') || (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    darkSwitch.classList.remove('on');
    darkSwitch.classList.remove('off');
    darkSwitch.classList.add(isDark ? 'on' : 'off');
  }
  closeModal('darkmode-modal');
  updateSettingsRowVal('openDarkModeModal()', names[mode] + ' ›');
  showConfirm('深色模式', '已设置为' + names[mode], 'success');
}

// "跟随系统"模式下监听系统主题变化，即时切换
if (window.matchMedia && !window.__themeMediaBound) {
  window.__themeMediaBound = true;
  var __themeMq = window.matchMedia('(prefers-color-scheme: dark)');
  var __themeHandler = function() {
    if (localStorage.getItem('darkMode') !== 'auto') return;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) applyDarkMode();
    else applyLightMode();
  };
  if (__themeMq.addEventListener) __themeMq.addEventListener('change', __themeHandler);
  else if (__themeMq.addListener) __themeMq.addListener(__themeHandler);
}

function toggleNotifyPush() {
  var enabled = localStorage.getItem('notifyPush') !== 'false';
  localStorage.setItem('notifyPush', enabled ? 'false' : 'true');
  updateSettingsRowVal('toggleNotifyPush()', (enabled ? '关闭' : '开启') + ' ›');
  showConfirm('通知推送', enabled ? '已关闭通知推送' : '已开启通知推送（当前版本为本地模拟提醒）', 'success');
}

function computeCacheBytes() {
  var total = 0;
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    total += (k.length + (localStorage.getItem(k) || '').length) * 2; // UTF-16 粗略字节数
  }
  return total;
}

function openCacheCleanModal() {
  var kb = (computeCacheBytes() / 1024).toFixed(1);
  var cleanable = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k.indexOf('draft_') === 0 || k === 'feedbackDraft') cleanable.push(k);
  }
  var msg = '当前缓存占用约 ' + kb + 'KB。\n';
  if (cleanable.length) {
    msg += '将清理：' + cleanable.join('、') + '。\n核心学习数据（收藏/笔记/考试记录/掌握度）受白名单保护，不会被清理。';
    showConfirm('缓存清理', msg, 'warning', function() {
      cleanable.forEach(function(key) { localStorage.removeItem(key); });
      updateSettingsRowVal('openCacheCleanModal()', (computeCacheBytes() / 1024).toFixed(1) + 'KB ›');
      showConfirm('缓存清理', '已清理 ' + cleanable.length + ' 项草稿类缓存', 'success');
    }, null, true);
  } else {
    msg += '暂无待清理的草稿类缓存。核心学习数据（收藏/笔记/考试记录/掌握度）受白名单保护。';
    showConfirm('缓存清理', msg, 'info');
  }
}

function toggleOfflineSync() {
  var enabled = localStorage.getItem('offlineSync') !== 'false';
  localStorage.setItem('offlineSync', enabled ? 'false' : 'wifi');
  updateSettingsRowVal('toggleOfflineSync()', (enabled ? '关闭' : 'Wi-Fi下') + ' ›');
  showConfirm('离线下载', enabled ? '已关闭离线下载' : '将在 Wi-Fi 环境下自动缓存已学内容（当前版本为本地记录）', 'success');
}

function toggleDataSync() {
  var manual = localStorage.getItem('dataSync') === 'manual';
  localStorage.setItem('dataSync', manual ? 'auto' : 'manual');
  updateSettingsRowVal('toggleDataSync()', (manual ? '自动' : '手动') + ' ›');
  showConfirm('数据同步', manual ? '已切换为自动记录' : '已切换为手动记录', 'info');
}

// —— AI 设置（与详情页 AI 弹窗同一套 key：aiModel / aiModelName / apiKey）——

// ===== V5.1 设置页：七厂商 AI 模型（与名词详情页共用 AiService） =====
var aiSetSelectedKey = null;

function openAiModelSetting() {
  aiSetSelectedKey = localStorage.getItem('aiModel') || 'deepseek';
  if (!AiService.isModelSupported(aiSetSelectedKey)) aiSetSelectedKey = 'deepseek';

  var inputStyle = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--paper-line);border-radius:10px;font-size:13px;margin-top:8px;outline:none;background:var(--paper);color:var(--ink);';
  var html = '<div class="modal-overlay" style="display:flex;" id="ai-set-modal" onclick="closeModal(\'ai-set-modal\')">' +
    '<div class="modal-content" style="max-width:420px;" onclick="event.stopPropagation()">' +
      '<div class="modal-title">AI模型设置</div>' +
      '<div class="modal-close" onclick="closeModal(\'ai-set-modal\')">×</div>' +
      '<div style="padding:12px 0 4px;">' +
        '<div id="ai-set-provider-list"></div>' +
        '<div style="margin-top:10px;">' +
          '<div id="ai-set-cfg-label" style="font-size:13px;font-weight:600;color:var(--ink);"></div>' +
          '<div id="ai-set-cfg-hint" style="font-size:11px;color:var(--ink-light);margin:3px 0 2px;line-height:1.5;"></div>' +
          '<input type="text" id="ai-set-endpoint" placeholder="接口地址 URL" style="' + inputStyle + '">' +
          '<input type="text" id="ai-set-model" placeholder="模型名称" style="' + inputStyle + '">' +
          '<input type="password" id="ai-set-key" placeholder="API Key（仅保存在本机）" style="' + inputStyle + '">' +
        '</div>' +
        '<div class="save-btn" style="text-align:center;margin-top:14px;" onclick="saveAiSettingsFromSettings()">保存设置</div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('ai-set-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);

  renderAiSettingProviderList();
  fillAiSettingConfigPanel();
}

// 徽标如实反映配置状态（绝不出现"待接入"）
function renderAiSettingProviderList() {
  var box = document.getElementById('ai-set-provider-list');
  if (!box) return;
  var html = '';
  AiService.providerKeys.forEach(function (key) {
    var p = AiService.getProvider(key);
    var configured = AiService.isConfigured(key);
    var badge, badgeColor;
    if (configured) { badge = '已配置'; badgeColor = '#1e7d4f'; }
    else if (p.builtin) { badge = '待填 Key'; badgeColor = '#a87b1f'; }
    else { badge = '需自行配置'; badgeColor = '#8a8f99'; }
    var active = key === aiSetSelectedKey;
    html += '<div class="fontsize-option ai-provider-item' + (active ? ' active' : '') + '" data-model-key="' + key + '" onclick="selectAiSettingModel(this)" style="cursor:pointer;">' +
      '<div class="fontsize-label">' + escapeHtml(p.label) +
        '<span style="font-size:11px;font-weight:600;color:' + badgeColor + ';margin-left:8px;">' + badge + '</span>' +
      '</div>' +
      '<div class="fontsize-preview" style="font-size:11px;color:var(--ink-light);">' + escapeHtml(p.hint || '') + '</div>' +
    '</div>';
  });
  box.innerHTML = html;
}

function fillAiSettingConfigPanel() {
  var p = AiService.getProvider(aiSetSelectedKey);
  if (!p) return;
  var label = document.getElementById('ai-set-cfg-label');
  var hint = document.getElementById('ai-set-cfg-hint');
  var ep = document.getElementById('ai-set-endpoint');
  var md = document.getElementById('ai-set-model');
  var ky = document.getElementById('ai-set-key');
  if (label) label.textContent = '接口配置 · ' + p.label;
  if (hint) hint.textContent = p.builtin ? '官方接口地址已内置，只需填写 API Key。' : (p.hint || '');
  if (ep) {
    ep.value = p.endpoint || '';
    ep.disabled = !!p.builtin;
    ep.style.background = p.builtin ? '#f1efe9' : 'var(--paper)';
  }
  if (md) {
    md.value = p.model || '';
    md.disabled = !!p.builtin;
    md.style.background = p.builtin ? '#f1efe9' : 'var(--paper)';
  }
  if (ky) ky.value = p.keyVal || '';
}

function selectAiSettingModel(el) {
  var key = el.getAttribute('data-model-key');
  if (!key || !AiService.isModelSupported(key)) return;
  aiSetSelectedKey = key;
  var options = document.querySelectorAll('#ai-set-modal .fontsize-option');
  options.forEach(function (o) { o.classList.remove('active'); });
  el.classList.add('active');
  fillAiSettingConfigPanel();
}

function saveAiSettingsFromSettings() {
  var key = aiSetSelectedKey || 'deepseek';
  var p = AiService.getProvider(key);
  var ep = document.getElementById('ai-set-endpoint');
  var md = document.getElementById('ai-set-model');
  var ky = document.getElementById('ai-set-key');
  var endpoint = ep ? ep.value.trim() : '';
  var model = md ? md.value.trim() : '';
  var keyVal = ky ? ky.value.trim() : '';

  if (p.builtin) {
    localStorage.setItem('apiKey', keyVal);
  } else {
    AiService.saveProviderConfig(key, { endpoint: endpoint, model: model, key: keyVal });
  }

  localStorage.setItem('aiModel', key);
  localStorage.setItem('aiModelName', p.label);

  closeModal('ai-set-modal');
  updateSettingsRowVal('openAiModelSetting()', p.label + ' ›');
  updateSettingsRowVal('openAiKeySetting()', (AiService.isConfigured(key) ? '已配置' : '未配置') + ' ›');

  if (AiService.isConfigured(key)) {
    showConfirm('AI设置', '已保存并启用「' + p.label + '」，与词条页AI设置互通。', 'success');
  } else if (p.builtin) {
    showConfirm('AI设置', '已选择「' + p.label + '」，但还未填写 API Key。', 'warning');
  } else {
    showConfirm('AI设置', '已选择「' + p.label + '」，但接口地址或 API Key 未填写完整。', 'warning');
  }
}

function openAiKeySetting() {
  openAiModelSetting();
}

function openPromptTemplateModal() {
  var current = localStorage.getItem('aiPromptTemplate') || '';
  var html = '<div class="modal-overlay" style="display:flex;" id="tpl-modal" onclick="closeModal(\'tpl-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">自定义提示词模板</div>' +
      '<div class="modal-close" onclick="closeModal(\'tpl-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<textarea id="tpl-text" placeholder="例如：请用新闻传播考研的口径回答，输出分点并附记忆口诀" style="width:100%;box-sizing:border-box;min-height:90px;padding:10px 12px;border:1px solid var(--paper-line);border-radius:10px;font-size:13px;margin-bottom:10px;outline:none;background:var(--paper);color:var(--ink);resize:vertical;">' + escapeHtml(current) + '</textarea>' +
        '<div style="font-size:12px;color:var(--ink-light);margin:4px 0 14px;">模板将作为AI助记回复的前置要求（仅保存在本机）</div>' +
        '<div class="save-btn" style="text-align:center;" onclick="savePromptTemplate()">保存模板</div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('tpl-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function savePromptTemplate() {
  var textarea = document.getElementById('tpl-text');
  if (!textarea) return;
  var val = textarea.value.trim();
  localStorage.setItem('aiPromptTemplate', val);
  closeModal('tpl-modal');
  updateSettingsRowVal('openPromptTemplateModal()', (val ? '已设置' : '未设置') + ' ›');
  showConfirm('提示词模板', val ? '模板已保存，AI助记回复将参考该模板' : '已清空自定义模板', 'success');
}

// ===== V5.1 视频生成 API 配置（即梦/火山方舟等异步任务协议） =====
var videoSetSelectedKey = 'jimeng';

function openVideoApiSetting() {
  videoSetSelectedKey = localStorage.getItem('aiVideoProvider') || 'jimeng';
  if (!AiService.isVideoModelSupported(videoSetSelectedKey)) videoSetSelectedKey = 'jimeng';

  var inputStyle = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--paper-line);border-radius:10px;font-size:13px;margin-top:8px;outline:none;background:var(--paper);color:var(--ink);';
  var html = '<div class="modal-overlay" style="display:flex;" id="video-set-modal" onclick="closeModal(\'video-set-modal\')">' +
    '<div class="modal-content" style="max-width:460px;" onclick="event.stopPropagation()">' +
      '<div class="modal-title">视频生成 API 设置</div>' +
      '<div class="modal-close" onclick="closeModal(\'video-set-modal\')">×</div>' +
      '<div style="padding:12px 0 4px;">' +
        '<div id="video-set-provider-list"></div>' +
        '<div style="margin-top:10px;">' +
          '<div id="video-set-cfg-label" style="font-size:13px;font-weight:600;color:var(--ink);"></div>' +
          '<div id="video-set-cfg-hint" style="font-size:11px;color:var(--ink-light);margin:3px 0 2px;line-height:1.5;"></div>' +
          '<input type="text" id="video-set-submit" placeholder="提交任务地址（POST）" style="' + inputStyle + '">' +
          '<input type="text" id="video-set-query" placeholder="查询状态地址模板（含 {taskId}）" style="' + inputStyle + '">' +
          '<input type="text" id="video-set-model" placeholder="模型名称" style="' + inputStyle + '">' +
          '<input type="password" id="video-set-key" placeholder="API Key（仅保存在本机）" style="' + inputStyle + '">' +
        '</div>' +
        '<div style="font-size:11px;color:var(--ink-light);margin-top:10px;line-height:1.5;">协议：POST 提交 → 返回 task_id → 轮询 GET 查询 → 完成后取 video_url。Key 仅本机 localStorage 保存。</div>' +
        '<div class="save-btn" style="text-align:center;margin-top:14px;" onclick="saveVideoApiSettings()">保存设置</div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('video-set-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);

  renderVideoSettingProviderList();
  fillVideoSettingConfigPanel();
}

function renderVideoSettingProviderList() {
  var box = document.getElementById('video-set-provider-list');
  if (!box) return;
  var html = '';
  AiService.videoProviderKeys.forEach(function (key) {
    var p = AiService.getVideoProvider(key);
    var configured = AiService.isVideoConfigured(key);
    var badge = configured ? '已配置' : '需自行配置';
    var badgeColor = configured ? '#1e7d4f' : '#8a8f99';
    var active = key === videoSetSelectedKey;
    html += '<div class="fontsize-option ai-provider-item' + (active ? ' active' : '') + '" data-video-key="' + key + '" onclick="selectVideoSettingModel(this)" style="cursor:pointer;">' +
      '<div class="fontsize-label">' + escapeHtml(p.label) +
        '<span style="font-size:11px;font-weight:600;color:' + badgeColor + ';margin-left:8px;">' + badge + '</span>' +
      '</div>' +
      '<div class="fontsize-preview" style="font-size:11px;color:var(--ink-light);">' + escapeHtml(p.hint || '') + '</div>' +
    '</div>';
  });
  box.innerHTML = html;
}

function fillVideoSettingConfigPanel() {
  var p = AiService.getVideoProvider(videoSetSelectedKey);
  if (!p) return;
  var label = document.getElementById('video-set-cfg-label');
  var hint = document.getElementById('video-set-cfg-hint');
  var sp = document.getElementById('video-set-submit');
  var qp = document.getElementById('video-set-query');
  var md = document.getElementById('video-set-model');
  var ky = document.getElementById('video-set-key');
  if (label) label.textContent = '接口配置 · ' + p.label;
  if (hint) hint.textContent = p.hint || '';
  if (sp) sp.value = p.submitEndpoint || '';
  if (qp) qp.value = p.queryTemplate || '';
  if (md) md.value = p.model || '';
  if (ky) ky.value = p.keyVal || '';
}

function selectVideoSettingModel(el) {
  var key = el.getAttribute('data-video-key');
  if (!key || !AiService.isVideoModelSupported(key)) return;
  videoSetSelectedKey = key;
  var options = document.querySelectorAll('#video-set-modal .fontsize-option');
  options.forEach(function (o) { o.classList.remove('active'); });
  el.classList.add('active');
  fillVideoSettingConfigPanel();
}

function saveVideoApiSettings() {
  var key = videoSetSelectedKey || 'jimeng';
  var p = AiService.getVideoProvider(key);
  var sp = document.getElementById('video-set-submit');
  var qp = document.getElementById('video-set-query');
  var md = document.getElementById('video-set-model');
  var ky = document.getElementById('video-set-key');
  var submitEp = sp ? sp.value.trim() : '';
  var queryTpl = qp ? qp.value.trim() : '';
  var model = md ? md.value.trim() : '';
  var keyVal = ky ? ky.value.trim() : '';

  AiService.saveVideoProviderConfig(key, {
    submitEndpoint: submitEp,
    queryTemplate: queryTpl,
    model: model,
    key: keyVal
  });

  localStorage.setItem('aiVideoProvider', key);

  closeModal('video-set-modal');
  updateSettingsRowVal('openVideoApiSetting()',
    (AiService.isVideoConfigured(key) ? '已配置 · ' + p.label : '未配置') + ' ›');

  if (AiService.isVideoConfigured(key)) {
    showConfirm('视频API', '已保存「' + p.label + '」配置。在词条页视频模态框中选择该模型即可生成视频。', 'success');
  } else {
    showConfirm('视频API', '已选择「' + p.label + '」，但提交地址/查询地址/Key 未填写完整。', 'warning');
  }
}

// —— 意见反馈 / 关于 ——

var feedbackSelectedType = 'bug';

function openFeedbackModal() {
  var html = '<div class="modal-overlay" style="display:flex;" id="fb-modal" onclick="closeModal(\'fb-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">意见反馈</div>' +
      '<div class="modal-close" onclick="closeModal(\'fb-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<div id="fb-type-row" style="display:flex;gap:8px;margin-bottom:12px;">' +
          '<div class="filter-chip' + (feedbackSelectedType === 'bug' ? ' active' : '') + '" data-fb-type="bug" onclick="selectFeedbackType(this)">Bug反馈</div>' +
          '<div class="filter-chip' + (feedbackSelectedType === 'feature' ? ' active' : '') + '" data-fb-type="feature" onclick="selectFeedbackType(this)">功能建议</div>' +
          '<div class="filter-chip' + (feedbackSelectedType === 'other' ? ' active' : '') + '" data-fb-type="other" onclick="selectFeedbackType(this)">其他问题</div>' +
        '</div>' +
        '<textarea id="fb-content" placeholder="请描述您遇到的问题或建议..." style="width:100%;box-sizing:border-box;min-height:90px;padding:10px 12px;border:1px solid var(--paper-line);border-radius:10px;font-size:13px;margin-bottom:10px;outline:none;background:var(--paper);color:var(--ink);resize:vertical;"></textarea>' +
        '<input type="text" id="fb-contact" placeholder="联系方式（选填）" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--paper-line);border-radius:10px;font-size:13px;margin-bottom:14px;outline:none;background:var(--paper);color:var(--ink);">' +
        '<div class="save-btn" style="text-align:center;" onclick="submitFeedback()">提交反馈</div>' +
      '</div>' +
    '</div></div>';
  var old = document.getElementById('fb-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function selectFeedbackType(el) {
  feedbackSelectedType = el.getAttribute('data-fb-type') || 'bug';
  var chips = document.querySelectorAll('#fb-type-row .filter-chip');
  chips.forEach(function(chip) { chip.classList.remove('active'); });
  el.classList.add('active');
}
// V5.0 修复：原 submitFeedback 重复定义（后定义覆盖前定义），合并为单一兼容实现，
// 同时支持意见反馈弹窗（fb-content/fb-contact）与旧反馈弹窗（feedback-type/feedback-content/feedback-contact）
function submitFeedback() {
  var contentEl = document.getElementById('fb-content') || document.getElementById('feedback-content');
  var contactEl = document.getElementById('fb-contact') || document.getElementById('feedback-contact');
  var typeSelectEl = document.getElementById('feedback-type');
  if (!contentEl) return;
  var content = contentEl.value.trim();
  if (!content) {
    showConfirm('提示', '请填写反馈内容', 'warning');
    return;
  }
  var type = typeSelectEl ? typeSelectEl.value : (feedbackSelectedType || 'bug');
  var feedbacks = safeParseStorage('feedbacks', []);
  feedbacks.unshift({
    type: type,
    content: content,
    contact: contactEl ? contactEl.value.trim() : '',
    timestamp: Date.now()
  });
  localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
  closeModal(typeSelectEl ? 'feedback-modal' : 'fb-modal');
  showConfirm('提交成功', '感谢您的反馈！已同步至管理后台，我们会尽快处理。', 'success');
}

function rateApp() {
  showConfirm('给个好评', '感谢您的支持！您的鼓励是我们持续优化的动力。', 'success');
}

function showAbout() {
  var version = localStorage.getItem('APP_VERSION') || 'v5.1.0';
  showConfirm('关于新传研背', '新传研背 ' + version + '\n新传考研背诵与训练工具\n名词解释 · 简答题 · 论述题 · 考试实务训练', 'info');
}

// V5.0：统一轻提示（复用既有卡片风格，3秒自动消失；现有 showConfirm 调用全部保留不动）
function showToast(message, type) {
  var colors = { success: 'var(--green)', error: 'var(--red)', warning: 'var(--gold)', info: 'var(--seal)' };
  var color = colors[type] || colors.info;
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);background:var(--card);color:var(--ink);border:1px solid ' + color + ';border-radius:12px;padding:10px 18px;font-size:13px;box-shadow:0 6px 18px rgba(0,0,0,0.12);z-index:9999;max-width:80%;text-align:center;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

function openDifficultyModal() {
  showConfirm('记忆难度筛选', '该功能正在开发中，后续版本开放。\n\n当前状态：默认显示全部难度内容，自定义筛选功能即将上线。', 'info');
}

function navigateToProfile(url) {
  localStorage.setItem('returnToProfile', 'true');
  navigateTo(url);
}

function handleBackNav() {
  var returnToProfile = localStorage.getItem('returnToProfile');
  if (returnToProfile === 'true') {
    localStorage.removeItem('returnToProfile');
    navigateTo('profile.html');
  } else {
    navigateTo('index.html');
  }
}

function openNoteList() {
  var notes = safeParseStorage('notes', []);
  
  var html = '<div class="modal-overlay" style="display:flex;" id="notelist-modal" onclick="closeModal(\'notelist-modal\')">' +
    '<div class="modal-content" style="max-height:80vh;overflow:hidden;" onclick="event.stopPropagation()">' +
      '<div class="modal-title">我的笔记</div>' +
      '<div class="modal-close" onclick="closeModal(\'notelist-modal\')">×</div>' +
      '<div style="flex:1;overflow-y:auto;padding:0 16px;">';
  
  if (notes.length === 0) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">' +
      '<div style="font-size:48px;margin-bottom:16px;">📝</div>' +
      '<div>暂无笔记</div>' +
      '<div style="font-size:12px;margin-top:8px;">在知识点详情页点击"记笔记"按钮添加</div>' +
      '</div>';
  } else {
    notes.forEach(function(note, index) {
      var date = new Date(note.timestamp);
      var dateStr = date.toLocaleString('zh-CN');
      html += '<div style="padding:16px;border-bottom:1px solid var(--paper-line);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">' +
          '<span style="font-weight:600;">笔记 ' + (index + 1) + '</span>' +
          '<span style="font-size:12px;color:var(--ink-light);">' + dateStr + '</span>' +
        '</div>' +
        '<div style="font-size:14px;color:var(--ink-soft);line-height:1.6;">' + note.content + '</div>' +
      '</div>';
    });
  }
  
  html += '</div>' +
    '</div></div>';
  
  var old = document.getElementById('notelist-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function openUploadLibrary() {
  // V5.1：资料库弹窗过滤后台种子资料（_seed:true），只保留真实上传/同步的资料
  var materials = safeParseStorage('xc_materials', [])
    .filter(function(m) { return !m._seed; });

  var adminMats = [];
  var userMats = [];
  materials.forEach(function(m, index) {
    if (m.uploadedBy === 'user') { userMats.push({ m: m, index: index }); }
    else { adminMats.push({ m: m, index: index }); }
  });

  var html = '<div class="modal-overlay" style="display:flex;" id="library-modal" onclick="closeModal(\'library-modal\')">' +
    '<div class="modal-content" style="max-height:80vh;overflow:hidden;" onclick="event.stopPropagation()">' +
      '<div class="modal-title">我的资料库</div>' +
      '<div class="modal-close" onclick="closeModal(\'library-modal\')">×</div>' +
      '<div style="flex:1;overflow-y:auto;padding:0 16px;">';

  if (materials.length === 0) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">' +
      '<div style="font-size:48px;margin-bottom:16px;">📚</div>' +
      '<div>暂无资料</div>' +
      '<div style="font-size:12px;margin-top:8px;">在知识库点击"+"按钮上传资料</div>' +
      '</div>';
  } else {
    if (adminMats.length > 0) {
      html += '<div style="font-size:12px;color:var(--ink-light);padding:12px 0 4px;">后台发布（' + adminMats.length + '）</div>';
      adminMats.forEach(function(item) {
        var m = item.m;
        var size = m.wordCount ? (m.wordCount / 10000).toFixed(1) + '万字' : '-';
        html += '<div style="padding:16px;border-bottom:1px solid var(--paper-line);">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">' +
            '<span style="font-weight:600;">' + m.title + '</span>' +
            '<span style="font-size:12px;color:var(--seal);">后台 · ' + m.sourceType + '</span>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">' + m.fileType + ' · ' + size + '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;" onclick="viewMaterialDetail(' + item.index + ')">查看</button>' +
            '<button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;" onclick="downloadMaterial(' + item.index + ')">下载</button>' +
          '</div>' +
        '</div>';
      });
    }

    if (userMats.length > 0) {
      html += '<div style="font-size:12px;color:var(--ink-light);padding:12px 0 4px;">我的自建（' + userMats.length + '）</div>';
      userMats.forEach(function(item) {
        var m = item.m;
        var size = m.wordCount ? (m.wordCount / 10000).toFixed(1) + '万字' : '-';
        html += '<div style="padding:16px;border-bottom:1px solid var(--paper-line);">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">' +
            '<span style="font-weight:600;">' + m.title + '</span>' +
            '<span style="font-size:12px;color:var(--gold);">' + m.sourceType + '</span>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">' + m.fileType + ' · ' + size + '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;" onclick="viewMaterialDetail(' + item.index + ')">查看</button>' +
            '<button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;" onclick="downloadMaterial(' + item.index + ')">下载</button>' +
            '<button class="btn btn-danger" style="font-size:12px;padding:4px 12px;" onclick="deleteMaterial(' + item.index + ')">删除</button>' +
          '</div>' +
        '</div>';
      });
    }
  }

  html += '</div>' +
    '<div style="padding:12px;text-align:center;">' +
      '<span style="font-size:12px;color:var(--ink-light);">后台发布资料由管理后台同步，仅可查看；自建资料仅保存在本地</span>' +
    '</div>' +
    '</div></div>';

  var old = document.getElementById('library-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function viewMaterialDetail(index) {
  var materials = safeParseStorage('xc_materials', []);
  var m = materials[index];
  if (!m) return;

  var preview = m.fileContent ? m.fileContent.substring(0, 1000) + (m.fileContent.length > 1000 ? '...' : '') : '（暂无内容）';
  
  var html = '<div class="modal-overlay" style="display:flex;" id="material-detail-modal" onclick="closeModal(\'material-detail-modal\')">' +
    '<div class="modal-content" style="max-height:80vh;overflow:hidden;" onclick="event.stopPropagation()">' +
      '<div class="modal-title">资料详情</div>' +
      '<div class="modal-close" onclick="closeModal(\'material-detail-modal\')">×</div>' +
      '<div style="flex:1;overflow-y:auto;padding:0 16px;">' +
        '<div style="padding:16px 0;border-bottom:1px solid var(--paper-line);">' +
          '<div style="font-size:16px;font-weight:600;margin-bottom:4px;">' + m.title + '</div>' +
          '<div style="font-size:12px;color:var(--ink-light);">来源：' + m.sourceType + ' · 类型：' + m.fileType + '</div>' +
        '</div>' +
        '<div style="padding:16px 0;">' +
          '<div style="font-size:14px;font-weight:600;margin-bottom:8px;">内容预览</div>' +
          '<div style="background:var(--bg);border:1px solid var(--paper-line);border-radius:8px;padding:12px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + preview + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="save-btn" onclick="closeModal(\'material-detail-modal\')">关闭</button>' +
    '</div></div>';
  
  var old = document.getElementById('material-detail-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function downloadMaterial(index) {
  var materials = safeParseStorage('xc_materials', []);
  var m = materials[index];
  if (!m) return;

  if (!m.fileContent) {
    showConfirm('提示', '该资料暂无内容可下载', 'warning');
    return;
  }

  var blob = new Blob([m.fileContent], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = m.title + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showConfirm('下载成功', '资料已保存到本地', 'success');
}

function deleteMaterial(index) {
  showConfirm('删除确认', '确定要删除该资料吗？删除后无法恢复。', 'warning', function() {
    var materials = safeParseStorage('xc_materials', []);
    materials.splice(index, 1);
    localStorage.setItem('xc_materials', JSON.stringify(materials));
    
    var materialCountEl = document.querySelector('.settings-row[onclick="openUploadLibrary()"] .val');
    if (materialCountEl) {
      materialCountEl.textContent = materials.length + '份 ›';
    }
    
    closeModal('library-modal');
    openUploadLibrary();
    showConfirm('删除成功', '资料已删除', 'success');
  }, null, true);
}

function openApiKeyModal() {
  var savedKey = localStorage.getItem('apiKey') || '';
  
  var html = '<div class="modal-overlay" style="display:flex;" id="apikey-modal" onclick="closeModal(\'apikey-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">API密钥管理</div>' +
      '<div class="modal-close" onclick="closeModal(\'apikey-modal\')">×</div>' +
      '<div class="form-row">' +
        '<div class="form-label">DeepSeek API密钥</div>' +
        '<input type="text" class="api-input" id="api-key-input" value="' + savedKey + '" placeholder="请输入API密钥">' +
        '<div class="subtitle">密钥仅保存在本地，不会上传至服务器</div>' +
      '</div>' +
      '<div style="padding:12px;background:var(--paper);border-radius:8px;font-size:12px;color:var(--ink-soft);line-height:1.6;">' +
        '<strong>获取API密钥：</strong><br>' +
        '1. 访问 https://platform.deepseek.com/<br>' +
        '2. 注册账号并创建API密钥<br>' +
        '3. 将密钥复制粘贴到上方输入框' +
      '</div>' +
      '<button class="save-btn" onclick="saveApiKey()">保存密钥</button>' +
    '</div></div>';
  
  var old = document.getElementById('apikey-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveApiKey() {
  var key = document.getElementById('api-key-input').value.trim();
  localStorage.setItem('apiKey', key);
  
  var valEl = document.querySelector('.settings-row[onclick="openApiKeyModal()"] .val');
  if (valEl) valEl.textContent = key ? '已配置 ›' : '未配置 ›';
  
  closeModal('apikey-modal');
  showConfirm('API密钥', '密钥已保存', 'success');
}

function openQualityModal() {
  var currentQuality = localStorage.getItem('aiQuality') || '标准';
  
  var html = '<div class="modal-overlay" style="display:flex;" id="quality-modal" onclick="closeModal(\'quality-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">生成画质</div>' +
      '<div class="modal-close" onclick="closeModal(\'quality-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<div class="fontsize-option ' + (currentQuality === '标准' ? 'active' : '') + '" onclick="setAiQuality(\'标准\')">' +
          '<div class="fontsize-label">标准画质</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">适合快速生成，文件较小</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentQuality === '高清' ? 'active' : '') + '" onclick="setAiQuality(\'高清\')">' +
          '<div class="fontsize-label">高清画质</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">画质清晰，推荐使用</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentQuality === '超清' ? 'active' : '') + '" onclick="setAiQuality(\'超清\')">' +
          '<div class="fontsize-label">超清画质</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">画质极佳，文件较大</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  
  var old = document.getElementById('quality-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function setAiQuality(quality) {
  localStorage.setItem('aiQuality', quality);
  
  var valEl = document.querySelector('.settings-row[onclick="openQualityModal()"] .val');
  if (valEl) valEl.textContent = quality + ' ›';
  
  closeModal('quality-modal');
  showConfirm('生成画质', '已设置为' + quality, 'success');
}

function openDetailModal() {
  var currentDetail = localStorage.getItem('aiDetail') || '标准';
  
  var html = '<div class="modal-overlay" style="display:flex;" id="detail-modal" onclick="closeModal(\'detail-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">文字详细程度</div>' +
      '<div class="modal-close" onclick="closeModal(\'detail-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<div class="fontsize-option ' + (currentDetail === '简洁' ? 'active' : '') + '" onclick="setAiDetail(\'简洁\')">' +
          '<div class="fontsize-label">简洁</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">核心要点，精炼概括</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentDetail === '标准' ? 'active' : '') + '" onclick="setAiDetail(\'标准\')">' +
          '<div class="fontsize-label">标准</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">内容完整，详略得当</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentDetail === '详细' ? 'active' : '') + '" onclick="setAiDetail(\'详细\')">' +
          '<div class="fontsize-label">详细</div>' +
          '<div class="fontsize-preview" style="font-size:12px;color:var(--ink-light);">详尽解释，深度分析</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  
  var old = document.getElementById('detail-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function setAiDetail(detail) {
  localStorage.setItem('aiDetail', detail);
  
  var valEl = document.querySelector('.settings-row[onclick="openDetailModal()"] .val');
  if (valEl) valEl.textContent = detail + ' ›';
  
  closeModal('detail-modal');
  showConfirm('文字详细程度', '已设置为' + detail, 'success');
}

function openFontSizeModal() {
  var currentSize = localStorage.getItem('fontSize') || 'normal';
  
  var html = '<div class="modal-overlay" style="display:flex;" id="fontsize-modal" onclick="closeModal(\'fontsize-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">字体大小</div>' +
      '<div class="modal-close" onclick="closeModal(\'fontsize-modal\')">×</div>' +
      '<div style="padding:16px 0;">' +
        '<div class="fontsize-option ' + (currentSize === 'small' ? 'active' : '') + '" onclick="setFontSize(\'small\')">' +
          '<div class="fontsize-label">小号</div>' +
          '<div class="fontsize-preview" style="font-size:12px;">新传研背 - 小号字体</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentSize === 'normal' ? 'active' : '') + '" onclick="setFontSize(\'normal\')">' +
          '<div class="fontsize-label">标准</div>' +
          '<div class="fontsize-preview" style="font-size:14px;">新传研背 - 标准字体</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentSize === 'large' ? 'active' : '') + '" onclick="setFontSize(\'large\')">' +
          '<div class="fontsize-label">大号</div>' +
          '<div class="fontsize-preview" style="font-size:16px;">新传研背 - 大号字体</div>' +
        '</div>' +
        '<div class="fontsize-option ' + (currentSize === 'xlarge' ? 'active' : '') + '" onclick="setFontSize(\'xlarge\')">' +
          '<div class="fontsize-label">特大</div>' +
          '<div class="fontsize-preview" style="font-size:18px;">新传研背 - 特大字体</div>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  
  var old = document.getElementById('fontsize-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function setFontSize(size) {
  localStorage.setItem('fontSize', size);
  applyFontSize(size);
  
  var valEl = document.querySelector('.settings-row[onclick="openFontSizeModal()"] .val');
  var sizeNames = { small: '小号', normal: '标准', large: '大号', xlarge: '特大' };
  if (valEl) valEl.textContent = sizeNames[size] + ' ›';
  
  closeModal('fontsize-modal');
  showConfirm('字体大小', '已设置为' + sizeNames[size], 'success');
}

function applyFontSize(size) {
  var root = document.documentElement;
  var scaleMap = { small: 0.86, normal: 1, large: 1.14, xlarge: 1.29 };
  var scale = scaleMap[size] || 1;
  
  root.style.setProperty('--font-size-sm', (0.86 * scale) + 'rem');
  root.style.setProperty('--font-size-base', (1 * scale) + 'rem');
  root.style.setProperty('--font-size-lg', (1.14 * scale) + 'rem');
  root.style.setProperty('--font-size-xl', (1.29 * scale) + 'rem');
}

function toggleDarkMode() {
  var switchEl = document.getElementById('darkmode-switch');
  if (switchEl) {
    var isOn = switchEl.classList.contains('on');
    if (isOn) {
      switchEl.classList.remove('on');
      localStorage.setItem('darkMode', 'false');
      applyLightMode();
      showConfirm('深色模式', '已关闭深色模式', 'info');
    } else {
      switchEl.classList.add('on');
      localStorage.setItem('darkMode', 'true');
      applyDarkMode();
      showConfirm('深色模式', '已开启深色模式', 'success');
    }
  }
}

function applyDarkMode() {
  var root = document.documentElement;
  root.style.setProperty('--bg', '#1A1A1A');
  root.style.setProperty('--card', '#242424');
  root.style.setProperty('--paper', '#2D2D2D');
  root.style.setProperty('--paper-line', '#3D3D3D');
  root.style.setProperty('--ink', '#FFFFFF');
  root.style.setProperty('--ink-soft', '#AAAAAA');
  root.style.setProperty('--ink-light', '#666666');
  root.style.setProperty('--seal', '#4A6FA5');
  root.style.setProperty('--seal-light', '#6B8FC8');
  root.style.setProperty('--red', '#D9534F');
  root.style.setProperty('--red-light', '#E57373');
  root.style.setProperty('--gold', '#FFB74D');
  root.style.setProperty('--gold-light', '#FFCC80');
  root.style.setProperty('--green', '#66BB6A');
  root.style.setProperty('--green-light', '#81C784');
  
  document.body.style.backgroundImage = '';
  document.body.style.backgroundColor = '#1A1A1A';
}

function applyLightMode() {
  var root = document.documentElement;
  root.style.setProperty('--bg', '#FAF6EE');
  root.style.setProperty('--card', '#FFFDF8');
  root.style.setProperty('--paper', '#F2EBE0');
  root.style.setProperty('--paper-line', '#E7DCC8');
  root.style.setProperty('--ink', '#40342A');
  root.style.setProperty('--ink-soft', '#6B5D4D');
  root.style.setProperty('--ink-light', '#948A7C');
  root.style.setProperty('--seal', '#8C4A3C');
  root.style.setProperty('--seal-light', '#A85A48');
  root.style.setProperty('--red', '#9E3D33');
  root.style.setProperty('--red-light', '#B55648');
  root.style.setProperty('--gold', '#BFA76A');
  root.style.setProperty('--gold-light', '#D8C08C');
  root.style.setProperty('--green', '#6F7A4F');
  root.style.setProperty('--green-light', '#8A9668');
  
  document.body.style.backgroundImage = 'linear-gradient(0deg, transparent 23px, #E7DCC8 24px), linear-gradient(90deg, transparent 23px, #E7DCC8 24px)';
  document.body.style.backgroundSize = '24px 24px';
}

function clearCache() {
  showConfirm('清除缓存', '确定要清除缓存吗？\n\n将清理：\n• 临时数据\n• 缓存文件\n• AI生成缓存\n\n不会删除：\n• 用户数据\n• 收藏\n• 学习记录', 'warning', 
    function() {
      localStorage.removeItem('cacheData');
      localStorage.removeItem('aiCache');
      localStorage.removeItem('tempData');
      localStorage.removeItem('videoCache');
      
      var cacheVal = document.querySelector('.settings-row[onclick="clearCache()"] .val');
      if (cacheVal) {
        cacheVal.textContent = '0MB ›';
      }
      showConfirm('缓存清理完成', '缓存已成功清除', 'success');
    },
    null,
    true
  );
}

function openFeedback() {
  var html = '<div class="modal-overlay" style="display:flex;" id="feedback-modal" onclick="closeModal(\'feedback-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">版本反馈</div>' +
      '<div class="modal-close" onclick="closeModal(\'feedback-modal\')">×</div>' +
      '<div class="form-row">' +
        '<div class="form-label">反馈类型</div>' +
        '<select class="form-select" id="feedback-type">' +
          '<option value="bug">Bug反馈</option>' +
          '<option value="feature">功能建议</option>' +
          '<option value="other">其他问题</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-label">反馈内容</div>' +
        '<textarea class="form-input" id="feedback-content" rows="6" placeholder="请详细描述您遇到的问题或建议..."></textarea>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-label">联系方式（选填）</div>' +
        '<input type="text" class="form-input" id="feedback-contact" placeholder="邮箱或手机号"> ' +
      '</div>' +
      '<button class="save-btn" onclick="submitFeedback()">提交反馈</button>' +
    '</div></div>';
  
  var old = document.getElementById('feedback-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

// V5.0：此处原 submitFeedback 重复定义已删除，统一使用上方兼容两个弹窗的单一实现

function openAbout() {
  var html = '<div class="modal-overlay" style="display:flex;" id="about-modal" onclick="closeModal(\'about-modal\')">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-title">关于我们</div>' +
      '<div class="modal-close" onclick="closeModal(\'about-modal\')">×</div>' +
      '<div style="text-align:center;padding:20px 0;">' +
        '<div style="width:64px;height:64px;background:var(--seal);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:bold;">新</div>' +
        '<div style="font-size:18px;font-weight:600;color:var(--ink);margin-bottom:4px;">新传研背</div>' +
        '<div style="font-size:14px;color:var(--gold);">V3.0</div>' +
      '</div>' +
      '<div style="padding:0 16px;">' +
        '<div style="margin-bottom:12px;">' +
          '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px;">软件介绍</div>' +
          '<div style="font-size:13px;color:var(--ink-soft);line-height:1.6;">专注新闻传播学考研备考，提供名词解释、简答题、论述题的框架化学习与背诵辅助。</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px;">联系方式</div>' +
          '<div style="font-size:13px;color:var(--ink-soft);">邮箱：support@xinchuan.app</div>' +
          '<div style="font-size:13px;color:var(--ink-soft);">QQ群：123456789</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px;">开发信息</div>' +
          '<div style="font-size:13px;color:var(--ink-soft);">© 2026 新传研背团队</div>' +
          '<div style="font-size:13px;color:var(--ink-light);margin-top:4px;">版本号：v3.0.0</div>' +
        '</div>' +
      '</div>' +
      '<button class="save-btn" onclick="closeModal(\'about-modal\')">关闭</button>' +
    '</div></div>';
  
  var old = document.getElementById('about-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

document.addEventListener('DOMContentLoaded', function() {
  initDragAndDrop();

  // V5.1 修复：详情页的 load*Detail 必须由各详情页 HTML 自己的 window.load 监听器调用，
  // 不能在这里无差别全调——否则在 noun-detail.html 上会同时触发 loadShortDetail/loadEssayDetail，
  // 而这两个页面未加载 short-data.js / essay-data.js，typeof shortData/essayData === 'undefined'，
  // getCurrentShort/getCurrentEssay 返回 null 后 showDetailNotFound 会把 .app-body 替换成空态，
  // 造成"头部正确但正文显示论述题空态"的串页 bug。
  
  var savedAvatar = localStorage.getItem('userAvatar');
  var savedNickname = localStorage.getItem('userNickname');
  var info = getUserInfo();
  // B7：profile 头像+昵称+天数——无论有没有存值都覆盖，避免页面残留写死的"林"/"林同学"
  var nameToUse = savedNickname || info.nickname;
  var avatarChar = savedAvatar || (nameToUse ? nameToUse.charAt(0) : '我');
  
  var avatarEl = document.querySelector('.profile-avatar');
  if (avatarEl) {
    var img = localStorage.getItem('avatarImage');
    if (img) {
      avatarEl.style.backgroundImage = 'url(' + img + ')';
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
    } else {
      avatarEl.textContent = avatarChar;
    }
  }
  
  var names = document.querySelectorAll('.profile-name, .name');
  names.forEach(function(n) { n.textContent = nameToUse; });
  
  // profile-stats 的"已坚持X天"动态替换
  var daysEl = document.getElementById('profile-user-days');
  if (daysEl) {
    var savedDays = localStorage.getItem('studyDays') || '1';
    daysEl.textContent = '新传考研 · 已坚持 ' + savedDays + ' 天';
  }
  
  // 首页 avatar / avatarColor 兼容处理
  var savedAvatarImage = localStorage.getItem('avatarImage');
  var savedAvatarColor = localStorage.getItem('avatarColor');
  var homeAvatarEl = document.querySelector('.home-user .avatar');
  if (savedAvatarImage && homeAvatarEl) {
    homeAvatarEl.style.backgroundImage = 'url(' + savedAvatarImage + ')';
    homeAvatarEl.style.backgroundSize = 'cover';
    homeAvatarEl.style.backgroundPosition = 'center';
  } else if (savedAvatarColor) {
    var paE = document.querySelector('.profile-avatar');
    if (paE) paE.style.background = savedAvatarColor;
    if (homeAvatarEl) homeAvatarEl.style.background = savedAvatarColor;
  }
  
  var reminderSwitch = document.getElementById('reminder-switch');
  if (reminderSwitch) {
    var reminderEnabled = localStorage.getItem('reminderEnabled');
    if (reminderEnabled === 'false') {
      reminderSwitch.classList.remove('on');
    } else {
      reminderSwitch.classList.add('on');
    }
  }
  
  var autoplaySwitch = document.getElementById('autoplay-switch');
  if (autoplaySwitch) {
    var autoPlayEnabled = localStorage.getItem('autoPlayVideo');
    if (autoPlayEnabled === 'false') {
      autoplaySwitch.classList.remove('on');
    } else {
      autoplaySwitch.classList.add('on');
    }
  }
  
  var darkModeSwitch = document.getElementById('darkmode-switch');
  if (darkModeSwitch) {
    var darkModeEnabled = localStorage.getItem('darkMode');
    var themeVersion = localStorage.getItem('themeVersion');
    if (darkModeEnabled === 'true' && themeVersion === 'v3') {
      darkModeSwitch.classList.add('on');
      applyDarkMode();
    } else {
      darkModeSwitch.classList.remove('on');
      applyLightMode();
    }
  }
  
  var fontSize = localStorage.getItem('fontSize');
  if (fontSize) {
    applyFontSize(fontSize);
  }
  
  var autoPlayVideo = localStorage.getItem('autoPlayVideo');
  var playBtn = document.getElementById('play-btn');
  if (playBtn && autoPlayVideo !== 'false' && currentTerm === '沉默的螺旋') {
    setTimeout(function() {
      playVideo();
    }, 1000);
  }
  
  renderPosts();
  
  var favBtns = document.querySelectorAll('.icon-btn:nth-child(1)');
  favBtns.forEach(function(btn) {
    btn.onclick = toggleFavorite;
  });
  
  var noteBtns = document.querySelectorAll('.icon-btn:nth-child(2)');
  noteBtns.forEach(function(btn) {
    btn.onclick = openNoteModal;
  });
});

// ===== 简答题模块 =====

function getAllShortIds() {
  if (typeof shortData !== 'undefined' && shortData.items) {
    return shortData.items.map(function(item) { return item.id; });
  }
  return ['short001', 'short002', 'short003', 'short004', 'short005'];
}

function getCurrentShort() {
  if (typeof shortData !== 'undefined' && shortData.items) {
    var urlParams = new URLSearchParams(window.location.search);
    var shortId = urlParams.get('short') || 'short001';
    return shortData.items.find(function(item) { return item.id === shortId; });
  }
  return null;
}

function prevShort() {
  var shorts = getAllShortIds();
  var urlParams = new URLSearchParams(window.location.search);
  var currentId = urlParams.get('short') || 'short001';
  var currentIndex = shorts.indexOf(currentId);
  if (currentIndex === -1) currentIndex = 0;
  var prevIndex = (currentIndex - 1 + shorts.length) % shorts.length;
  window.location.href = 'short-detail.html?short=' + shorts[prevIndex];
}

function nextShort() {
  var shorts = getAllShortIds();
  var urlParams = new URLSearchParams(window.location.search);
  var currentId = urlParams.get('short') || 'short001';
  var currentIndex = shorts.indexOf(currentId);
  if (currentIndex === -1) currentIndex = 0;
  var nextIndex = (currentIndex + 1) % shorts.length;
  window.location.href = 'short-detail.html?short=' + shorts[nextIndex];
}

function loadShortDetail() {
  var short = getCurrentShort();
  if (!short) {
    var missShortId = new URLSearchParams(window.location.search).get('short') || '';
    showDetailNotFound('简答题「' + missShortId + '」可能已被下架，或链接有误。');
    return;
  }
  currentTerm = short.title; // V5.0：AI助记/模板随当前简答题动态化

  var catEl = document.getElementById('short-category');
  if (catEl) catEl.textContent = '‹ ' + short.category;

  var titleEl = document.getElementById('short-title');
  if (titleEl) titleEl.textContent = short.title;

  var tagEl = document.getElementById('short-tag');
  if (tagEl) tagEl.textContent = short.score + '分·' + short.wordLimit + '字';

  var answerEl = document.getElementById('short-answer-text');
  if (answerEl) answerEl.innerHTML = short.answer;

  var memoryEl = document.getElementById('short-memory-tip');
  if (memoryEl) {
    var memHtml = '<div style="font-weight:600;margin-bottom:8px;color:var(--ink);">辅助记忆口诀</div>';
    memHtml += '<div style="background:#FFF8E1;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:13px;line-height:1.6;color:var(--ink);">' + escapeHtml(short.memoryTip || '') + '</div>';
    memHtml += '<div style="font-weight:600;margin-bottom:8px;color:var(--ink);">完整答案内容</div>';
    memHtml += '<div style="font-size:13px;line-height:1.7;color:var(--ink);">' + short.answer + '</div>';
    memoryEl.innerHTML = memHtml;
  }

  var flashcardEl = document.getElementById('short-flashcard-question');
  if (flashcardEl) flashcardEl.textContent = short.question;

  var frameworkAnswerEl = document.getElementById('short-framework-answer');
  if (frameworkAnswerEl) {
    var frameworkHtml = '<b>答题框架：</b><br>';
    short.framework.forEach(function(item, i) {
      frameworkHtml += item.label + '：' + item.text + '<br><br>';
    });
    frameworkAnswerEl.innerHTML = frameworkHtml;
  }

  var variantsContainer = document.getElementById('short-variants-container');
  if (variantsContainer) {
    variantsContainer.innerHTML = short.variants.map(function(v) {
      return '<div class="sub-section"><div class="sub-section-title">' + v.title + '</div><div class="sub-section-content">' + v.content + '</div></div>';
    }).join('');
  }

  var stepperContainer = document.getElementById('short-frame-stepper');
  if (stepperContainer && short.framework) {
    var stepperHtml = '';
    short.framework.forEach(function(item) {
      stepperHtml += '<div class="step">' +
        '<div class="step-dot"></div>' +
        '<div>' +
        '<div class="step-label">' + item.label + '</div>' +
        '<div class="step-text">' + item.text + '</div>' +
        '</div>' +
        '</div>';
    });
    stepperContainer.innerHTML = stepperHtml;
  }

  renderSelfTest(short);
}

function renderSelfTest(short) {
  if (!short || !short.selfTest) return;
  var st = short.selfTest;

  // 拖拽还原
  if (st.drag) {
    var dragPanel = document.getElementById('selftest-drag');
    if (dragPanel) {
      var dragHint = dragPanel.querySelector('.drop-hint');
      if (dragHint) dragHint.textContent = st.drag.hint;
    }
    var chipPool = document.getElementById('short-chip-pool');
    if (chipPool) {
      chipPool.innerHTML = '';
      var chips = st.drag.chips.slice();
      for (var i = chips.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = chips[i]; chips[i] = chips[j]; chips[j] = tmp;
      }
      chips.forEach(function(chip) {
        var el = document.createElement('div');
        el.className = 'chip';
        el.setAttribute('draggable', 'true');
        el.setAttribute('data-order', chip.order);
        el.innerHTML = '<span class="drag-dot">::</span>' + chip.text;
        chipPool.appendChild(el);
      });
      initDragAndDrop();
    }
  }

  // 填空记忆
  if (st.fill) {
    var fillPanel = document.getElementById('selftest-fill');
    if (fillPanel) {
      var fillHint = fillPanel.querySelector('.drop-hint');
      if (fillHint) fillHint.textContent = st.fill.hint;
      var fillArea = fillPanel.querySelector('.fill-blank-area');
      if (fillArea) {
        fillArea.innerHTML = '';
        st.fill.blanks.forEach(function(b) {
          var item = document.createElement('div');
          item.className = 'blank-item';
          var safeAnswer = String(b.answer).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          item.innerHTML = '<span>' + b.before + '</span><span class="blank" onclick="fillBlank(this, \'' + safeAnswer + '\')">______</span><span>' + b.after + '</span>';
          fillArea.appendChild(item);
        });
      }
    }
  }

  // 框架默写
  if (st.framework) {
    var fwPanel = document.getElementById('selftest-framework');
    if (fwPanel) {
      var fwHint = fwPanel.querySelector('.drop-hint');
      if (fwHint) fwHint.textContent = st.framework.hint;
    }
    var fwAnswer = document.getElementById('short-framework-answer');
    if (fwAnswer) {
      fwAnswer.innerHTML = st.framework.answer;
    }
  }

  // 红膜背诵
  if (st.redfilm) {
    var rfPanel = document.getElementById('selftest-redfilm');
    if (rfPanel) {
      var rfHint = rfPanel.querySelector('.drop-hint');
      if (rfHint) rfHint.textContent = st.redfilm.hint;
      var rfArea = rfPanel.querySelector('.fill-blank-area');
      if (rfArea) {
        rfArea.innerHTML = '';
        st.redfilm.segments.forEach(function(seg) {
          var item = document.createElement('div');
          item.className = 'blank-item';
          item.innerHTML = '<span>' + seg + '</span>';
          rfArea.appendChild(item);
        });
      }
    }
  }

  // 闪卡模式
  if (st.flashcard) {
    var fcContent = document.getElementById('selftest-flashcard-content');
    if (fcContent) {
      var fcHtml = '<div class="flashcard-area">';
      fcHtml += '<div class="flashcard-question" id="short-flashcard-question">' + escapeHtml(st.flashcard.question) + '</div>';
      fcHtml += '<div class="flashcard-answer-box" id="short-flashcard-answer" onclick="toggleFlashcard(this)">';
      fcHtml += '<div class="flashcard-answer-hidden">' + escapeHtml(st.flashcard.answer) + '</div>';
      fcHtml += '</div>';
      fcHtml += '<button class="flashcard-toggle-btn" onclick="toggleFlashcard(document.getElementById(\'short-flashcard-answer\'))">切换答案显示</button>';
      fcHtml += '</div>';
      fcContent.innerHTML = fcHtml;
    }
  }
}

// ===== 论述题模块 =====

function getAllEssayIds() {
  if (typeof essayData !== 'undefined' && essayData.items) {
    return essayData.items.map(function(item) { return item.id; });
  }
  return ['essay001', 'essay002', 'essay003', 'essay004'];
}

function getCurrentEssay() {
  if (typeof essayData !== 'undefined' && essayData.items) {
    var urlParams = new URLSearchParams(window.location.search);
    var essayId = urlParams.get('essay') || 'essay001';
    return essayData.items.find(function(item) { return item.id === essayId; });
  }
  return null;
}

function prevEssay() {
  var essays = getAllEssayIds();
  var urlParams = new URLSearchParams(window.location.search);
  var currentId = urlParams.get('essay') || 'essay001';
  var currentIndex = essays.indexOf(currentId);
  if (currentIndex === -1) currentIndex = 0;
  var prevIndex = (currentIndex - 1 + essays.length) % essays.length;
  window.location.href = 'essay-detail.html?essay=' + essays[prevIndex];
}

function nextEssay() {
  var essays = getAllEssayIds();
  var urlParams = new URLSearchParams(window.location.search);
  var currentId = urlParams.get('essay') || 'essay001';
  var currentIndex = essays.indexOf(currentId);
  if (currentIndex === -1) currentIndex = 0;
  var nextIndex = (currentIndex + 1) % essays.length;
  window.location.href = 'essay-detail.html?essay=' + essays[nextIndex];
}

function loadEssayDetail() {
  try {
    var essay = getCurrentEssay();
    if (!essay) {
      var missEssayId = new URLSearchParams(window.location.search).get('essay') || '';
      showDetailNotFound('论述题「' + missEssayId + '」可能已被下架，或链接有误。');
      return;
    }
    currentTerm = essay.title; // V5.0：AI助记/模板随当前论述题动态化

    var catEl = document.getElementById('essay-category');
    if (catEl) catEl.textContent = '‹ ' + essay.category;

    var titleEl = document.getElementById('essay-title');
    if (titleEl) titleEl.textContent = essay.title;

    var tagEl = document.getElementById('essay-tag');
    if (tagEl) tagEl.textContent = essay.score + '分·' + essay.wordLimit + '字';

    var answerEl = document.getElementById('essay-answer-text');
    if (answerEl) answerEl.innerHTML = essay.answer;

    var memoryEl = document.getElementById('essay-memory-tip');
    if (memoryEl) memoryEl.textContent = essay.memoryTip;

    var flashcardEl = document.getElementById('essay-flashcard-question');
    if (flashcardEl) flashcardEl.textContent = essay.question;

    var frameworkAnswerEl = document.getElementById('essay-framework-answer');
    if (frameworkAnswerEl) {
      frameworkAnswerEl.innerHTML = '<b>答题框架：</b><br>' + essay.framework.opening.outline + '<br><br>' + essay.framework.arguments.map(function(arg, i) { return '第' + (i + 1) + '部分：' + arg.title + '<br><br>'; }).join('') + essay.framework.closing.outline;
    }

    var variantsContainer = document.getElementById('essay-variants-container');
    if (variantsContainer) {
      variantsContainer.innerHTML = essay.variants.map(function(v) {
        return '<div class="sub-section"><div class="sub-section-title">' + v.title + '</div><div class="sub-section-content">' + v.content + '</div></div>';
      }).join('');
    }

    renderEssayFramework(essay);
  } catch (e) {
    console.error('Error in loadEssayDetail:', e);
  }
}

function renderEssayFramework(essay) {
  try {
    var container = document.getElementById('essay-frame-content');
    if (!container) return;

    var topicTag = essay.noTopic ? '无专题' : essay.topic;

    var content = '<div class="topic-tag-bar"><span class="topic-tag">' + topicTag + '</span></div>';

    content += '<div class="framework-card">';

    content += '<div class="framework-section opening-section">';
    content += '<div class="section-header"><span class="section-label">开头 · ' + essay.openingType + '</span><span class="sample-btn" onclick="toggleEssaySample(\'opening\')">范文</span></div>';
    content += '<div class="section-content">' + essay.framework.opening.outline + '</div>';
    content += '<div class="sample-content" id="sample-opening" style="display:none;">' + essay.framework.opening.sample + '</div>';
    content += '</div>';

    content += '<div class="framework-section arguments-section">';
    content += '<div class="section-header"><span class="section-label">正文分论点</span></div>';

    for (var i = 0; i < essay.framework.arguments.length; i++) {
      var arg = essay.framework.arguments[i];
      content += '<div class="argument-block" onclick="toggleArgumentExpand(\'arg-' + arg.id + '\')">';
      content += '<div class="argument-header">';
      content += '<span class="argument-number">' + (i + 1) + '</span>';
      content += '<span class="argument-title">' + arg.title + '</span>';
      content += '<span class="argument-expand">›</span>';
      content += '<span class="sample-btn small" onclick="event.stopPropagation();toggleEssaySample(\'' + arg.id + '\')">范文</span>';
      content += '</div>';
      content += '<div class="argument-detail" id="arg-' + arg.id + '" style="display:none;">';
      content += '<div class="detail-row"><span class="detail-label">核心论点：</span><span>' + arg.corePoint + '</span></div>';
      content += '<div class="detail-row"><span class="detail-label">可用论据：</span></div>';
      content += '<ul class="evidence-list">';
      for (var j = 0; j < arg.evidence.length; j++) {
        content += '<li>' + arg.evidence[j] + '</li>';
      }
      content += '</ul>';
      content += '<div class="detail-row"><span class="detail-label">段落论证思路：</span><span>' + arg.thinking + '</span></div>';
      content += '<div class="sample-content" id="sample-' + arg.id + '" style="display:none;">' + arg.sample + '</div>';
      content += '</div>';
      content += '</div>';
    }

    content += '</div>';

    content += '<div class="framework-section closing-section">';
    content += '<div class="section-header"><span class="section-label">结尾 · ' + essay.closingType + '</span><span class="sample-btn" onclick="toggleEssaySample(\'closing\')">范文</span></div>';
    content += '<div class="section-content">' + essay.framework.closing.outline + '</div>';
    content += '<div class="sample-content" id="sample-closing" style="display:none;">' + essay.framework.closing.sample + '</div>';
    content += '</div>';

    content += '<div class="framework-template-section" onclick="toggleTemplatePanel()">';
    content += '<div class="template-header"><span class="template-title">📋 答题框架模板库</span><span class="template-toggle">‹</span></div>';
    content += '<div class="template-content" id="template-content" style="display:none;">';
    content += '<div class="template-list">';
    content += '<div class="template-item" onclick="applyTemplate(\'递进\')"><div class="template-name">递进框架</div><div class="template-desc">是什么→为什么→怎么样</div></div>';
    content += '<div class="template-item" onclick="applyTemplate(\'并列\')"><div class="template-name">并列框架</div><div class="template-desc">多个分论点并列展开</div></div>';
    content += '<div class="template-item" onclick="applyTemplate(\'5w\')"><div class="template-name">5W传播要素</div><div class="template-desc">Who/What/When/Where/Why</div></div>';
    content += '<div class="template-item" onclick="applyTemplate(\'petcsi\')"><div class="template-name">PETCSI社会六维</div><div class="template-desc">政治/经济/技术/文化/社会/国际</div></div>';
    content += '<div class="template-item" onclick="applyTemplate(\'multiagent\')"><div class="template-name">多主体框架</div><div class="template-desc">政府/媒体/公众/企业</div></div>';
    content += '<div class="template-item" onclick="applyTemplate(\'bmr\')"><div class="template-name">BMR动因框架</div><div class="template-desc">利益/机制/资源</div></div>';
    content += '<div class="template-item" onclick="applyTemplate(\'governance\')"><div class="template-name">治理三维框架</div><div class="template-desc">制度/技术/文化</div></div>';
    content += '<div class="template-item" onclick="applyTemplate(\'theory\')"><div class="template-name">理论辨析框架</div><div class="template-desc">概念界定→理论溯源→实践应用</div></div>';
    content += '</div>';
    content += '<div class="save-template-btn" onclick="saveCustomTemplate()">保存自定义模板</div>';
    content += '</div></div>';

    content += '<div class="full-sample-section" onclick="toggleFullSample()">';
    content += '<div class="full-sample-header"><span class="full-sample-title">📝 完整范文</span><span class="full-sample-toggle">‹</span></div>';
    content += '<div class="full-sample-content" id="full-sample-content" style="display:none;">' + essay.fullSample.replace(/\n/g, '<br>') + '</div>';
    content += '</div>';

    content += '</div>';

    container.innerHTML = content;
  } catch (e) {
    console.error('Error in renderEssayFramework:', e);
  }
}

function toggleArgumentExpand(argId) {
  var detail = document.getElementById(argId);
  if (detail) {
    var isHidden = detail.style.display === 'none';
    detail.style.display = isHidden ? 'block' : 'none';
    var header = detail.parentElement ? detail.parentElement.querySelector('.argument-header .argument-expand') : null;
    if (header) header.textContent = isHidden ? '‹' : '›';
  }
}

function toggleEssaySample(id) {
  var sample = document.getElementById('sample-' + id);
  if (sample) {
    var isHidden = sample.style.display === 'none';
    sample.style.display = isHidden ? 'block' : 'none';
  }
}

function toggleTemplatePanel() {
  var content = document.getElementById('template-content');
  var toggle = document.querySelector('.template-toggle');
  if (content) {
    var isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    if (toggle) toggle.textContent = isHidden ? '›' : '‹';
  }
}

function applyTemplate(type) {
  var essay = getCurrentEssay();
  if (!essay) return;

  var templates = {
    '递进': {
      opening: { outline: '提出问题：简述研究背景与意义', sample: '在当今数字化时代，媒介技术的飞速发展深刻改变了人们的信息获取和传播方式...' },
      arguments: [
        { id: 'arg1', title: '是什么', corePoint: '概念界定与内涵分析', evidence: ['定义解析', '核心特征', '相关概念辨析'], thinking: '首先明确研究对象的基本概念，分析其核心特征和内涵，为后续分析奠定基础。' },
        { id: 'arg2', title: '为什么', corePoint: '成因分析与理论溯源', evidence: ['历史背景', '理论基础', '现实动因'], thinking: '从历史和现实两个维度分析问题产生的原因，结合相关理论进行深度解读。' },
        { id: 'arg3', title: '怎么样', corePoint: '影响评估与对策建议', evidence: ['正面影响', '负面影响', '应对策略'], thinking: '评估问题带来的多方面影响，提出针对性的解决思路和对策建议。' }
      ],
      closing: { outline: '总结提升：展望未来发展方向', sample: '综上所述，该问题不仅具有理论研究价值，更对实践应用具有重要指导意义...' }
    },
    '并列': {
      opening: { outline: '总起：概括问题的重要性', sample: '随着社会发展和技术进步，该问题日益凸显，需要从多个维度进行深入分析...' },
      arguments: [
        { id: 'arg1', title: '维度一', corePoint: '第一个分析维度', evidence: ['相关数据', '典型案例', '理论支撑'], thinking: '从第一个维度展开分析，结合具体实例说明其表现和影响。' },
        { id: 'arg2', title: '维度二', corePoint: '第二个分析维度', evidence: ['相关数据', '典型案例', '理论支撑'], thinking: '从第二个维度展开分析，与第一个维度形成并列关系。' },
        { id: 'arg3', title: '维度三', corePoint: '第三个分析维度', evidence: ['相关数据', '典型案例', '理论支撑'], thinking: '从第三个维度展开分析，丰富分析的全面性。' }
      ],
      closing: { outline: '总结：归纳各维度的共同指向', sample: '综合以上分析，各个维度虽然角度不同，但都指向同一个核心问题...' }
    },
    '5w': {
      opening: { outline: '引入：事件概述', sample: '近期发生的XX事件引起了广泛关注，该事件涉及多个层面的传播问题...' },
      arguments: [
        { id: 'arg1', title: 'Who（谁）', corePoint: '传播主体分析', evidence: ['传者身份', '传播动机', '权力关系'], thinking: '分析传播活动中的主体，包括传者、组织、机构等及其相互关系。' },
        { id: 'arg2', title: 'What（什么）', corePoint: '传播内容分析', evidence: ['信息特征', '内容结构', '意识形态'], thinking: '分析传播的具体内容，包括信息的形式、内容和意义。' },
        { id: 'arg3', title: 'When/Where（何时何地）', corePoint: '传播时空分析', evidence: ['时间节点', '空间范围', '传播渠道'], thinking: '分析传播发生的时间和空间背景，以及传播渠道的特点。' },
        { id: 'arg4', title: 'Why（为什么）', corePoint: '传播动因分析', evidence: ['社会背景', '技术条件', '文化因素'], thinking: '分析传播活动发生的深层原因和背景条件。' }
      ],
      closing: { outline: '总结：5W要素的相互作用', sample: '通过5W模式分析，可以清晰地看到各要素之间的相互作用关系...' }
    },
    'petcsi': {
      opening: { outline: '引言：问题的多维度审视', sample: '该问题涉及社会多个层面，需要从政治、经济、技术、文化、社会、国际六个维度进行综合分析...' },
      arguments: [
        { id: 'arg1', title: '政治维度', corePoint: '政策与制度影响', evidence: ['相关政策', '制度安排', '权力结构'], thinking: '分析政治层面的影响因素，包括政策法规和制度安排。' },
        { id: 'arg2', title: '经济维度', corePoint: '市场与利益驱动', evidence: ['经济利益', '市场机制', '产业结构'], thinking: '分析经济层面的影响因素，包括市场规律和利益驱动。' },
        { id: 'arg3', title: '技术维度', corePoint: '技术变革推动', evidence: ['技术发展', '平台特性', '传播技术'], thinking: '分析技术层面的影响因素，包括技术发展和平台特性。' },
        { id: 'arg4', title: '文化维度', corePoint: '文化观念影响', evidence: ['文化传统', '价值观念', '意识形态'], thinking: '分析文化层面的影响因素，包括文化传统和价值观念。' },
        { id: 'arg5', title: '社会维度', corePoint: '社会结构影响', evidence: ['社会阶层', '群体关系', '社会规范'], thinking: '分析社会层面的影响因素，包括社会结构和群体关系。' },
        { id: 'arg6', title: '国际维度', corePoint: '国际环境影响', evidence: ['全球趋势', '国际合作', '文化交流'], thinking: '分析国际层面的影响因素，包括全球化趋势和国际合作。' }
      ],
      closing: { outline: '总结：多维度整合分析', sample: '综合PETCSI六个维度的分析，可以全面把握该问题的复杂性...' }
    },
    'multiagent': {
      opening: { outline: '总起：多主体互动格局', sample: '在现代传播体系中，政府、媒体、公众、企业等多个主体相互作用，共同构成复杂的传播生态...' },
      arguments: [
        { id: 'arg1', title: '政府', corePoint: '监管与引导', evidence: ['政策制定', '舆论引导', '行业管理'], thinking: '分析政府在传播活动中的角色，包括政策制定和舆论引导。' },
        { id: 'arg2', title: '媒体', corePoint: '内容生产与传播', evidence: ['新闻生产', '议程设置', '舆论监督'], thinking: '分析媒体在传播活动中的角色，包括内容生产和议程设置。' },
        { id: 'arg3', title: '公众', corePoint: '参与与反馈', evidence: ['信息获取', '意见表达', '舆论形成'], thinking: '分析公众在传播活动中的角色，包括信息获取和意见表达。' },
        { id: 'arg4', title: '企业', corePoint: '商业驱动与营销', evidence: ['广告投放', '品牌传播', '商业合作'], thinking: '分析企业在传播活动中的角色，包括商业营销和品牌传播。' }
      ],
      closing: { outline: '总结：多主体协同治理', sample: '多主体的协同合作是构建健康传播生态的关键...' }
    },
    'bmr': {
      opening: { outline: '引言：动因分析框架', sample: '任何社会现象的产生都有其深层动因，本文从利益、机制、资源三个维度分析该问题的成因...' },
      arguments: [
        { id: 'arg1', title: '利益（Benefit）', corePoint: '利益驱动因素', evidence: ['经济利益', '政治利益', '社会利益'], thinking: '分析利益相关方的诉求和动机，揭示利益驱动的深层原因。' },
        { id: 'arg2', title: '机制（Mechanism）', corePoint: '制度与机制因素', evidence: ['制度设计', '运行机制', '激励机制'], thinking: '分析制度和机制层面的因素，包括规则设计和运行方式。' },
        { id: 'arg3', title: '资源（Resource）', corePoint: '资源配置因素', evidence: ['信息资源', '技术资源', '人力资源'], thinking: '分析资源配置层面的因素，包括信息、技术和人力等资源的分配。' }
      ],
      closing: { outline: '总结：BMR框架的应用价值', sample: 'BMR动因框架为分析复杂社会问题提供了有效的分析工具...' }
    },
    'governance': {
      opening: { outline: '引言：治理体系构建', sample: '构建有效的治理体系需要从制度、技术、文化三个维度协同推进...' },
      arguments: [
        { id: 'arg1', title: '制度维度', corePoint: '制度建设与完善', evidence: ['法律法规', '政策体系', '监管机制'], thinking: '分析制度层面的治理措施，包括法律法规和政策体系的完善。' },
        { id: 'arg2', title: '技术维度', corePoint: '技术赋能与治理', evidence: ['技术手段', '平台治理', '算法优化'], thinking: '分析技术层面的治理措施，包括技术手段和平台治理。' },
        { id: 'arg3', title: '文化维度', corePoint: '文化培育与引导', evidence: ['媒介素养', '价值观念', '社会共识'], thinking: '分析文化层面的治理措施，包括媒介素养提升和社会共识培育。' }
      ],
      closing: { outline: '总结：三维协同治理', sample: '制度、技术、文化三个维度的协同作用是实现有效治理的关键...' }
    },
    'theory': {
      opening: { outline: '引言：理论溯源', sample: '该理论是传播学领域的重要理论，其形成和发展经历了多个阶段...' },
      arguments: [
        { id: 'arg1', title: '概念界定', corePoint: '理论核心概念', evidence: ['定义解析', '核心要素', '概念演变'], thinking: '明确理论的核心概念和定义，分析其基本要素。' },
        { id: 'arg2', title: '理论溯源', corePoint: '理论形成背景', evidence: ['学术背景', '理论基础', '发展历程'], thinking: '追溯理论的形成背景和发展历程，分析其学术渊源。' },
        { id: 'arg3', title: '实践应用', corePoint: '理论的现实价值', evidence: ['案例分析', '实践指导', '局限性'], thinking: '分析理论在实践中的应用，包括案例分析和实践指导意义。' }
      ],
      closing: { outline: '总结：理论价值与展望', sample: '该理论不仅具有重要的学术价值，更对实践具有指导意义...' }
    }
  };

  var template = templates[type];
  if (!template) return;

  essay.framework.opening = template.opening;
  essay.framework.arguments = template.arguments;
  essay.framework.closing = template.closing;

  renderEssayFramework(essay);
  showConfirm('模板应用成功', '已应用' + getTemplateName(type) + '，可在此基础上进行修改。', 'success');
}

function getTemplateName(type) {
  var names = {
    '递进': '递进框架',
    '并列': '并列框架',
    '5w': '5W传播要素框架',
    'petcsi': 'PETCSI社会六维框架',
    'multiagent': '多主体框架',
    'bmr': 'BMR动因框架',
    'governance': '治理三维框架',
    'theory': '理论辨析框架'
  };
  return names[type] || type;
}

function saveCustomTemplate() {
  showConfirm('保存模板', '自定义答题模板已保存，可在模板库中查看和使用。', 'success');
}

function toggleFullSample() {
  var content = document.getElementById('full-sample-content');
  var toggle = document.querySelector('.full-sample-toggle');
  if (content) {
    var isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    if (toggle) toggle.textContent = isHidden ? '›' : '‹';
  }
}
