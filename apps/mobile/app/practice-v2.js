function getAllPracticeV2Ids() {
  if (typeof practiceV2Data !== 'undefined' && practiceV2Data.items) {
    return practiceV2Data.items.map(function(item) { return item.id; });
  }
  return ['practice001', 'practice002', 'practice003', 'practice004', 'practice005', 'practice006', 'practice007', 'practice008', 'practice009', 'practice010', 'practice011', 'practice012', 'practice013', 'practice014', 'practice015'];
}

function getCurrentPracticeV2() {
  if (typeof practiceV2Data !== 'undefined' && practiceV2Data.items) {
    var urlParams = new URLSearchParams(window.location.search);
    var practiceId = urlParams.get('practice') || 'practice001';
    return practiceV2Data.items.find(function(item) { return item.id === practiceId; });
  }
  return null;
}

function prevPracticeV2() {
  var practices = getAllPracticeV2Ids();
  var urlParams = new URLSearchParams(window.location.search);
  var currentId = urlParams.get('practice') || 'practice001';
  var currentIndex = practices.indexOf(currentId);
  if (currentIndex === -1) currentIndex = 0;
  var prevIndex = (currentIndex - 1 + practices.length) % practices.length;
  window.location.href = 'practice-detail.html?practice=' + practices[prevIndex];
}

function nextPracticeV2() {
  var practices = getAllPracticeV2Ids();
  var urlParams = new URLSearchParams(window.location.search);
  var currentId = urlParams.get('practice') || 'practice001';
  var currentIndex = practices.indexOf(currentId);
  if (currentIndex === -1) currentIndex = 0;
  var nextIndex = (currentIndex + 1) % practices.length;
  window.location.href = 'practice-detail.html?practice=' + practices[nextIndex];
}

function loadPracticeV2Detail() {
  var practice = getCurrentPracticeV2();
  if (!practice) return;

  var typeEl = document.getElementById('practice-type');
  if (typeEl) typeEl.textContent = practice.type;

  var titleEl = document.getElementById('practice-title');
  if (titleEl) titleEl.textContent = practice.title;

  var tagEl = document.getElementById('practice-tag');
  if (tagEl) tagEl.textContent = practice.score + '分·' + practice.wordLimit + '字';

  var questionEl = document.getElementById('practice-question');
  if (questionEl) questionEl.textContent = practice.question;

  renderPracticeFramework(practice);
  renderPracticeAnswer(practice);
  renderPracticeNotes(practice);
}

function renderPracticeFramework(practice) {
  var container = document.getElementById('practice-frame-content');
  if (!container) return;

  var html = '<div class="practice-type-bar">' +
    '<span class="practice-type-tag">' + (practice.type || '未分类') + '</span>' +
    '</div>';

  practice.framework.forEach(function(item, index) {
    html += '<div class="practice-frame-block">' +
      '<div class="practice-frame-header">' +
      '<span class="practice-frame-section">' + item.section + '</span>' +
      '<span class="practice-sample-btn" onclick="togglePracticeSample(\'' + practice.id + '-sample-' + index + '\')">范例</span>' +
      '</div>' +
      '<div class="practice-frame-outline">' + item.outline + '</div>' +
      '<div class="practice-frame-sample" id="' + practice.id + '-sample-' + index + '" style="display:none;">' +
      '<div class="practice-sample-content">' + item.sample + '</div>' +
      '</div>' +
      '</div>';
  });

  container.innerHTML = html;
}

function togglePracticeSample(id) {
  var el = document.getElementById(id);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

function renderPracticeAnswer(practice) {
  var container = document.getElementById('practice-answer-content');
  if (!container) return;

  var savedVersion = localStorage.getItem('practice-custom-answer-' + practice.id);
  var content = savedVersion || practice.fullSample;

  container.innerHTML = '<textarea class="practice-answer-textarea" id="practice-answer-editor" placeholder="在此编辑您的答案...">' + content + '</textarea>' +
    '<button class="practice-save-btn" onclick="savePracticeAnswer(\'' + practice.id + '\')">保存修改</button>';
}

function savePracticeAnswer(practiceId) {
  var editor = document.getElementById('practice-answer-editor');
  if (editor) {
    localStorage.setItem('practice-custom-answer-' + practiceId, editor.value);
    alert('答案已保存！');
  }
}

function renderPracticeNotes(practice) {
  var container = document.getElementById('practice-notes-content');
  if (!container) return;

  var html = '';
  practice.notes.forEach(function(note) {
    html += '<div class="practice-note-card">' +
      '<div class="practice-note-author">' + note.author + '</div>' +
      '<div class="practice-note-content">' + note.content + '</div>' +
      '</div>';
  });

  html += '<div class="practice-submit-note">' +
    '<textarea class="practice-note-input" id="practice-note-input" placeholder="分享您的实务背诵心得..."></textarea>' +
    '<button class="practice-submit-btn" onclick="submitPracticeNote(\'' + practice.id + '\')">发布笔记</button>' +
    '</div>';

  container.innerHTML = html;
}

function submitPracticeNote(practiceId) {
  var input = document.getElementById('practice-note-input');
  if (input && input.value.trim()) {
    var notes = JSON.parse(localStorage.getItem('practice-notes-' + practiceId) || '[]');
    notes.push({
      author: '我',
      content: input.value.trim()
    });
    localStorage.setItem('practice-notes-' + practiceId, JSON.stringify(notes));
    input.value = '';
    var practice = getCurrentPracticeV2();
    practice.notes = notes;
    renderPracticeNotes(practice);
    alert('笔记已发布！');
  }
}

function handlePracticeStatus(status) {
  var practice = getCurrentPracticeV2();
  if (practice) {
    practice.masteryLevel = status;
    var statusBtns = document.querySelectorAll('.practice-status-btn');
    statusBtns.forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.dataset.status === status) {
        btn.classList.add('active');
      }
    });
  }
}