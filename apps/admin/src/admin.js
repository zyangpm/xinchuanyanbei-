// ===== 新传研背 管理后台 逻辑 =====

var pageNames = {
  dashboard: '数据概览',
  material: '资料管理',
  ai: 'AI生成',
  review: '内容审核',
  bank: '题库管理',
  publish: '发布管理',
  stats: '数据统计',
  feedback: '用户反馈'
};

var DEFAULT_ADMIN = 'admin';

// ===== 登录处理 =====
function handleLogin(event) {
  event.preventDefault();
  var username = document.getElementById('admin-username').value.trim();
  var password = document.getElementById('admin-password').value.trim();

  if (!username) { showHint('请输入管理员账号'); return false; }
  if (!password) { showHint('请输入密码'); return false; }

  var btn = document.querySelector('.login-btn');
  btn.textContent = '登录中...';
  btn.style.opacity = '0.7';

  setTimeout(function() {
    sessionStorage.setItem('adminLoggedIn', 'true');
    sessionStorage.setItem('adminName', username);
    window.location.href = 'dashboard.html';
  }, 800);
  return false;
}

function handleLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminName');
  window.location.href = 'index.html';
}

// ===== 页面切换 =====
function switchPage(pageName, navEl) {
  var pages = document.querySelectorAll('.page-content');
  pages.forEach(function(p) { p.style.display = 'none'; });

  var target = document.getElementById('page-' + pageName);
  if (target) target.style.display = 'block';

  var navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(function(n) { n.classList.remove('active'); });
  if (navEl) navEl.classList.add('active');

  var nameEl = document.getElementById('current-page-name');
  if (nameEl && pageNames[pageName]) nameEl.textContent = pageNames[pageName];

  // 切换页面时触发渲染
  if (pageName === 'dashboard') refreshDashboard();
  if (pageName === 'material') renderMaterials();
  if (pageName === 'ai') loadAIMaterialSelect();
  if (pageName === 'review') renderReviewList();
  if (pageName === 'bank') renderQuestions();
  if (pageName === 'publish') renderPublishPage();
  if (pageName === 'stats') refreshStats();
  if (pageName === 'feedback') renderFeedbacks();
}

function switchPageByName(pageName) {
  var navItems = document.querySelectorAll('.nav-item');
  var targetNav = null;
  navItems.forEach(function(n) {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').indexOf(pageName) > -1) targetNav = n;
  });
  switchPage(pageName, targetNav);
}

// ===== 提示弹窗 =====
function showHint(message) {
  var modal = document.getElementById('hint-modal');
  var msg = document.getElementById('hint-message');
  if (modal && msg) { msg.textContent = message; modal.style.display = 'flex'; }
}
function closeHint() {
  var modal = document.getElementById('hint-modal');
  if (modal) modal.style.display = 'none';
}

// ===== 工具函数 =====
function typeLabel(type) {
  var map = { noun: '名词解释', short: '简答题', essay: '论述题', practice: '实务题' };
  return map[type] || type;
}
function statusLabel(status) {
  var map = { published: '已发布', draft: '草稿', reviewing: '待审核', approved: '已通过', rejected: '已退回', unpublished: '已下架', pending: '待发布', done: '已解析', parsing: '解析中', failed: '解析失败' };
  return map[status] || status;
}
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== 数据概览 =====
function refreshDashboard() {
  var stats = DB.getStats();
  var cards = document.querySelectorAll('#page-dashboard .stat-card .stat-value');
  if (cards.length >= 4) {
    cards[0].textContent = stats.nounCount;
    cards[1].textContent = stats.shortCount;
    cards[2].textContent = stats.essayCount;
    cards[3].textContent = stats.practiceCount;
  }

  var reviewing = DB.getContents('reviewing');
  var tbody = document.querySelector('#page-dashboard .data-table tbody');
  if (tbody) {
    if (reviewing.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--ink-light);">暂无待审核内容</td></tr>';
    } else {
      tbody.innerHTML = reviewing.map(function(c) {
        return '<tr>' +
          '<td>' + typeLabel(c.questionType) + '</td>' +
          '<td>' + escapeHtml(c.title) + '</td>' +
          '<td>' + (c.aiModel || 'AI') + '生成</td>' +
          '<td><span class="status-tag reviewing">待审核</span></td>' +
          '<td><span class="btn btn-ghost" style="padding:4px 12px;font-size:12px;" onclick="switchPageByName(\'review\')">审核</span></td>' +
          '</tr>';
      }).join('');
    }
  }

  // 更新侧边栏审核徽章
  var badge = document.querySelector('.nav-badge');
  if (badge) badge.textContent = reviewing.length;
}

// ===== 资料管理 =====
function renderMaterials() {
  var sourceFilter = document.getElementById('material-source-filter');
  var searchInput = document.getElementById('material-search');
  var sourceVal = sourceFilter ? sourceFilter.value : 'all';
  var searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

  var list = DB.getMaterials();
  if (sourceVal !== 'all') {
    list = list.filter(function(m) { return m.sourceType === sourceVal; });
  }
  if (searchVal) {
    list = list.filter(function(m) { return m.title.toLowerCase().indexOf(searchVal) > -1; });
  }

  var container = document.getElementById('material-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><div class="empty-state-text">暂无资料，请上传资料</div></div>';
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>文件名称</th><th>来源</th><th>类型</th><th>字数</th><th>章节</th><th>解析状态</th><th>上传时间</th><th>操作</th>' +
    '</tr></thead><tbody>';

  list.forEach(function(m) {
    var statusClass = m.parseStatus === 'done' ? 'published' : (m.parseStatus === 'parsing' ? 'reviewing' : 'rejected');
    html += '<tr>' +
      '<td><strong>' + escapeHtml(m.title) + '</strong></td>' +
      '<td>' + m.sourceType + '</td>' +
      '<td>' + m.fileType + '</td>' +
      '<td>' + (m.wordCount ? (m.wordCount / 10000).toFixed(1) + '万字' : '-') + '</td>' +
      '<td>' + (m.chapterInfo || '-') + '</td>' +
      '<td><span class="status-tag ' + statusClass + '">' + statusLabel(m.parseStatus) + '</span></td>' +
      '<td>' + (m.createdAt || '-') + '</td>' +
      '<td>' +
        '<span class="btn btn-ghost" style="padding:4px 10px;font-size:12px;margin-right:4px;" onclick="viewMaterial(' + m.id + ')">查看</span>' +
        '<span class="btn btn-danger" style="padding:4px 10px;font-size:12px;" onclick="confirmDeleteMaterial(' + m.id + ')">删除</span>' +
      '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function openUploadModal() {
  var html = '<div class="modal-overlay" style="display:flex;" id="upload-modal">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-header"><span class="modal-title">上传资料</span><span class="modal-close" onclick="closeUploadModal()">×</span></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">资料名称</label>' +
          '<input type="text" class="form-input" id="upload-title" placeholder="请输入资料名称"></div>' +
        '<div class="form-group"><label class="form-label">来源类型</label>' +
          '<select class="form-select" id="upload-source">' +
            '<option value="教材">教材</option><option value="真题">真题</option>' +
            '<option value="公开资料">公开资料</option><option value="自整理">自整理</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">文件类型</label>' +
          '<select class="form-select" id="upload-type">' +
            '<option value="PDF">PDF</option><option value="Word">Word</option><option value="TXT">TXT</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">章节信息</label>' +
          '<input type="text" class="form-input" id="upload-chapter" placeholder="如：共15章"></div>' +
        '<div class="form-group"><label class="form-label">文件</label>' +
          '<div class="upload-zone" onclick="document.getElementById(\'upload-file\').click()">' +
            '<div class="upload-icon">📄</div>' +
            '<div class="upload-text">点击选择文件</div>' +
            '<div class="upload-hint">支持 PDF / Word / TXT 格式</div>' +
            '<input type="file" id="upload-file" style="display:none;" onchange="onFileSelected(this)">' +
          '</div></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-ghost" onclick="closeUploadModal()">取消</button>' +
        '<button class="btn btn-primary" onclick="handleUpload()">确认上传</button>' +
      '</div>' +
    '</div></div>';

  var old = document.getElementById('upload-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function onFileSelected(input) {
  var file = input.files[0];
  if (file) {
    var zone = input.parentElement;
    zone.querySelector('.upload-text').textContent = file.name;
    zone.querySelector('.upload-hint').textContent = (file.size / 1024).toFixed(1) + ' KB';
  }
}

function handleUpload() {
  var title = document.getElementById('upload-title').value.trim();
  var source = document.getElementById('upload-source').value;
  var type = document.getElementById('upload-type').value;
  var chapter = document.getElementById('upload-chapter').value.trim();
  var fileInput = document.getElementById('upload-file');

  if (!title) { showHint('请输入资料名称'); return; }
  if (!fileInput.files[0]) { showHint('请选择文件'); return; }

  var file = fileInput.files[0];
  var btn = document.querySelector('#upload-modal .btn-primary');
  if (btn) { btn.textContent = '解析中...'; btn.disabled = true; }

  if (type === 'PDF') {
    parsePDF(file, function(content) {
      saveMaterialData(title, source, type, chapter, file, content);
    });
  } else if (type === 'Word') {
    parseWord(file, function(content) {
      saveMaterialData(title, source, type, chapter, file, content);
    });
  } else if (type === 'TXT') {
    var reader = new FileReader();
    reader.onload = function(e) {
      saveMaterialData(title, source, type, chapter, file, e.target.result);
    };
    reader.onerror = function() {
      showHint('文件读取失败，请重试');
      if (btn) { btn.textContent = '确认上传'; btn.disabled = false; }
    };
    reader.readAsText(file, 'UTF-8');
  }
}

function parsePDF(file, callback) {
  var fileReader = new FileReader();
  fileReader.onload = function() {
    var typedArray = new Uint8Array(this.result);
    pdfjsLib.getDocument({ data: typedArray }).promise.then(function(pdf) {
      var totalPages = pdf.numPages;
      var textContent = '';
      
      function extractPage(pageNum) {
        pdf.getPage(pageNum).then(function(page) {
          return page.getTextContent();
        }).then(function(content) {
          var pageText = content.items.map(function(item) {
            return item.str;
          }).join('\n');
          textContent += pageText + '\n\n';
          
          if (pageNum < totalPages) {
            extractPage(pageNum + 1);
          } else {
            callback(textContent);
          }
        }).catch(function(error) {
          console.error('PDF解析错误:', error);
          callback(null);
        });
      }
      
      extractPage(1);
    }).catch(function(error) {
      console.error('PDF加载错误:', error);
      showHint('PDF解析失败，请尝试其他文件');
      var btn = document.querySelector('#upload-modal .btn-primary');
      if (btn) { btn.textContent = '确认上传'; btn.disabled = false; }
      callback(null);
    });
  };
  fileReader.readAsArrayBuffer(file);
}

function parseWord(file, callback) {
  mammoth.extractRawText({ arrayBuffer: file }).then(function(result) {
    callback(result.value);
  }).catch(function(error) {
    console.error('Word解析错误:', error);
    showHint('Word解析失败，请尝试其他文件');
    var btn = document.querySelector('#upload-modal .btn-primary');
    if (btn) { btn.textContent = '确认上传'; btn.disabled = false; }
    callback(null);
  });
}

function saveMaterialData(title, source, type, chapter, file, content) {
  var wordCount = content ? content.length : Math.floor(file.size / 3);

  DB.addMaterial({
    title: title, sourceType: source, fileType: type,
    wordCount: wordCount, chapterInfo: chapter,
    parseStatus: content ? 'done' : 'pending',
    uploadedBy: sessionStorage.getItem('adminName') || 'admin',
    fileContent: content || null
  });

  closeUploadModal();
  renderMaterials();
  
  if (content) {
    showHint('上传成功！已读取文件内容并保存');
  } else {
    showHint('上传成功！文件已保存，待解析');
  }
}

function closeUploadModal() {
  var modal = document.getElementById('upload-modal');
  if (modal) modal.remove();
}

function viewMaterial(id) {
  var m = DB.getMaterial(id);
  if (!m) return;

  var hasContent = m.fileContent && m.fileContent.length > 0;
  var preview = hasContent ? m.fileContent.substring(0, 500) + (m.fileContent.length > 500 ? '...' : '') : '（暂无内容预览）';

  var html = '<div class="modal-overlay" style="display:flex;" id="view-material-modal">' +
    '<div class="modal-content" style="max-height:80vh;overflow:hidden;" onclick="event.stopPropagation()">' +
      '<div class="modal-header"><span class="modal-title">资料详情</span><span class="modal-close" onclick="closeViewMaterialModal()">×</span></div>' +
      '<div style="flex:1;overflow-y:auto;padding:16px;">' +
        '<div style="margin-bottom:12px;">' +
          '<div style="font-size:16px;font-weight:600;margin-bottom:4px;">' + escapeHtml(m.title) + '</div>' +
          '<div style="font-size:12px;color:var(--ink-light);">来源：' + m.sourceType + ' · 类型：' + m.fileType + '</div>' +
        '</div>' +
        '<div style="padding:12px;background:var(--paper);border-radius:8px;margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;">' +
            '<span>字数：' + (m.wordCount ? m.wordCount.toLocaleString() + ' 字' : '未知') + '</span>' +
            '<span>章节：' + (m.chapterInfo || '无') + '</span>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;">' +
            '<span>状态：<span class="status-tag ' + (m.parseStatus === 'done' ? 'published' : (m.parseStatus === 'parsing' ? 'reviewing' : 'rejected')) + '">' + statusLabel(m.parseStatus) + '</span></span>' +
            '<span>上传：' + (m.createdAt || '未知') + '</span>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:14px;font-weight:600;margin-bottom:8px;">内容预览</div>' +
          '<div style="background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:12px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;max-height:300px;overflow-y:auto;">' + escapeHtml(preview) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-primary" onclick="closeViewMaterialModal()">关闭</button>' +
      '</div>' +
    '</div></div>';

  var old = document.getElementById('view-material-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeViewMaterialModal() {
  var modal = document.getElementById('view-material-modal');
  if (modal) modal.remove();
}

function confirmDeleteMaterial(id) {
  var modal = document.getElementById('hint-modal');
  if (modal) {
    var msg = document.getElementById('hint-message');
    msg.innerHTML = '确定要删除这份资料吗？<br><br>' +
      '<button class="btn btn-danger" style="margin-right:8px;" onclick="doDeleteMaterial(' + id + ')">确认删除</button>' +
      '<button class="btn btn-ghost" onclick="closeHint()">取消</button>';
    modal.style.display = 'flex';
  }
}

function doDeleteMaterial(id) {
  DB.deleteMaterial(id);
  closeHint();
  renderMaterials();
  showHint('资料已删除');
}

// ===== AI内容生成 =====
function loadAIMaterialSelect() {
  var select = document.getElementById('ai-material-select');
  if (!select) return;
  var materials = DB.getMaterials().filter(function(m) { return m.parseStatus === 'done'; });
  select.innerHTML = '<option value="">请选择资料</option>' +
    materials.map(function(m) {
      return '<option value="' + m.id + '">' + escapeHtml(m.title) + '</option>';
    }).join('');

  renderAIResults();
}

function generateContent() {
  var materialId = document.getElementById('ai-material-select').value;
  var questionType = document.getElementById('ai-question-type').value;
  var count = parseInt(document.getElementById('ai-count').value) || 5;
  var model = document.getElementById('ai-model').value;

  if (!materialId) { showHint('请先选择资料'); return; }

  var material = DB.getMaterial(parseInt(materialId));
  var btn = event.target;
  btn.textContent = '生成中...';
  btn.disabled = true;

  // 模拟AI生成
  setTimeout(function() {
    var sampleTitles = {
      noun: ['议程设置', '沉默的螺旋', '把关人', '编码解码', '使用与满足', '知沟理论', '创新扩散', '意见领袖'],
      short: ['沉默的螺旋理论述评', '议程设置功能的发展', '把关人理论的演变', '使用与满足理论述评'],
      essay: ['论沉默的螺旋在新媒体时代的变化', '议程设置理论在算法时代的适用性', '媒介融合对把关人理论的挑战'],
      practice: ['灾难新闻报道写作', '算法推荐与信息茧房评论', '乡村振兴主题新闻策划']
    };

    var titles = sampleTitles[questionType] || sampleTitles.noun;
    var generated = 0;

    for (var i = 0; i < Math.min(count, titles.length); i++) {
      DB.addContent({
        materialId: parseInt(materialId),
        questionType: questionType,
        title: titles[i],
        aiModel: model,
        status: 'reviewing',
        contentData: '{"source":"' + escapeHtml(material.title) + '","generated":true}'
      });
      generated++;
    }

    btn.textContent = '开始生成';
    btn.disabled = false;
    showHint('成功生成 ' + generated + ' 条' + typeLabel(questionType) + '草稿，请前往内容审核');
    renderAIResults();
  }, 2000);
}

function renderAIResults() {
  var container = document.getElementById('ai-result-list');
  if (!container) return;

  var contents = DB.getContents();
  if (contents.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤖</div><div class="empty-state-text">暂无生成内容，请配置后点击生成</div></div>';
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>题型</th><th>标题</th><th>来源资料</th><th>AI模型</th><th>状态</th><th>生成时间</th><th>操作</th>' +
    '</tr></thead><tbody>';

  contents.forEach(function(c) {
    var material = DB.getMaterial(c.materialId);
    var statusClass = c.status === 'reviewing' ? 'reviewing' : (c.status === 'approved' ? 'published' : 'rejected');
    html += '<tr>' +
      '<td>' + typeLabel(c.questionType) + '</td>' +
      '<td><strong>' + escapeHtml(c.title) + '</strong></td>' +
      '<td>' + (material ? escapeHtml(material.title) : '-') + '</td>' +
      '<td>' + (c.aiModel || '-') + '</td>' +
      '<td><span class="status-tag ' + statusClass + '">' + statusLabel(c.status) + '</span></td>' +
      '<td>' + (c.createdAt || '-') + '</td>' +
      '<td><span class="btn btn-ghost" style="padding:4px 10px;font-size:12px;" onclick="viewContent(' + c.id + ')">查看</span></td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function viewContent(id) {
  var c = DB.getContent(id);
  if (!c) return;
  var data = JSON.parse(c.contentData || '{}');
  var html = '';
  Object.keys(data).forEach(function(k) {
    html += k + '：' + data[k] + '\n';
  });
  showHint('题型：' + typeLabel(c.questionType) + '\n标题：' + c.title + '\nAI模型：' + c.aiModel + '\n\n内容：\n' + html);
}

// ===== 内容审核 =====
function renderReviewList() {
  var container = document.getElementById('review-list');
  if (!container) return;

  var contents = DB.getContents('reviewing');
  if (contents.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">暂无待审核内容</div></div>';
    return;
  }

  var html = '';
  contents.forEach(function(c) {
    var material = DB.getMaterial(c.materialId);
    var data = JSON.parse(c.contentData || '{}');
    var contentHtml = '';
    Object.keys(data).forEach(function(k) {
      contentHtml += '<div style="margin-bottom:8px;"><strong>' + escapeHtml(k) + '：</strong>' + escapeHtml(data[k]) + '</div>';
    });

    html += '<div style="padding:16px 20px;border-bottom:1px solid var(--border-light);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<div><span class="status-tag reviewing">' + typeLabel(c.questionType) + '</span> ' +
        '<strong style="font-size:15px;margin-left:8px;">' + escapeHtml(c.title) + '</strong></div>' +
        '<span style="font-size:12px;color:var(--ink-light);">来源：' + (material ? escapeHtml(material.title) : '-') + ' · ' + c.aiModel + '</span>' +
      '</div>' +
      '<div style="background:var(--paper);border-radius:8px;padding:12px;margin:8px 0;font-size:13px;color:var(--ink-soft);">' + contentHtml + '</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button class="btn btn-primary" style="padding:6px 16px;font-size:13px;" onclick="approveContent(' + c.id + ')">通过审核</button>' +
        '<button class="btn btn-danger" style="padding:6px 16px;font-size:13px;" onclick="rejectContent(' + c.id + ')">退回修改</button>' +
        '<button class="btn btn-ghost" style="padding:6px 16px;font-size:13px;" onclick="adoptContent(' + c.id + ')">采纳并发布</button>' +
      '</div>' +
    '</div>';
  });

  container.innerHTML = html;
}

function approveContent(id) {
  DB.updateContentStatus(id, 'approved');
  renderReviewList();
  refreshSidebarBadge();
  showHint('已通过审核，可前往发布管理进行发布');
}

function rejectContent(id) {
  DB.updateContentStatus(id, 'rejected');
  renderReviewList();
  refreshSidebarBadge();
  showHint('已退回，请重新生成或修改');
}

function adoptContent(id) {
  var c = DB.getContent(id);
  if (!c) return;
  DB.updateContentStatus(id, 'approved');
  DB.addQuestion({
    contentId: id, questionType: c.questionType, title: c.title,
    category: '待分类', tag: 'AI生成', status: 'published',
    publishedAt: new Date().toLocaleString('zh-CN')
  });
  DB.addPublishLog({ questionIds: '[' + id + ']', publishType: 'immediate', status: 'success' });
  renderReviewList();
  refreshSidebarBadge();
  showHint('已采纳并直接发布到学生端APP');
}

function refreshSidebarBadge() {
  var reviewing = DB.getContents('reviewing').length;
  var badge = document.querySelector('.nav-badge');
  if (badge) {
    badge.textContent = reviewing;
    badge.style.display = reviewing > 0 ? '' : 'none';
  }
}

// ===== 题库管理 =====
function renderQuestions() {
  var typeFilter = document.getElementById('bank-type-filter');
  var searchInput = document.getElementById('bank-search');
  var typeVal = typeFilter ? typeFilter.value : 'all';
  var searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

  var list = DB.getQuestions(typeVal);
  if (searchVal) {
    list = list.filter(function(q) { return q.title.toLowerCase().indexOf(searchVal) > -1; });
  }

  var container = document.getElementById('question-list');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-text">暂无题目</div></div>';
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>题型</th><th>标题</th><th>分类</th><th>标签</th><th>状态</th><th>发布时间</th><th>操作</th>' +
    '</tr></thead><tbody>';

  list.forEach(function(q) {
    var statusClass = q.status === 'published' ? 'published' : (q.status === 'draft' ? 'draft' : 'unpublished');
    html += '<tr>' +
      '<td>' + typeLabel(q.questionType) + '</td>' +
      '<td><strong>' + escapeHtml(q.title) + '</strong></td>' +
      '<td>' + (q.category || '-') + '</td>' +
      '<td>' + (q.tag || '-') + '</td>' +
      '<td><span class="status-tag ' + statusClass + '">' + statusLabel(q.status) + '</span></td>' +
      '<td>' + (q.publishedAt || '-') + '</td>' +
      '<td>' +
        '<span class="btn btn-ghost" style="padding:4px 8px;font-size:12px;margin-right:4px;" onclick="editQuestion(' + q.id + ')">编辑</span>';
    if (q.status === 'published') {
      html += '<span class="btn btn-ghost" style="padding:4px 8px;font-size:12px;margin-right:4px;" onclick="unpublishQuestion(' + q.id + ')">下架</span>';
    } else {
      html += '<span class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:4px;" onclick="publishQuestion(' + q.id + ')">发布</span>';
    }
    html += '<span class="btn btn-danger" style="padding:4px 8px;font-size:12px;" onclick="confirmDeleteQuestion(' + q.id + ')">删除</span>' +
      '</td></tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function openQuestionModal(id) {
  var q = id ? DB.getQuestion(id) : null;
  var title = q ? '编辑题目' : '新增题目';

  var html = '<div class="modal-overlay" style="display:flex;" id="question-modal">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
      '<div class="modal-header"><span class="modal-title">' + title + '</span><span class="modal-close" onclick="closeQuestionModal()">×</span></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">题型</label>' +
          '<select class="form-select" id="q-type">' +
            '<option value="noun"' + (q && q.questionType === 'noun' ? ' selected' : '') + '>名词解释</option>' +
            '<option value="short"' + (q && q.questionType === 'short' ? ' selected' : '') + '>简答题</option>' +
            '<option value="essay"' + (q && q.questionType === 'essay' ? ' selected' : '') + '>论述题</option>' +
            '<option value="practice"' + (q && q.questionType === 'practice' ? ' selected' : '') + '>实务题</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">标题</label>' +
          '<input type="text" class="form-input" id="q-title" value="' + (q ? escapeHtml(q.title) : '') + '" placeholder="请输入题目标题"></div>' +
        '<div class="form-group"><label class="form-label">分类</label>' +
          '<select class="form-select" id="q-category">' +
            '<option value="传播学原理"' + (q && q.category === '传播学原理' ? ' selected' : '') + '>传播学原理</option>' +
            '<option value="新闻学概论"' + (q && q.category === '新闻学概论' ? ' selected' : '') + '>新闻学概论</option>' +
            '<option value="网络传播概论"' + (q && q.category === '网络传播概论' ? ' selected' : '') + '>网络传播概论</option>' +
            '<option value="新媒体概论"' + (q && q.category === '新媒体概论' ? ' selected' : '') + '>新媒体概论</option>' +
            '<option value="待分类"' + (q && q.category === '待分类' ? ' selected' : '') + '>待分类</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">标签</label>' +
          '<input type="text" class="form-input" id="q-tag" value="' + (q ? escapeHtml(q.tag) : '') + '" placeholder="如：高频/重点/20分"></div>' +
        '<div class="form-group"><label class="form-label">内容</label>' +
          '<textarea class="form-textarea" id="q-content" placeholder="请输入题目内容...">' + (q && q.contentJson ? escapeHtml(q.contentJson) : '') + '</textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-ghost" onclick="closeQuestionModal()">取消</button>' +
        '<button class="btn btn-primary" onclick="saveQuestion(' + (id || 0) + ')">保存</button>' +
      '</div>' +
    '</div></div>';

  var old = document.getElementById('question-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeQuestionModal() {
  var modal = document.getElementById('question-modal');
  if (modal) modal.remove();
}

function saveQuestion(id) {
  var type = document.getElementById('q-type').value;
  var title = document.getElementById('q-title').value.trim();
  var category = document.getElementById('q-category').value;
  var tag = document.getElementById('q-tag').value.trim();
  var content = document.getElementById('q-content').value.trim();

  if (!title) { showHint('请输入题目标题'); return; }

  if (id) {
    DB.updateQuestion(id, { questionType: type, title: title, category: category, tag: tag, contentJson: content });
  } else {
    DB.addQuestion({ contentId: null, questionType: type, title: title, category: category, tag: tag, contentJson: content, status: 'draft', publishedAt: null });
  }

  closeQuestionModal();
  renderQuestions();
  showHint('保存成功');
}

function editQuestion(id) {
  openQuestionModal(id);
}

function publishQuestion(id) {
  DB.updateQuestion(id, { status: 'published', publishedAt: new Date().toLocaleString('zh-CN') });
  DB.addPublishLog({ questionIds: '[' + id + ']', publishType: 'immediate', status: 'success' });
  renderQuestions();
  showHint('已发布到学生端APP');
}

function unpublishQuestion(id) {
  DB.updateQuestion(id, { status: 'unpublished', publishedAt: null });
  renderQuestions();
  showHint('已下架');
}

function confirmDeleteQuestion(id) {
  var q = DB.getQuestion(id);
  var modal = document.getElementById('hint-modal');
  if (modal) {
    var msg = document.getElementById('hint-message');
    msg.innerHTML = '确定要删除「' + escapeHtml(q.title) + '」吗？<br><br>' +
      '<button class="btn btn-danger" style="margin-right:8px;" onclick="doDeleteQuestion(' + id + ')">确认删除</button>' +
      '<button class="btn btn-ghost" onclick="closeHint()">取消</button>';
    modal.style.display = 'flex';
  }
}

function doDeleteQuestion(id) {
  DB.deleteQuestion(id);
  closeHint();
  renderQuestions();
  showHint('题目已删除');
}

// ===== 发布管理 =====
function renderPublishPage() {
  renderPublishList();
  renderPublishHistory();
}

function renderPublishList() {
  var container = document.getElementById('publish-list');
  if (!container) return;

  var questions = DB.getQuestions().filter(function(q) {
    return q.status === 'draft' || q.status === 'unpublished';
  });

  var approvedContents = DB.getContents('approved');

  if (questions.length === 0 && approvedContents.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚀</div><div class="empty-state-text">暂无待发布内容</div></div>';
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th><input type="checkbox" onchange="toggleAllPublish(this)"></th>' +
    '<th>题型</th><th>标题</th><th>分类</th><th>状态</th><th>操作</th>' +
    '</tr></thead><tbody>';

  questions.forEach(function(q) {
    var statusClass = q.status === 'draft' ? 'draft' : 'unpublished';
    html += '<tr>' +
      '<td><input type="checkbox" class="publish-check" value="' + q.id + '"></td>' +
      '<td>' + typeLabel(q.questionType) + '</td>' +
      '<td><strong>' + escapeHtml(q.title) + '</strong></td>' +
      '<td>' + (q.category || '-') + '</td>' +
      '<td><span class="status-tag ' + statusClass + '">' + statusLabel(q.status) + '</span></td>' +
      '<td><span class="btn btn-primary" style="padding:4px 10px;font-size:12px;" onclick="publishQuestion(' + q.id + ')">发布</span></td>' +
      '</tr>';
  });

  html += '</tbody></table>';

  if (questions.length > 0) {
    html += '<div style="padding:16px 20px;border-top:1px solid var(--border-light);">' +
      '<button class="btn btn-primary" onclick="batchPublish()">批量发布</button>' +
      '<span style="margin-left:12px;font-size:12px;color:var(--ink-light);">发布后内容将同步到学生端APP</span>' +
      '</div>';
  }

  container.innerHTML = html;
}

function toggleAllPublish(master) {
  var checks = document.querySelectorAll('.publish-check');
  checks.forEach(function(c) { c.checked = master.checked; });
}

function batchPublish() {
  var checks = document.querySelectorAll('.publish-check:checked');
  if (checks.length === 0) { showHint('请先选择要发布的内容'); return; }

  var ids = [];
  checks.forEach(function(c) {
    var id = parseInt(c.value);
    DB.updateQuestion(id, { status: 'published', publishedAt: new Date().toLocaleString('zh-CN') });
    ids.push(id);
  });

  DB.addPublishLog({ questionIds: JSON.stringify(ids), publishType: 'immediate', status: 'success' });
  renderPublishPage();
  showHint('成功发布 ' + ids.length + ' 条内容到学生端APP');
}

function renderPublishHistory() {
  var container = document.getElementById('publish-history');
  if (!container) return;

  var logs = DB.getPublishLogs();
  if (logs.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无发布记录</div></div>';
    return;
  }

  var html = '<table class="data-table"><thead><tr>' +
    '<th>发布时间</th><th>内容数量</th><th>发布方式</th><th>状态</th>' +
    '</tr></thead><tbody>';

  logs.forEach(function(log) {
    var ids = JSON.parse(log.questionIds || '[]');
    html += '<tr>' +
      '<td>' + (log.createdAt || '-') + '</td>' +
      '<td>' + ids.length + ' 条</td>' +
      '<td>' + (log.publishType === 'immediate' ? '立即发布' : '定时发布') + '</td>' +
      '<td><span class="status-tag published">' + statusLabel(log.status) + '</span></td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ===== 数据统计 =====
function refreshStats() {
  var stats = DB.getStats();
  var cards = document.querySelectorAll('#page-stats .stat-card .stat-value');
  if (cards.length >= 4) {
    cards[0].textContent = stats.questionsPublished;
    cards[1].textContent = stats.questionsDraft;
    cards[2].textContent = stats.contentsReviewing;
    cards[3].textContent = stats.questionsUnpublished;
  }
}

// ===== 初始化 =====
if (window.location.pathname.indexOf('dashboard') > -1) {
  if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = 'index.html';
  } else {
    var adminName = sessionStorage.getItem('adminName') || '管理员';
    document.addEventListener('DOMContentLoaded', function() {
      var nameEl = document.querySelector('.topbar-username');
      if (nameEl) nameEl.textContent = adminName;
      refreshDashboard();
      refreshSidebarBadge();
    });
  }
}

// ===== 用户反馈 =====
function renderFeedbacks() {
  var typeFilter = document.getElementById('feedback-type-filter');
  var typeVal = typeFilter ? typeFilter.value : 'all';

  var feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
  if (typeVal !== 'all') {
    feedbacks = feedbacks.filter(function(f) { return f.type === typeVal; });
  }

  var container = document.getElementById('feedback-list');
  if (!container) return;

  if (feedbacks.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-text">暂无用户反馈</div></div>';
    return;
  }

  var typeNames = { bug: 'Bug反馈', feature: '功能建议', other: '其他问题' };
  var typeColors = { bug: 'rejected', feature: 'published', other: 'draft' };

  var html = '';
  feedbacks.forEach(function(f) {
    var date = new Date(f.timestamp);
    var dateStr = date.toLocaleString('zh-CN');
    
    html += '<div style="padding:16px 20px;border-bottom:1px solid var(--border-light);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<span class="status-tag ' + typeColors[f.type] + '">' + typeNames[f.type] + '</span>' +
        '<span style="font-size:12px;color:var(--ink-light);">' + dateStr + '</span>' +
      '</div>' +
      '<div style="background:var(--paper);border-radius:8px;padding:12px;margin:8px 0;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + escapeHtml(f.content) + '</div>';
    
    if (f.contact) {
      html += '<div style="font-size:12px;color:var(--ink-light);">' +
        '联系方式：' + escapeHtml(f.contact) + '</div>';
    }
    
    html += '</div>';
  });

  container.innerHTML = html;
}

// 记住账号
if (document.getElementById('admin-username')) {
  var savedUser = localStorage.getItem('adminUsername');
  if (savedUser) document.getElementById('admin-username').value = savedUser;
  document.getElementById('login-form').addEventListener('submit', function() {
    var remember = document.getElementById('remember-admin');
    if (remember.checked) {
      localStorage.setItem('adminUsername', document.getElementById('admin-username').value);
    } else {
      localStorage.removeItem('adminUsername');
    }
  });
}
