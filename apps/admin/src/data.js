// ===== 管理后台数据管理模块 =====
// 使用 localStorage 模拟数据库

var DB = {
  // 初始化默认数据
  init: function() {
    if (!localStorage.getItem('xc_admin_init')) {
      // 资料表
      var materials = [
        {
          id: 1, title: '传播学教程（郭庆光）', sourceType: '教材', fileType: 'PDF',
          wordCount: 320000, chapterInfo: '共15章', parseStatus: 'done',
          uploadedBy: 'admin', createdAt: '2026-01-15 10:30:00'
        },
        {
          id: 2, title: '2025新传考研真题汇总', sourceType: '真题', fileType: 'Word',
          wordCount: 12000, chapterInfo: '共6套真题', parseStatus: 'done',
          uploadedBy: 'admin', createdAt: '2026-01-10 14:20:00'
        },
        {
          id: 3, title: '新闻学概论（李良荣）', sourceType: '教材', fileType: 'PDF',
          wordCount: 280000, chapterInfo: '共12章', parseStatus: 'done',
          uploadedBy: 'admin', createdAt: '2026-01-12 09:15:00'
        },
        {
          id: 4, title: '网络传播概论（彭兰）', sourceType: '教材', fileType: 'PDF',
          wordCount: 240000, chapterInfo: '共10章', parseStatus: 'parsing',
          uploadedBy: 'admin', createdAt: '2026-01-16 11:00:00'
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
    return data;
  },
  deleteMaterial: function(id) {
    var list = this.getMaterials();
    list = list.filter(function(m) { return m.id !== id; });
    localStorage.setItem('xc_materials', JSON.stringify(list));
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
  addQuestion: function(data) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    var id = parseInt(localStorage.getItem('xc_question_id') || '0') + 1;
    data.id = id;
    list.unshift(data);
    localStorage.setItem('xc_questions', JSON.stringify(list));
    localStorage.setItem('xc_question_id', id.toString());
    return data;
  },
  updateQuestion: function(id, data) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    var item = list.find(function(q) { return q.id === id; });
    if (item) {
      Object.keys(data).forEach(function(k) { item[k] = data[k]; });
      localStorage.setItem('xc_questions', JSON.stringify(list));
    }
  },
  deleteQuestion: function(id) {
    var list = JSON.parse(localStorage.getItem('xc_questions') || '[]');
    list = list.filter(function(q) { return q.id !== id; });
    localStorage.setItem('xc_questions', JSON.stringify(list));
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
