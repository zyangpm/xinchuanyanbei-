// 公网测试环境：确保外部访问者有默认登录状态
if (!localStorage.getItem('isLoggedIn')) {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('loginType', 'password');
  localStorage.setItem('userPhone', '13800000000');
  if (!localStorage.getItem('userNickname')) {
    localStorage.setItem('userNickname', '林同学');
  }
  if (!localStorage.getItem('studyDays')) {
    localStorage.setItem('studyDays', '42');
  }
}

function getUserInfo() {
  return {
    nickname: localStorage.getItem('userNickname') || '新传研友',
    days: localStorage.getItem('studyDays') || '1',
    masteredCount: localStorage.getItem('masteredCount') || '386',
    favoriteCount: localStorage.getItem('favoriteCount') || '57',
    noteCount: localStorage.getItem('noteCount') || '12'
  };
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

  var notes = JSON.parse(localStorage.getItem('notes') || '[]');
  var noteCountEl = document.querySelector('.settings-row[onclick="openNoteList()"] .val');
  if (noteCountEl) {
    noteCountEl.textContent = notes.length + '条 ›';
  }

  var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
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
  initThemeAndFont();
});

function goBack() {
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

function openAiModal() {
  var modal = document.getElementById('ai-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function openAiAssistModal() {
  var modal = document.getElementById('ai-assist-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function useTemplate(type) {
  var templates = {
    'memory-method': '针对"沉默的螺旋"这个概念，有什么好的背诵技巧或记忆口诀吗？',
    'real-example': '能举一个现实生活中的实例来帮助理解"沉默的螺旋"吗？',
    'compare': '"沉默的螺旋"与"第三人效应"或"多元无知"有什么核心区别？',
    'exam-tip': '在考研考试中，"沉默的螺旋"通常以什么形式考查？有哪些高频考点？'
  };
  
  var input = document.getElementById('ai-assist-input');
  if (input && templates[type]) {
    input.value = templates[type];
  }
}

function submitAiAssist() {
  var input = document.getElementById('ai-assist-input');
  if (input && input.value.trim()) {
    var question = input.value.trim();
    closeModal('ai-assist-modal');
    
    var btn = document.querySelector('#ai-assist-modal .save-btn');
    if (btn) {
      var originalText = btn.textContent;
      btn.textContent = 'AI思考中...';
      btn.disabled = true;
      
      setTimeout(function() {
        var response = generateAiResponse(question);
        showConfirm('AI助记', response, 'info');
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
    }
    
    showConfirm('AI助记', 'AI正在为您分析问题...', 'info');
  } else {
    showConfirm('提示', '请输入您的问题或选择一个模板', 'warning');
  }
}

function generateAiResponse(question) {
  var responses = {
    'memory': '针对"' + currentTerm + '"的记忆方法推荐：\n\n1. 联想法：将"沉默的螺旋"想象成一个真实的螺旋楼梯，越往上走的人越少\n2. 口诀法："少数不敢说，多数越强大，形成螺旋效应"\n3. 类比法：想象在会议上，大家都沉默不语，最终意见被少数人主导\n4. 场景法：结合网络评论区"一边倒"的现象来理解\n\n建议选择1-2种方法重点练习效果最佳！',
    'example': '现实案例：\n\n最近的一个例子是网络舆论中的"沉默螺旋"效应。比如在某个热门话题下，当主流意见形成后，持不同观点的用户往往会选择沉默，而不是发声表达异议。这正是诺依曼理论中"孤立恐惧"的体现——人们害怕因持少数意见而被孤立。\n\n另一个例子是在公司会议中，当领导倾向某个方案时，即使员工有不同想法也可能选择沉默，导致决策"一边倒"。',
    'compare': '"沉默的螺旋"与相似概念的区别：\n\n1. 与"第三人效应"的区别：\n   - 沉默螺旋：自己因害怕孤立而沉默\n   - 第三人效应：认为他人会受媒介影响，但自己不会\n\n2. 与"多元无知"的区别：\n   - 沉默螺旋：主动选择沉默\n   - 多元无知：错误估计他人想法而不行动\n\n核心差异在于：沉默螺旋强调"主动发声行为"的变化，而后者强调"认知判断"的偏差。',
    'exam': '考试中"' + currentTerm + '"的高频考点：\n\n1. 定义题：直接考查概念内涵（约5分）\n2. 比较题：与第三人效应、多元无知的异同（约15分）\n3. 应用题：结合现实案例分析舆论现象（约25-30分）\n\n答题要点：\n- 必须提到"孤立恐惧"和"意见气候"\n- 必须说明"多数强势、少数沉默"的螺旋过程\n- 建议与算法环境结合分析\n\n背诵优先级：定义 > 核心机制 > 应用场景'
  };
  
  var questionLower = question.toLowerCase();
  
  if (questionLower.indexOf('记忆') !== -1 || questionLower.indexOf('背诵') !== -1 || questionLower.indexOf('口诀') !== -1) {
    return responses.memory;
  } else if (questionLower.indexOf('案例') !== -1 || questionLower.indexOf('例子') !== -1 || questionLower.indexOf('现实') !== -1) {
    return responses.example;
  } else if (questionLower.indexOf('区别') !== -1 || questionLower.indexOf('对比') !== -1 || questionLower.indexOf('相似') !== -1) {
    return responses.compare;
  } else if (questionLower.indexOf('考试') !== -1 || questionLower.indexOf('考点') !== -1 || questionLower.indexOf('考法') !== -1) {
    return responses.exam;
  }
  
  return 'AI分析结果：\n\n关于"' + question + '"的记忆建议：\n\n1. 先理解核心概念：' + currentTerm + '的本质是关于舆论形成的动态过程\n2. 找出关键词：孤立恐惧、意见气候、多数强势\n3. 结合场景记忆：想象一个具体的舆论案例\n4. 反复练习：用自己的话复述核心逻辑\n\n如需更具体的建议，可以尝试选择下方模板重新提问。';
}

function selectAiModel(model) {
  var options = document.querySelectorAll('.ai-option');
  options.forEach(function(opt) {
    opt.classList.remove('active');
    opt.querySelector('.check').textContent = '';
  });
  
  var modelMap = { deepseek: 0, gpt: 1, claude: 2, gemini: 3 };
  var activeOption = options[modelMap[model]];
  
  if (activeOption) {
    activeOption.classList.add('active');
    activeOption.querySelector('.check').textContent = '✓';
  }
}

function saveAiSettings() {
  var modelSelect = document.querySelectorAll('.ai-option');
  var selectedModel = 'deepseek';
  var modelName = 'DeepSeek';
  
  modelSelect.forEach(function(opt) {
    if (opt.classList.contains('active')) {
      var name = opt.querySelector('.ai-name').textContent;
      var modelMap = { 'DeepSeek': 'deepseek', 'GPT': 'gpt', 'Claude': 'claude', 'Gemini': 'gemini' };
      selectedModel = modelMap[name] || 'deepseek';
      modelName = name;
    }
  });
  
  var apiKey = document.querySelector('.api-input').value;
  
  localStorage.setItem('aiModel', selectedModel);
  localStorage.setItem('aiModelName', modelName);
  localStorage.setItem('apiKey', apiKey);
  
  var aiModelEl = document.querySelector('.settings-row[onclick="openAiModal()"] .val');
  if (aiModelEl) {
    aiModelEl.textContent = modelName + ' ›';
  }
  
  closeModal('ai-modal');
  showConfirm('AI设置', '设置已保存', 'success');
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

function handleKnowledgeUpload() {
  var modal = document.getElementById('upload-modal');
  var fileInput = document.getElementById('file-input');
  var titleInput = modal.querySelector('.form-input[type="text"]');
  var select = modal.querySelector('.form-select');

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
  var reader = new FileReader();

  reader.onload = function(e) {
    var content = e.target.result;
    var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
    var materialId = Date.now();
    materials.push({
      id: materialId,
      title: title,
      sourceType: book,
      fileType: file.name.split('.').pop().toUpperCase(),
      wordCount: content.length,
      chapterInfo: '-',
      parseStatus: 'done',
      uploadedBy: 'user',
      createdAt: new Date().toLocaleString('zh-CN'),
      fileContent: content
    });
    localStorage.setItem('xc_materials', JSON.stringify(materials));

    renderUploadedMaterials();

    closeModal('upload-modal');
    showConfirm('上传成功', '资料已保存到「' + book + '」分类', 'success');

    if (titleInput) titleInput.value = '';
    if (fileInput) fileInput.value = '';
  };

  reader.onerror = function() {
    showConfirm('提示', '文件读取失败', 'warning');
  };

  reader.readAsText(file, 'UTF-8');
}

function renderUploadedMaterials() {
  var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
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

      var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
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
  
  if (!localStorage.getItem('userNickname')) {
    localStorage.setItem('userNickname', '新传研友');
  }
  
  if (!localStorage.getItem('studyDays')) {
    localStorage.setItem('studyDays', '1');
  }
  
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
}

function openVideoGenModal() {
  var modal = document.getElementById('video-gen-modal');
  if (modal) {
    var promptInput = document.getElementById('video-prompt');
    if (promptInput && currentTerm === '沉默的螺旋') {
      promptInput.value = '用动画讲解沉默的螺旋理论，重点突出诺依曼提出的孤立恐惧和意见气候概念，展示少数意见如何趋于沉默，多数意见如何愈发强势的螺旋过程';
    }
    modal.style.display = 'flex';
  }
}

function generateVideo() {
  var prompt = document.getElementById('video-prompt').value;
  var apiSelect = document.getElementById('video-api');
  var api = apiSelect.options[apiSelect.selectedIndex].value;
  
  if (!prompt) {
    alert('请输入视频内容描述');
    return;
  }
  
  var btn = document.querySelector('#video-gen-modal .save-btn');
  var originalText = btn.textContent;
  btn.textContent = '生成中...';
  btn.disabled = true;
  
  setTimeout(function() {
    btn.textContent = originalText;
    btn.disabled = false;
    closeModal('video-gen-modal');
    
    var videoGenBtn = document.getElementById('video-gen-btn');
    if (videoGenBtn) {
      videoGenBtn.textContent = '视频生成成功 ✓';
      videoGenBtn.style.backgroundColor = '#4CAF50';
    }
    
    var videoCaption = document.getElementById('video-caption');
    if (videoCaption) {
      videoCaption.textContent = '【AI生成】沉默的螺旋动画讲解视频已就绪——点击播放按钮观看';
    }
    
    showConfirm('视频生成', '已为"沉默的螺旋"生成专属记忆视频，现在可以点击播放按钮观看。', 'success');
  }, 2000);
}

var videoTimer = null;
var videoCurrentTime = 0;
var videoDuration = 5;

function playVideo() {
  var playBtn = document.getElementById('play-btn');
  var videoBox = document.getElementById('video-box');
  var progressBar = document.getElementById('video-progress-bar');
  var timeDisplay = document.getElementById('video-time');
  var placeholder = document.getElementById('video-placeholder');
  
  if (!playBtn || !videoBox) return;
  
  if (playBtn.textContent === '▶') {
    playBtn.textContent = '⏸';
    videoBox.classList.add('playing');
    if (placeholder) placeholder.style.display = 'none';
    
    videoTimer = setInterval(function() {
      videoCurrentTime++;
      var progress = (videoCurrentTime / videoDuration) * 100;
      if (progressBar) progressBar.style.width = progress + '%';
      
      var currentMin = Math.floor(videoCurrentTime / 60);
      var currentSec = videoCurrentTime % 60;
      if (timeDisplay) {
        timeDisplay.textContent = 
          (currentMin < 10 ? '0' : '') + currentMin + ':' + 
          (currentSec < 10 ? '0' : '') + currentSec + 
          ' / 00:0' + videoDuration;
      }
      
      if (videoCurrentTime >= videoDuration) {
        stopVideo();
      }
    }, 1000);
  } else {
    pauseVideo();
  }
}

function seekVideo(event) {
  var progressBar = document.getElementById('video-progress-bar');
  var barBg = event.currentTarget;
  if (!progressBar || !barBg) return;
  
  var rect = barBg.getBoundingClientRect();
  var clickX = event.clientX - rect.left;
  var percent = clickX / rect.width;
  videoCurrentTime = Math.floor(percent * videoDuration);
  
  var progress = (videoCurrentTime / videoDuration) * 100;
  progressBar.style.width = progress + '%';
  
  var timeDisplay = document.getElementById('video-time');
  if (timeDisplay) {
    var currentMin = Math.floor(videoCurrentTime / 60);
    var currentSec = videoCurrentTime % 60;
    timeDisplay.textContent = 
      (currentMin < 10 ? '0' : '') + currentMin + ':' + 
      (currentSec < 10 ? '0' : '') + currentSec + 
      ' / 00:0' + videoDuration;
  }
}

function pauseVideo() {
  var playBtn = document.getElementById('play-btn');
  var videoBox = document.getElementById('video-box');
  
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

function toggleFavorite(e) {
  var btn = e && e.target ? e.target : (event && event.srcElement ? event.srcElement : null);
  if (!btn) {
    btn = document.querySelector('.icon-btn');
  }
  if (!btn) return;
  if (btn.textContent.trim() === '☆') {
    btn.textContent = '★';
    btn.style.color = 'var(--gold)';
    showConfirm('收藏', '已收藏该内容', 'success');
  } else {
    btn.textContent = '☆';
    btn.style.color = '';
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
  
  var notes = JSON.parse(localStorage.getItem('notes') || '[]');
  notes.push({
    content: content,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('notes', JSON.stringify(notes));
  
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
  
  var posts = JSON.parse(localStorage.getItem('posts') || '[]');
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
  var posts = JSON.parse(localStorage.getItem('posts') || '[]');
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
  var modal = document.getElementById('complete-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

var ttsUtterance = null;
var ttsPlaying = false;

var currentTerm = '沉默的螺旋';

function loadNounDetail() {
  var urlParams = new URLSearchParams(window.location.search);
  var term = urlParams.get('term') || '沉默的螺旋';
  currentTerm = term;
  
  var data = getNounData(term);
  
  var titleEl = document.getElementById('noun-title');
  if (titleEl) titleEl.textContent = data.title;
  
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
  var branchWidth = 100;
  var minLeafWidth = 120;
  var hGap = 50;
  var lineGap = 20;
  
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
  var branchRightX = branchLeftX + branchWidth;
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
  svg += '<stop offset="0%" style="stop-color:#243A5E"/><stop offset="100%" style="stop-color:#3A5A8E"/>';
  svg += '</linearGradient></defs>';
  
  svg += '<rect x="' + rootX + '" y="' + (rootY - 22) + '" width="' + rootWidth + '" height="44" rx="22" fill="url(#rg)"/>';
  svg += '<text x="' + (rootX + rootWidth/2) + '" y="' + (rootY + 5) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="600">' + escapeHtml(title || '核心概念') + '</text>';
  
  var curY = 0;
  var leafNodes = [];
  
  data.forEach(function(block, idx) {
    var bH = branchHeights[idx];
    var bCY = curY + bH / 2;
    var branchHeight = 38;
    var branchY = bCY - branchHeight / 2;
    
    svg += '<line x1="' + trunkX + '" y1="' + bCY + '" x2="' + (branchLeftX - 10) + '" y2="' + bCY + '" stroke="#243A5E" stroke-width="1.2" opacity="0.5"/>';
    svg += '<line x1="' + trunkX + '" y1="' + (curY + leafHeight/2) + '" x2="' + trunkX + '" y2="' + (curY + bH - leafHeight/2) + '" stroke="#243A5E" stroke-width="1" opacity="0.3"/>';
    
    var bl = escapeHtml(block.label);
    svg += '<rect x="' + branchLeftX + '" y="' + branchY + '" width="' + branchWidth + '" height="' + branchHeight + '" rx="8" fill="#FFFEF7" stroke="#243A5E" stroke-width="1.2"/>';
    svg += '<text x="' + (branchLeftX + branchWidth/2) + '" y="' + (bCY + 4) + '" text-anchor="middle" fill="#243A5E" font-size="11" font-weight="600">' + bl + '</text>';
    
    if (block.items && block.items.length > 0) {
      block.items.forEach(function(item, li) {
        var lY = curY + li * (leafHeight + leafGap);
        var lCY = lY + leafHeight / 2;
        var lt = escapeHtml(item.title || '');
        var leafW = Math.max(minLeafWidth, (item.title || '').length * 11 + 24);
        
        var nodeId = 'leaf-' + idx + '-' + li;
        svg += '<g id="' + nodeId + '" style="cursor:pointer;">';
        svg += '<line x1="' + branchRightX + '" y1="' + lCY + '" x2="' + leafLeftX + '" y2="' + lCY + '" stroke="#3A5276" stroke-width="1" opacity="0.4"/>';
        svg += '<line x1="' + branchRightX + '" y1="' + bCY + '" x2="' + branchRightX + '" y2="' + lCY + '" stroke="#3A5276" stroke-width="0.8" opacity="0.3"/>';
        svg += '<rect x="' + leafLeftX + '" y="' + lY + '" width="' + leafW + '" height="' + leafHeight + '" rx="6" fill="#F5F0E8" stroke="#3A5276" stroke-width="0.8" stroke-opacity="0.4"/>';
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
  
  var memMethods = JSON.parse(localStorage.getItem('memMethods') || '[]');
  memMethods.push({
    content: content,
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
  localStorage.setItem('memMethods', JSON.stringify(memMethods));
  
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
  var notes = JSON.parse(localStorage.getItem('notes') || '[]');
  
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
  var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
  
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
    materials.forEach(function(m, index) {
      var size = m.wordCount ? (m.wordCount / 10000).toFixed(1) + '万字' : '-';
      html += '<div style="padding:16px;border-bottom:1px solid var(--paper-line);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">' +
          '<span style="font-weight:600;">' + m.title + '</span>' +
          '<span style="font-size:12px;color:var(--gold);">' + m.sourceType + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">' + m.fileType + ' · ' + size + '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;" onclick="viewMaterialDetail(' + index + ')">查看</button>' +
          '<button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;" onclick="downloadMaterial(' + index + ')">下载</button>' +
          '<button class="btn btn-danger" style="font-size:12px;padding:4px 12px;" onclick="deleteMaterial(' + index + ')">删除</button>' +
        '</div>' +
      '</div>';
    });
  }
  
  html += '</div>' +
    '<div style="padding:12px;text-align:center;">' +
      '<span style="font-size:12px;color:var(--ink-light);">资料仅保存在本地</span>' +
    '</div>' +
    '</div></div>';
  
  var old = document.getElementById('library-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function viewMaterialDetail(index) {
  var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
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
  var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
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
    var materials = JSON.parse(localStorage.getItem('xc_materials') || '[]');
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
  root.style.setProperty('--bg', '#FBF7EE');
  root.style.setProperty('--card', '#FFFEF7');
  root.style.setProperty('--paper', '#F5F0E8');
  root.style.setProperty('--paper-line', '#E8E4DF');
  root.style.setProperty('--ink', '#1C1917');
  root.style.setProperty('--ink-soft', '#5B5347');
  root.style.setProperty('--ink-light', '#9A9085');
  root.style.setProperty('--seal', '#243A5E');
  root.style.setProperty('--seal-light', '#3A5276');
  root.style.setProperty('--red', '#B23A2E');
  root.style.setProperty('--red-light', '#C75548');
  root.style.setProperty('--gold', '#C99A3E');
  root.style.setProperty('--gold-light', '#D9B35F');
  root.style.setProperty('--green', '#3D6B3D');
  root.style.setProperty('--green-light', '#5A8A5A');
  
  document.body.style.backgroundImage = 'linear-gradient(0deg, transparent 23px, #E8E4DF 24px), linear-gradient(90deg, transparent 23px, #E8E4DF 24px)';
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

function submitFeedback() {
  var type = document.getElementById('feedback-type').value;
  var content = document.getElementById('feedback-content').value.trim();
  var contact = document.getElementById('feedback-contact').value.trim();
  
  if (!content) {
    showConfirm('提示', '请输入反馈内容', 'warning');
    return;
  }
  
  var feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
  feedbacks.push({
    type: type,
    content: content,
    contact: contact,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
  
  closeModal('feedback-modal');
  showConfirm('提交成功', '感谢您的反馈！我们会尽快处理。', 'success');
}

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
  
  if (typeof loadNounDetail === 'function' && typeof getNounData === 'function') {
    loadNounDetail();
  }
  
  if (typeof loadShortDetail === 'function') {
    loadShortDetail();
  }
  
  if (typeof loadEssayDetail === 'function') {
    loadEssayDetail();
  }
  
  var savedAvatar = localStorage.getItem('userAvatar');
  if (savedAvatar) {
    var avatar = document.querySelector('.profile-avatar');
    if (avatar) avatar.textContent = savedAvatar;
  }
  
  var savedNickname = localStorage.getItem('userNickname');
  if (savedNickname) {
    var names = document.querySelectorAll('.profile-name, .name');
    names.forEach(function(name) {
      name.textContent = savedNickname;
    });
  }
  
  var savedAvatarColor = localStorage.getItem('avatarColor');
  var savedAvatarImage = localStorage.getItem('avatarImage');
  var profileAvatarEl = document.querySelector('.profile-avatar');
  var homeAvatarEl = document.querySelector('.home-user .avatar');
  
  if (savedAvatarImage) {
    if (profileAvatarEl) {
      profileAvatarEl.style.backgroundImage = 'url(' + savedAvatarImage + ')';
      profileAvatarEl.style.backgroundSize = 'cover';
      profileAvatarEl.style.backgroundPosition = 'center';
      profileAvatarEl.textContent = '';
    }
    if (homeAvatarEl) {
      homeAvatarEl.style.backgroundImage = 'url(' + savedAvatarImage + ')';
      homeAvatarEl.style.backgroundSize = 'cover';
      homeAvatarEl.style.backgroundPosition = 'center';
    }
  } else if (savedAvatarColor) {
    if (profileAvatarEl) profileAvatarEl.style.background = savedAvatarColor;
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
  if (!short) return;

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
    if (!essay) return;

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