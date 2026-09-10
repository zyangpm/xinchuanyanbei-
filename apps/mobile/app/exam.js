var currentQuestion = 1;
var totalQuestions = 3;
var selectedAnalysisType = '思路';

var isCommentPage = false;

var historyRecords = [
  { id: 'interview', name: '新闻采访题', icon: '📝', color: 'var(--seal)', page: 'exam-interview.html' },
  { id: 'comment', name: '新闻评论题', icon: '💬', color: 'var(--gold)', page: 'exam-comment.html' },
  { id: 'news', name: '新闻消息题', icon: '📰', color: 'var(--green)', page: 'exam-news.html' },
  { id: 'health', name: '健康传播策划', icon: '🏥', color: 'var(--green)', page: 'exam-health.html' },
  { id: 'marketing', name: '品牌整合营销', icon: '📊', color: 'var(--gold)', page: 'exam-marketing.html' },
  { id: 'copywriting', name: '广告小实务文案', icon: '✏️', color: 'var(--seal)', page: 'exam-copywriting.html' }
];

var healthQuestions = [
  {
    type: '健康传播干预策划',
    title: '请为"大学生不吃早餐健康干预方案"设计一份完整的健康传播干预策划方案',
    framework: [
      { id: 'preface', title: '一、方案前言', placeholder: '请简要介绍方案背景和目标' },
      { id: 'audience', title: '二、三层分层受众', children: [
        { id: 'audience1', title: '1. 一级核心受众：', placeholder: '大学生群体（18-25岁）' },
        { id: 'audience2', title: '2. 二级影响受众：', placeholder: '高校食堂、辅导员、家长' },
        { id: 'audience3', title: '3. 三级资源受众：', placeholder: '校医院、健康教育中心、媒体' }
      ]},
      { id: 'theory', title: '三、理论支撑', children: [
        { id: 'hbm', title: '4. 健康信念模型HBM：', placeholder: '感知威胁、感知效益、感知障碍、自我效能' },
        { id: 'kap', title: '5. KAP知信行模式：', placeholder: '知识→态度→行为的转化路径' }
      ]},
      { id: 'objective', title: '四、三层可量化策划目标', children: [
        { id: 'cognitive', title: '6. 认知目标：', placeholder: '提升大学生对不吃早餐危害的认知率' },
        { id: 'attitude', title: '7. 态度目标：', placeholder: '转变大学生对早餐重要性的态度' },
        { id: 'behavior', title: '8. 行为目标：', placeholder: '提高大学生早餐就餐率' }
      ]},
      { id: 'theme', title: '五、传播主主题+3条Slogan', children: [
        { id: 'main_theme', title: '主传播主题：', placeholder: '例如："早餐开启活力一天"' },
        { id: 'slogan1', title: 'Slogan1：', placeholder: '' },
        { id: 'slogan2', title: 'Slogan2：', placeholder: '' },
        { id: 'slogan3', title: 'Slogan3：', placeholder: '' }
      ]},
      { id: 'strategy', title: '六、三阶段全域传播策略', children: [
        { id: 'warmup', title: '9. 预热期（1-7天）', children: [
          { id: 'warmup_online', title: '线上：', placeholder: '社交媒体话题预热、健康知识科普' },
          { id: 'warmup_offline', title: '线下：', placeholder: '海报张贴、校园调研' }
        ]},
        { id: 'burst', title: '10. 爆发期（8-25天）', children: [
          { id: 'burst_online', title: '线上：', placeholder: '短视频挑战赛、直播讲座' },
          { id: 'burst_offline', title: '线下：', placeholder: '早餐打卡活动、健康咨询' }
        ]},
        { id: 'sustain', title: '11. 长效续热期', placeholder: '持续传播、效果监测' }
      ]},
      { id: 'creative', title: '七、创意物料设计（30秒短视频分镜）', children: [
        { id: 'shot1', title: '镜头1：', placeholder: '' },
        { id: 'shot2', title: '镜头2：', placeholder: '' },
        { id: 'shot3', title: '镜头3：', placeholder: '' },
        { id: 'ending', title: '结尾字幕：', placeholder: '' }
      ]},
      { id: 'evaluation', title: '八、双层效果评估', children: [
        { id: 'process_eval', title: '12. 过程评估：', placeholder: '传播覆盖率、互动量、参与度' },
        { id: 'result_eval', title: '13. 结果评估：', placeholder: '知识知晓率、态度转变率、行为改变率' }
      ]}
    ],
    analysis: {
      '思路': '本题需结合健康信念模型(HBM)和KAP知信行模式，从认知、态度、行为三个层面设计干预方案。重点关注大学生群体的特征，设计有针对性的传播策略。',
      '采分点': '1. 三层受众分层（5分）\n2. HBM模型应用（10分）\n3. KAP模式应用（10分）\n4. 三阶段策略设计（15分）\n5. 效果评估体系（10分）',
      '常见问题': '1. 理论应用生硬，未结合实际场景\n2. 目标不可量化，缺乏具体指标\n3. 传播渠道单一，未形成全域覆盖\n4. 效果评估仅关注结果，忽视过程评估'
    },
    fullAnswer: '<b>《大学生不吃早餐健康干预方案》</b><br><br><b>一、方案前言：</b>针对大学生不吃早餐现象普遍、健康意识薄弱的现状，本方案旨在通过系统化的健康传播干预，提升大学生早餐就餐率，促进健康生活方式养成。<br><br><b>二、三层分层受众：</b><br>1. 一级核心受众：在校大学生（18-25岁）<br>2. 二级影响受众：高校食堂经营者、辅导员、学生家长<br>3. 三级资源受众：校医院、健康教育中心、校园媒体<br><br><b>三、理论支撑：</b><br>4. 健康信念模型HBM：感知不吃早餐的健康威胁、感知吃早餐的效益、克服时间障碍、提升自我效能<br>5. KAP知信行模式：知识普及→态度转变→行为养成<br><br><b>四、三层可量化策划目标：</b><br>6. 认知目标：使80%的大学生了解不吃早餐的危害<br>7. 态度目标：使60%的大学生重视早餐的重要性<br>8. 行为目标：使早餐就餐率提升至70%<br><br><b>五、传播主主题+3条Slogan：</b><br>主传播主题："早餐开启活力一天"<br>Slogan1："早餐一小步，健康一大步"<br>Slogan2："拒绝空腹上课，拥抱元气早晨"<br>Slogan3："今天吃早餐了吗？"<br><br><b>六、三阶段全域传播策略：</b><br>9. 预热期（1-7天）线上：#早餐挑战#话题预热；线下：校园海报、食堂横幅<br>10. 爆发期（8-25天）线上：短视频挑战赛、健康直播；线下：早餐打卡、营养师讲座<br>11. 长效续热期：持续内容输出、月度健康报告<br><br><b>七、创意物料设计：</b><br>镜头1：学生匆忙赶课（痛点）<br>镜头2：营养早餐展示（解决方案）<br>镜头3：活力满满的一天（效果）<br>结尾字幕："早餐开启活力一天"<br><br><b>八、双层效果评估：</b><br>12. 过程评估：话题曝光量、活动参与人数、问卷回收率<br>13. 结果评估：早餐就餐率、健康知识知晓率、态度转变率'
  },
  {
    type: '健康传播干预策划',
    title: '请为"青少年网络欺凌心理健康传播方案"设计一份完整的健康传播干预策划方案',
    framework: [
      { id: 'preface', title: '一、方案前言', placeholder: '请简要介绍方案背景和目标' },
      { id: 'audience', title: '二、三层分层受众', children: [
        { id: 'audience1', title: '1. 一级核心受众：', placeholder: '青少年群体（12-18岁）' },
        { id: 'audience2', title: '2. 二级影响受众：', placeholder: '家长、教师、学校管理者' },
        { id: 'audience3', title: '3. 三级资源受众：', placeholder: '心理咨询师、社工机构、网络平台' }
      ]},
      { id: 'theory', title: '三、理论支撑', children: [
        { id: 'hbm', title: '4. 健康信念模型HBM：', placeholder: '感知网络欺凌的心理威胁、感知求助的效益' },
        { id: 'kap', title: '5. KAP知信行模式：', placeholder: '知识→态度→行为的转化路径' }
      ]},
      { id: 'objective', title: '四、三层可量化策划目标', children: [
        { id: 'cognitive', title: '6. 认知目标：', placeholder: '提升青少年对网络欺凌危害的认知' },
        { id: 'attitude', title: '7. 态度目标：', placeholder: '转变对网络欺凌的冷漠态度' },
        { id: 'behavior', title: '8. 行为目标：', placeholder: '减少网络欺凌行为，增加求助行为' }
      ]},
      { id: 'theme', title: '五、传播主主题+3条Slogan', children: [
        { id: 'main_theme', title: '主传播主题：', placeholder: '例如："拒绝网络欺凌，守护心理健康"' },
        { id: 'slogan1', title: 'Slogan1：', placeholder: '' },
        { id: 'slogan2', title: 'Slogan2：', placeholder: '' },
        { id: 'slogan3', title: 'Slogan3：', placeholder: '' }
      ]},
      { id: 'strategy', title: '六、三阶段全域传播策略', children: [
        { id: 'warmup', title: '9. 预热期（1-7天）', children: [
          { id: 'warmup_online', title: '线上：', placeholder: '社交媒体话题、科普视频' },
          { id: 'warmup_offline', title: '线下：', placeholder: '校园讲座、海报宣传' }
        ]},
        { id: 'burst', title: '10. 爆发期（8-25天）', children: [
          { id: 'burst_online', title: '线上：', placeholder: '公益直播、话题挑战' },
          { id: 'burst_offline', title: '线下：', placeholder: '主题班会、心理咨询' }
        ]},
        { id: 'sustain', title: '11. 长效续热期', placeholder: '持续监测、定期回访' }
      ]},
      { id: 'creative', title: '七、创意物料设计（30秒短视频分镜）', children: [
        { id: 'shot1', title: '镜头1：', placeholder: '' },
        { id: 'shot2', title: '镜头2：', placeholder: '' },
        { id: 'shot3', title: '镜头3：', placeholder: '' },
        { id: 'ending', title: '结尾字幕：', placeholder: '' }
      ]},
      { id: 'evaluation', title: '八、双层效果评估', children: [
        { id: 'process_eval', title: '12. 过程评估：', placeholder: '传播覆盖率、互动量、参与度' },
        { id: 'result_eval', title: '13. 结果评估：', placeholder: '知识知晓率、态度转变率、行为改变率' }
      ]}
    ],
    analysis: {
      '思路': '本题需围绕青少年网络欺凌问题，结合心理健康传播特点，设计从预防到干预的完整方案。重点关注HBM模型中感知威胁和自我效能的构建。',
      '采分点': '1. 三层受众分层（5分）\n2. HBM模型应用（10分）\n3. KAP模式应用（10分）\n4. 三阶段策略设计（15分）\n5. 效果评估体系（10分）',
      '常见问题': '1. 忽视心理层面的深层需求\n2. 方案缺乏可操作性\n3. 未考虑青少年的网络使用特点\n4. 效果评估指标不明确'
    },
    fullAnswer: '<b>《青少年网络欺凌心理健康传播方案》</b><br><br><b>一、方案前言：</b>针对青少年网络欺凌日益严重、心理健康问题突出的现状，本方案旨在通过系统化的心理健康传播干预，提升青少年网络安全意识，促进心理健康保护。<br><br><b>二、三层分层受众：</b><br>1. 一级核心受众：青少年（12-18岁）<br>2. 二级影响受众：家长、教师、学校管理者<br>3. 三级资源受众：心理咨询师、社工机构、网络平台<br><br><b>三、理论支撑：</b><br>4. 健康信念模型HBM：感知网络欺凌的心理威胁、感知求助的效益、克服沉默障碍、提升自我保护效能<br>5. KAP知信行模式：认知网络欺凌危害→树立正确态度→采取保护行为<br><br><b>四、三层可量化策划目标：</b><br>6. 认知目标：使90%的青少年了解网络欺凌的危害<br>7. 态度目标：使70%的青少年反对网络欺凌行为<br>8. 行为目标：使网络欺凌举报率提升至50%<br><br><b>五、传播主主题+3条Slogan：</b><br>主传播主题："拒绝网络欺凌，守护心理健康"<br>Slogan1："友善发言，温暖网络"<br>Slogan2："不做旁观者，要做守护者"<br>Slogan3："你的声音，可以改变世界"<br><br><b>六、三阶段全域传播策略：</b><br>9. 预热期（1-7天）线上：#反网络欺凌#话题；线下：校园讲座、主题海报<br>10. 爆发期（8-25天）线上：公益直播、短视频挑战；线下：主题班会、心理咨询活动<br>11. 长效续热期：定期回访、持续内容输出<br><br><b>七、创意物料设计：</b><br>镜头1：网络欺凌场景（痛点）<br>镜头2：互助支持场景（解决方案）<br>镜头3：阳光笑脸（效果）<br>结尾字幕："拒绝网络欺凌，守护心理健康"<br><br><b>八、双层效果评估：</b><br>12. 过程评估：话题曝光量、活动参与人数、心理咨询预约量<br>13. 结果评估：网络欺凌举报率、心理健康知识知晓率、求助行为增加率'
  },
  {
    type: '健康传播干预策划',
    title: '请为"当代年轻人亲情疏离心理公益传播策划"设计一份完整的健康传播干预策划方案',
    framework: [
      { id: 'preface', title: '一、方案前言', placeholder: '请简要介绍方案背景和目标' },
      { id: 'audience', title: '二、三层分层受众', children: [
        { id: 'audience1', title: '1. 一级核心受众：', placeholder: '当代年轻人（20-35岁）' },
        { id: 'audience2', title: '2. 二级影响受众：', placeholder: '父母长辈、家庭其他成员' },
        { id: 'audience3', title: '3. 三级资源受众：', placeholder: '心理咨询师、社区组织、媒体平台' }
      ]},
      { id: 'theory', title: '三、理论支撑', children: [
        { id: 'hbm', title: '4. 健康信念模型HBM：', placeholder: '感知亲情疏离的心理威胁、感知改善关系的效益' },
        { id: 'kap', title: '5. KAP知信行模式：', placeholder: '知识→态度→行为的转化路径' }
      ]},
      { id: 'objective', title: '四、三层可量化策划目标', children: [
        { id: 'cognitive', title: '6. 认知目标：', placeholder: '提升年轻人对亲情疏离危害的认知' },
        { id: 'attitude', title: '7. 态度目标：', placeholder: '转变对家庭关系的冷漠态度' },
        { id: 'behavior', title: '8. 行为目标：', placeholder: '增加与家人沟通频率，改善家庭关系' }
      ]},
      { id: 'theme', title: '五、传播主主题+3条Slogan', children: [
        { id: 'main_theme', title: '主传播主题：', placeholder: '例如："温暖亲情，从沟通开始"' },
        { id: 'slogan1', title: 'Slogan1：', placeholder: '' },
        { id: 'slogan2', title: 'Slogan2：', placeholder: '' },
        { id: 'slogan3', title: 'Slogan3：', placeholder: '' }
      ]},
      { id: 'strategy', title: '六、三阶段全域传播策略', children: [
        { id: 'warmup', title: '9. 预热期（1-7天）', children: [
          { id: 'warmup_online', title: '线上：', placeholder: '社交媒体话题、情感短视频' },
          { id: 'warmup_offline', title: '线下：', placeholder: '社区活动、亲情主题展览' }
        ]},
        { id: 'burst', title: '10. 爆发期（8-25天）', children: [
          { id: 'burst_online', title: '线上：', placeholder: '公益直播、话题挑战' },
          { id: 'burst_offline', title: '线下：', placeholder: '家庭互动活动、心理咨询' }
        ]},
        { id: 'sustain', title: '11. 长效续热期', placeholder: '持续监测、定期回访' }
      ]},
      { id: 'creative', title: '七、创意物料设计（30秒短视频分镜）', children: [
        { id: 'shot1', title: '镜头1：', placeholder: '' },
        { id: 'shot2', title: '镜头2：', placeholder: '' },
        { id: 'shot3', title: '镜头3：', placeholder: '' },
        { id: 'ending', title: '结尾字幕：', placeholder: '' }
      ]},
      { id: 'evaluation', title: '八、双层效果评估', children: [
        { id: 'process_eval', title: '12. 过程评估：', placeholder: '传播覆盖率、互动量、参与度' },
        { id: 'result_eval', title: '13. 结果评估：', placeholder: '知识知晓率、态度转变率、行为改变率' }
      ]}
    ],
    analysis: {
      '思路': '本题需围绕亲情疏离这一社会心理问题，设计从情感唤醒到行为改变的完整传播方案。重点运用HBM模型激发年轻人对家庭关系的重视。',
      '采分点': '1. 三层受众分层（5分）\n2. HBM模型应用（10分）\n3. KAP模式应用（10分）\n4. 三阶段策略设计（15分）\n5. 效果评估体系（10分）',
      '常见问题': '1. 情感唤醒不足，缺乏感染力\n2. 方案过于理性，忽视情感共鸣\n3. 未考虑代际沟通障碍\n4. 效果评估缺乏量化指标'
    },
    fullAnswer: '<b>《当代年轻人亲情疏离心理公益传播策划》</b><br><br><b>一、方案前言：</b>针对当代年轻人亲情疏离现象普遍、家庭关系淡漠的现状，本方案旨在通过情感唤醒和行为引导，促进年轻人与家人的沟通与理解，构建和谐家庭关系。<br><br><b>二、三层分层受众：</b><br>1. 一级核心受众：当代年轻人（20-35岁）<br>2. 二级影响受众：父母长辈、家庭其他成员<br>3. 三级资源受众：心理咨询师、社区组织、媒体平台<br><br><b>三、理论支撑：</b><br>4. 健康信念模型HBM：感知亲情疏离的心理威胁、感知改善关系的效益、克服沟通障碍、提升情感表达效能<br>5. KAP知信行模式：认知亲情价值→重视家庭关系→主动沟通行动<br><br><b>四、三层可量化策划目标：</b><br>6. 认知目标：使85%的年轻人认识到亲情疏离的危害<br>7. 态度目标：使75%的年轻人重视家庭关系<br>8. 行为目标：使与家人沟通频率提升50%<br><br><b>五、传播主主题+3条Slogan：</b><br>主传播主题："温暖亲情，从沟通开始"<br>Slogan1："别让忙碌，疏远了亲情"<br>Slogan2："陪伴是最长情的告白"<br>Slogan3："家，永远是你最温暖的港湾"<br><br><b>六、三阶段全域传播策略：</b><br>9. 预热期（1-7天）线上：#亲情沟通#话题；线下：社区亲情展览、主题海报<br>10. 爆发期（8-25天）线上：情感直播、短视频挑战；线下：家庭互动活动、心理咨询<br>11. 长效续热期：定期回访、持续内容输出<br><br><b>七、创意物料设计：</b><br>镜头1：孤独的年轻人（痛点）<br>镜头2：家庭温暖场景（解决方案）<br>镜头3：温馨团聚（效果）<br>结尾字幕："温暖亲情，从沟通开始"<br><br><b>八、双层效果评估：</b><br>12. 过程评估：话题曝光量、活动参与人数、心理咨询预约量<br>13. 结果评估：家庭沟通频率、亲情满意度、家庭关系改善率'
  },
  {
    type: '健康传播干预策划',
    title: '请为"全民《健康中国》大众健康普及策划"设计一份完整的健康传播干预策划方案',
    framework: [
      { id: 'preface', title: '一、方案前言', placeholder: '请简要介绍方案背景和目标' },
      { id: 'audience', title: '二、三层分层受众', children: [
        { id: 'audience1', title: '1. 一级核心受众：', placeholder: '全体民众' },
        { id: 'audience2', title: '2. 二级影响受众：', placeholder: '各级政府、医疗机构、媒体机构' },
        { id: 'audience3', title: '3. 三级资源受众：', placeholder: '健康专家、社会组织、企业' }
      ]},
      { id: 'theory', title: '三、理论支撑', children: [
        { id: 'hbm', title: '4. 健康信念模型HBM：', placeholder: '感知健康威胁、感知健康行为效益' },
        { id: 'kap', title: '5. KAP知信行模式：', placeholder: '知识→态度→行为的转化路径' }
      ]},
      { id: 'objective', title: '四、三层可量化策划目标', children: [
        { id: 'cognitive', title: '6. 认知目标：', placeholder: '提升全民健康知识知晓率' },
        { id: 'attitude', title: '7. 态度目标：', placeholder: '树立健康生活理念' },
        { id: 'behavior', title: '8. 行为目标：', placeholder: '促进健康生活方式养成' }
      ]},
      { id: 'theme', title: '五、传播主主题+3条Slogan', children: [
        { id: 'main_theme', title: '主传播主题：', placeholder: '例如："健康中国，全民共建"' },
        { id: 'slogan1', title: 'Slogan1：', placeholder: '' },
        { id: 'slogan2', title: 'Slogan2：', placeholder: '' },
        { id: 'slogan3', title: 'Slogan3：', placeholder: '' }
      ]},
      { id: 'strategy', title: '六、三阶段全域传播策略', children: [
        { id: 'warmup', title: '9. 预热期（1-7天）', children: [
          { id: 'warmup_online', title: '线上：', placeholder: '社交媒体话题、健康科普' },
          { id: 'warmup_offline', title: '线下：', placeholder: '社区宣传、健康讲座' }
        ]},
        { id: 'burst', title: '10. 爆发期（8-25天）', children: [
          { id: 'burst_online', title: '线上：', placeholder: '大型直播、话题挑战' },
          { id: 'burst_offline', title: '线下：', placeholder: '健康嘉年华、义诊活动' }
        ]},
        { id: 'sustain', title: '11. 长效续热期', placeholder: '持续传播、健康监测' }
      ]},
      { id: 'creative', title: '七、创意物料设计（30秒短视频分镜）', children: [
        { id: 'shot1', title: '镜头1：', placeholder: '' },
        { id: 'shot2', title: '镜头2：', placeholder: '' },
        { id: 'shot3', title: '镜头3：', placeholder: '' },
        { id: 'ending', title: '结尾字幕：', placeholder: '' }
      ]},
      { id: 'evaluation', title: '八、双层效果评估', children: [
        { id: 'process_eval', title: '12. 过程评估：', placeholder: '传播覆盖率、互动量、参与度' },
        { id: 'result_eval', title: '13. 结果评估：', placeholder: '知识知晓率、态度转变率、行为改变率' }
      ]}
    ],
    analysis: {
      '思路': '本题需围绕"健康中国"战略，设计面向全民的健康普及传播方案。重点运用HBM和KAP模型，从认知、态度、行为三个层面推动全民健康素养提升。',
      '采分点': '1. 三层受众分层（5分）\n2. HBM模型应用（10分）\n3. KAP模式应用（10分）\n4. 三阶段策略设计（15分）\n5. 效果评估体系（10分）',
      '常见问题': '1. 受众定位过宽，缺乏针对性\n2. 健康知识专业性不足，可信度低\n3. 传播渠道整合不够，效果分散\n4. 效果评估缺乏长期监测'
    },
    fullAnswer: '<b>《全民健康中国大众健康普及策划》</b><br><br><b>一、方案前言：</b>为响应"健康中国"战略，提升全民健康素养，本方案旨在通过系统化的健康传播干预，普及健康知识，促进健康生活方式养成，构建健康中国。<br><br><b>二、三层分层受众：</b><br>1. 一级核心受众：全体民众<br>2. 二级影响受众：各级政府、医疗机构、媒体机构<br>3. 三级资源受众：健康专家、社会组织、企业<br><br><b>三、理论支撑：</b><br>4. 健康信念模型HBM：感知健康威胁、感知健康行为效益、克服健康行为障碍、提升健康自我效能<br>5. KAP知信行模式：健康知识普及→健康态度转变→健康行为养成<br><br><b>四、三层可量化策划目标：</b><br>6. 认知目标：使全民健康知识知晓率提升至80%<br>7. 态度目标：使70%的民众树立健康生活理念<br>8. 行为目标：使健康生活方式普及率提升至60%<br><br><b>五、传播主主题+3条Slogan：</b><br>主传播主题："健康中国，全民共建"<br>Slogan1："健康中国，你我同行"<br>Slogan2："健康生活，从每一天开始"<br>Slogan3："共建健康中国，共享幸福生活"<br><br><b>六、三阶段全域传播策略：</b><br>9. 预热期（1-7天）线上：#健康中国#话题；线下：社区宣传、健康讲座<br>10. 爆发期（8-25天）线上：大型健康直播、话题挑战；线下：健康嘉年华、义诊活动<br>11. 长效续热期：持续健康科普、健康监测报告<br><br><b>七、创意物料设计：</b><br>镜头1：健康生活场景（示范）<br>镜头2：健康知识科普（教育）<br>镜头3：全民健康行动（参与）<br>结尾字幕："健康中国，全民共建"<br><br><b>八、双层效果评估：</b><br>12. 过程评估：话题曝光量、活动参与人数、健康咨询量<br>13. 结果评估：健康知识知晓率、健康生活方式普及率、健康指标改善率'
  }
];

function saveHistoryProgress(pageId, questionNum) {
  var history = JSON.parse(localStorage.getItem('exam_history') || '{}');
  history[pageId] = {
    question: questionNum,
    timestamp: Date.now()
  };
  localStorage.setItem('exam_history', JSON.stringify(history));
}

function loadHistoryProgress(pageId) {
  var history = JSON.parse(localStorage.getItem('exam_history') || '{}');
  return history[pageId] || null;
}

function renderHistorySection() {
  var container = document.getElementById('history-list');
  if (!container) return;
  
  var history = JSON.parse(localStorage.getItem('exam_history') || '{}');
  var hasHistory = false;
  
  var html = '';
  historyRecords.forEach(function(record) {
    var progress = history[record.id];
    if (progress) {
      hasHistory = true;
      var date = new Date(progress.timestamp);
      var dateStr = formatDate(date);
      
      html += '<div style="flex-shrink:0;width:140px;background:var(--card);border-radius:12px;padding:16px;border:1px solid var(--paper-line);cursor:pointer;transition:all 0.3s;" onclick="continueHistory(\'' + record.page + '\', ' + progress.question + ')" onmouseenter="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.1)\'" onmouseleave="this.style.boxShadow=\'none\'">';
      html += '<div style="font-size:24px;margin-bottom:8px;">' + record.icon + '</div>';
      html += '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px;">' + record.name + '</div>';
      html += '<div style="font-size:12px;color:var(--ink-light);">第' + progress.question + '题 · ' + dateStr + '</div>';
      html += '</div>';
    }
  });
  
  if (!hasHistory) {
    html = '<div style="text-align:center;padding:20px;color:var(--ink-light);font-size:13px;">暂无训练记录<br><span style="font-size:12px;">完成练习后将显示在这里</span></div>';
  }
  
  container.innerHTML = html;
}

function formatDate(date) {
  var now = new Date();
  var diff = now - date;
  var hours = Math.floor(diff / (1000 * 60 * 60));
  var days = Math.floor(hours / 24);
  
  if (hours < 1) return '刚刚';
  if (hours < 24) return hours + '小时前';
  if (days < 7) return days + '天前';
  return date.getMonth() + 1 + '月' + date.getDate() + '日';
}

function continueHistory(page, question) {
  navigateTo(page + '?q=' + question);
}

function initHistorySection() {
  renderHistorySection();
}

var questions = [
  {
    id: 1,
    type: '采访提纲设计',
    title: '请为"某地突发公共卫生事件"设计一份完整的采访提纲',
    framework: [
      { title: '一、采访任务/目的', content: '明确本次采访的缘由、核心目标，以及可附带的延伸采访任务，要求具体清晰、不笼统。' },
      { title: '二、人员安排', content: '明确记者人数、人员类型（文字记者、摄影记者、摄像记者等），分工清晰。' },
      { title: '三、采访时间', content: '确定采访次数、每次采访的起止时间，规划整体时长。' },
      { title: '四、采访地点', content: '明确访谈地点、新闻事发地点，提前核实精准位置。' },
      { title: '五、采访对象', content: '确定核心采访对象、备用替代对象，留存联系方式（电话、邮箱、地址等）。' },
      { title: '六、交通方式', content: '规划出行方式（步行、自驾、单位派车、拼车等），明确候车、集合地点。' },
      { title: '七、器材配备', content: '罗列录音、摄像、拍照、电脑、纸笔等全套采访设备，广电类采访需细化器材清单。' },
      { title: '八、采访提纲与流程', content: '明确核心提问要点、完整采访步骤，是采访计划的核心内容。' }
    ]
  },
  {
    id: 2,
    type: '人物专访提纲',
    title: '请为"一位抗疫英雄医生"设计一份人物专访提纲',
    framework: [
      { title: '一、采访任务/目的', content: '明确本次采访的缘由、核心目标，以及可附带的延伸采访任务，要求具体清晰、不笼统。' },
      { title: '二、人员安排', content: '明确记者人数、人员类型（文字记者、摄影记者、摄像记者等），分工清晰。' },
      { title: '三、采访时间', content: '确定采访次数、每次采访的起止时间，规划整体时长。' },
      { title: '四、采访地点', content: '明确访谈地点、新闻事发地点，提前核实精准位置。' },
      { title: '五、采访对象', content: '确定核心采访对象、备用替代对象，留存联系方式（电话、邮箱、地址等）。' },
      { title: '六、交通方式', content: '规划出行方式（步行、自驾、单位派车、拼车等），明确候车、集合地点。' },
      { title: '七、器材配备', content: '罗列录音、摄像、拍照、电脑、纸笔等全套采访设备，广电类采访需细化器材清单。' },
      { title: '八、采访提纲与流程', content: '明确核心提问要点、完整采访步骤，是采访计划的核心内容。' }
    ]
  },
  {
    id: 3,
    type: '深度调查采访',
    title: '请为"某企业环境污染事件"设计一份深度调查采访计划',
    framework: [
      { title: '一、采访任务/目的', content: '明确本次采访的缘由、核心目标，以及可附带的延伸采访任务，要求具体清晰、不笼统。' },
      { title: '二、人员安排', content: '明确记者人数、人员类型（文字记者、摄影记者、摄像记者等），分工清晰。' },
      { title: '三、采访时间', content: '确定采访次数、每次采访的起止时间，规划整体时长。' },
      { title: '四、采访地点', content: '明确访谈地点、新闻事发地点，提前核实精准位置。' },
      { title: '五、采访对象', content: '确定核心采访对象、备用替代对象，留存联系方式（电话、邮箱、地址等）。' },
      { title: '六、交通方式', content: '规划出行方式（步行、自驾、单位派车、拼车等），明确候车、集合地点。' },
      { title: '七、器材配备', content: '罗列录音、摄像、拍照、电脑、纸笔等全套采访设备，广电类采访需细化器材清单。' },
      { title: '八、采访提纲与流程', content: '明确核心提问要点、完整采访步骤，是采访计划的核心内容。' }
    ]
  }
];

function switchExamTab(tab) {
  if (tab !== 'practice') return;
}

function switchInterviewTab(tab) {
  var tabs = document.querySelectorAll('.tab-item');
  var panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(function(t) { t.classList.remove('active'); });
  panels.forEach(function(p) { p.classList.remove('active'); });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    tabs.forEach(function(t) {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + tab + "'")) {
        t.classList.add('active');
      }
    });
  }
  
  var tabPanel = document.getElementById('tab-' + tab);
  if (tabPanel) {
    tabPanel.classList.add('active');
  }
  
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns) {
    actionBtns.style.display = tab === 'answer' ? 'flex' : 'none';
  }
}

function initInterviewPage() {
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function toggleAiHint(id) {
  var hint = document.getElementById(id);
  if (hint) {
    hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
  }
}

function saveAnswer(index) {
  var textarea = document.getElementById('ans-' + index);
  if (textarea) {
    var answers = JSON.parse(localStorage.getItem('exam_answers') || '{}');
    var key = 'q' + currentQuestion + '_ans_' + index;
    answers[key] = textarea.value;
    localStorage.setItem('exam_answers', JSON.stringify(answers));
  }
}

function loadAnswers() {
  var answers = JSON.parse(localStorage.getItem('exam_answers') || '{}');
  for (var i = 1; i <= 8; i++) {
    var textarea = document.getElementById('ans-' + i);
    if (textarea) {
      var key = 'q' + currentQuestion + '_ans_' + i;
      textarea.value = answers[key] || '';
    }
  }
}

function showFullAnswer() {
  var modal = document.getElementById('full-answer-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function showMyAnswers() {
  var answers = JSON.parse(localStorage.getItem('exam_answers') || '{}');
  var container = document.getElementById('my-answers-content');
  
  var sectionTitles = [
    '一、采访任务/目的',
    '二、人员安排',
    '三、采访时间',
    '四、采访地点',
    '五、采访对象',
    '六、交通方式',
    '七、器材配备',
    '八、采访提纲与流程'
  ];
  
  var html = '<div style="padding:16px 0;">';
  var hasContent = false;
  
  for (var i = 1; i <= 8; i++) {
    var key = 'q' + currentQuestion + '_ans_' + i;
    var content = answers[key] || '';
    
    if (content.trim()) {
      hasContent = true;
      html += '<div style="margin-bottom:20px;">' +
        '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px;">' + sectionTitles[i-1] + '</div>' +
        '<div style="background:var(--paper);border-radius:8px;padding:12px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>' +
        '</div>';
    }
  }
  
  if (!hasContent) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">' +
      '<div style="font-size:48px;margin-bottom:12px;">📝</div>' +
      '<div>还没有填写答案</div>' +
      '<div style="font-size:12px;margin-top:8px;">在"考生作答"TAB中填写答案后可查看汇总</div>' +
      '</div>';
  }
  
  html += '</div>';
  container.innerHTML = html;
  
  var modal = document.getElementById('my-answers-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function prevQuestion() {
  if (currentQuestion > 1) {
    currentQuestion--;
    updateQuestion();
  }
}

function nextQuestion() {
  if (currentQuestion < totalQuestions) {
    currentQuestion++;
    updateQuestion();
  }
}

function updateQuestion() {
  var q = questions[currentQuestion - 1];
  
  document.getElementById('current-question').textContent = currentQuestion;
  document.querySelector('.question-type').textContent = '类型：' + q.type;
  document.querySelector('.question-title').textContent = q.title;
  
  document.getElementById('prev-btn').style.opacity = currentQuestion === 1 ? '0.5' : '1';
  document.getElementById('prev-btn').style.cursor = currentQuestion === 1 ? 'not-allowed' : 'pointer';
  document.getElementById('next-btn').style.opacity = currentQuestion === totalQuestions ? '0.5' : '1';
  document.getElementById('next-btn').style.cursor = currentQuestion === totalQuestions ? 'not-allowed' : 'pointer';
  
  loadAnswers();
  
  var aiHints = document.querySelectorAll('.ai-hint');
  aiHints.forEach(function(hint) {
    hint.style.display = 'none';
  });
  
  saveHistoryProgress('interview', currentQuestion);
}

function initInterviewPage() {
  var urlParams = new URLSearchParams(window.location.search);
  var qParam = urlParams.get('q');
  if (qParam && parseInt(qParam) >= 1 && parseInt(qParam) <= totalQuestions) {
    currentQuestion = parseInt(qParam);
  }
  
  updateQuestion();
  
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function openPublishAnalysisModal() {
  var modal = document.getElementById('publish-analysis-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function selectAnalysisType(type) {
  selectedAnalysisType = type;
  var btns = document.querySelectorAll('.analysis-type-btn, .analysis-btn');
  btns.forEach(function(btn) {
    btn.classList.remove('active');
  });
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  if (window.location.pathname.includes('exam-health.html')) {
    renderHealthAnalysis();
  }
}

function submitAnalysis() {
  var content = document.getElementById('analysis-content').value.trim();
  if (!content) {
    showConfirm('提示', '请输入分析内容', 'warning');
    return;
  }
  
  var typeNames = { '思路': '解题思路', '记忆': '记忆方法', '案例': '案例分析', '技巧': '答题技巧' };
  
  var analysis = {
    id: Date.now(),
    questionId: currentQuestion,
    type: selectedAnalysisType,
    typeName: typeNames[selectedAnalysisType],
    content: content,
    nickname: localStorage.getItem('userNickname') || '匿名用户',
    avatar: (localStorage.getItem('userNickname') || '匿').charAt(0),
    timestamp: Date.now()
  };
  
  var analyses = JSON.parse(localStorage.getItem('exam_analyses') || '[]');
  analyses.unshift(analysis);
  localStorage.setItem('exam_analyses', JSON.stringify(analyses));
  
  document.getElementById('analysis-content').value = '';
  closeModal('publish-analysis-modal');
  showConfirm('发布成功', '你的分析已发布，其他考生可以看到', 'success');
  
  renderAnalyses();
}

function renderAnalyses() {
  var analyses = JSON.parse(localStorage.getItem('exam_analyses') || '[]');
  var filtered = analyses.filter(function(a) { return a.questionId === currentQuestion; });
  
  var container = document.querySelector('#tab-analysis .analysis-section');
  if (!container) return;
  
  var typeNames = { '思路': '解题思路', '记忆': '记忆方法', '案例': '案例分析', '技巧': '答题技巧' };
  
  var html = '<button class="publish-analysis-btn" onclick="openPublishAnalysisModal()">📝 发布我的分析</button>';
  
  filtered.forEach(function(a) {
    var date = new Date(a.timestamp);
    var dateStr = date.toLocaleString('zh-CN');
    
    html += '<div class="analysis-card">' +
      '<div class="analysis-header">' +
        '<div class="analysis-avatar">' + a.avatar + '</div>' +
        '<div class="analysis-info">' +
          '<div class="analysis-name">' + a.nickname + '</div>' +
          '<div class="analysis-time">' + dateStr + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="analysis-type-tag">' + typeNames[a.type] + '</div>' +
      '<div class="analysis-content">' + a.content + '</div>' +
    '</div>';
  });
  
  var defaultCards = [
    { name: '小张同学', avatar: '张', time: '2小时前', type: '解题思路', content: '这道题的核心是考察采访计划的完整性。公共卫生事件涉及多方利益相关者，采访对象要覆盖政府、医院、专家、民众四个层面，才能保证报道的全面性和客观性。' },
    { name: '小李同学', avatar: '李', time: '5小时前', type: '记忆方法', content: '我用"人、事、时、地、物"来记忆采访提纲的基本要素：人（采访对象）、事（目的任务）、时（时间安排）、地（地点交通）、物（器材配备）。这样五个字就能记住大部分要点。' },
    { name: '小王同学', avatar: '王', time: '1天前', type: '案例分析', content: '参考2020年初新冠疫情初期的报道，当时很多媒体采用了"多路记者同步采访"的方式，分别深入医院一线、社区防控、政府发布会，这种组合式报道能形成强大的传播声势，值得借鉴。' },
    { name: '小赵同学', avatar: '赵', time: '2天前', type: '答题技巧', content: '我把这道题分成三个部分来思考：首先是前期准备（资料、设备），其次是具体采访安排（对象、时间、地点），最后是核心提纲设计。这样拆解后思路更清晰，不容易遗漏要点。' }
  ];
  
  if (filtered.length === 0) {
    defaultCards.forEach(function(c) {
      html += '<div class="analysis-card">' +
        '<div class="analysis-header">' +
          '<div class="analysis-avatar">' + c.avatar + '</div>' +
          '<div class="analysis-info">' +
            '<div class="analysis-name">' + c.name + '</div>' +
            '<div class="analysis-time">' + c.time + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="analysis-type-tag">' + c.type + '</div>' +
        '<div class="analysis-content">' + c.content + '</div>' +
      '</div>';
    });
  }
  
  container.innerHTML = html;
}

function switchCommentTab(tab) {
  var tabs = document.querySelectorAll('.tab-item');
  var panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(function(t) { t.classList.remove('active'); });
  panels.forEach(function(p) { p.classList.remove('active'); });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    tabs.forEach(function(t) {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + tab + "'")) {
        t.classList.add('active');
      }
    });
  }
  
  var tabPanel = document.getElementById('tab-' + tab);
  if (tabPanel) {
    tabPanel.classList.add('active');
  }
  
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns) {
    actionBtns.style.display = tab === 'answer' ? 'flex' : 'none';
  }
}

function initCommentPage() {
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function saveCommentAnswer(field) {
  var input = document.getElementById('ans-' + field);
  if (input) {
    var answers = JSON.parse(localStorage.getItem('comment_answers') || '{}');
    var key = 'cq' + currentQuestion + '_ans_' + field;
    answers[key] = input.value;
    localStorage.setItem('comment_answers', JSON.stringify(answers));
  }
}

function loadCommentAnswers() {
  var answers = JSON.parse(localStorage.getItem('comment_answers') || '{}');
  var fields = ['title', 'intro', 'what', 'why', 'how', 'conclusion'];
  fields.forEach(function(field) {
    var input = document.getElementById('ans-' + field);
    if (input) {
      var key = 'cq' + currentQuestion + '_ans_' + field;
      input.value = answers[key] || '';
    }
  });
}

function showCommentFullAnswer() {
  var modal = document.getElementById('full-answer-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function showMyCommentAnswers() {
  var answers = JSON.parse(localStorage.getItem('comment_answers') || '{}');
  var container = document.getElementById('my-comment-answers-content');
  
  var sectionTitles = {
    'title': '一、标题',
    'intro': '二、引论（开头）',
    'what': '三、正论——是什么',
    'why': '四、正论——为什么',
    'how': '五、正论——怎么办',
    'conclusion': '六、结论（结尾）'
  };
  
  var fields = ['title', 'intro', 'what', 'why', 'how', 'conclusion'];
  
  var html = '<div style="padding:16px 0;">';
  var hasContent = false;
  
  fields.forEach(function(field) {
    var key = 'cq' + currentQuestion + '_ans_' + field;
    var content = answers[key] || '';
    
    if (content.trim()) {
      hasContent = true;
      html += '<div style="margin-bottom:20px;">' +
        '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px;">' + sectionTitles[field] + '</div>' +
        '<div style="background:var(--paper);border-radius:8px;padding:12px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>' +
        '</div>';
    }
  });
  
  if (!hasContent) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">' +
      '<div style="font-size:48px;margin-bottom:12px;">📝</div>' +
      '<div>还没有填写答案</div>' +
      '<div style="font-size:12px;margin-top:8px;">在"考生作答"TAB中填写答案后可查看汇总</div>' +
      '</div>';
  }
  
  html += '</div>';
  container.innerHTML = html;
  
  var modal = document.getElementById('my-answers-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

var commentQuestions = [
  {
    id: 1,
    type: '短评写作',
    title: '请根据以下材料，撰写一篇300字左右的新闻短评。\n\n【材料】近期，某网红奶茶品牌被曝使用过期原材料、篡改食品保质期，引发社会广泛关注。尽管企业已公开道歉并承诺整改，但消费者信心严重受损。'
  },
  {
    id: 2,
    type: '短评写作',
    title: '请根据以下材料，撰写一篇300字左右的新闻短评。\n\n【材料】近年来，直播带货行业快速发展，但同时也出现了虚假宣传、价格欺诈、产品质量等问题。一些主播为了追求销量，不惜夸大产品功效，甚至销售假冒伪劣商品，严重损害了消费者权益。'
  },
  {
    id: 3,
    type: '短评写作',
    title: '请根据以下材料，撰写一篇300字左右的新闻短评。\n\n【材料】随着互联网的普及，网络暴力问题日益严重。一些网民在社交媒体上肆意谩骂、人肉搜索，给当事人带来了极大的精神伤害。尽管平台采取了一些措施，但网络暴力仍然屡禁不止。'
  }
];

function prevCommentQuestion() {
  if (currentQuestion > 1) {
    currentQuestion--;
    updateCommentQuestion();
  }
}

function nextCommentQuestion() {
  if (currentQuestion < totalQuestions) {
    currentQuestion++;
    updateCommentQuestion();
  }
}

function updateCommentQuestion() {
  var q = commentQuestions[currentQuestion - 1];
  
  document.getElementById('current-question').textContent = currentQuestion;
  document.querySelector('.question-type').textContent = '类型：' + q.type;
  document.querySelector('.question-title').innerHTML = q.title.replace(/\n/g, '<br>');
  
  document.getElementById('prev-btn').style.opacity = currentQuestion === 1 ? '0.5' : '1';
  document.getElementById('prev-btn').style.cursor = currentQuestion === 1 ? 'not-allowed' : 'pointer';
  document.getElementById('next-btn').style.opacity = currentQuestion === totalQuestions ? '0.5' : '1';
  document.getElementById('next-btn').style.cursor = currentQuestion === totalQuestions ? 'not-allowed' : 'pointer';
  
  loadCommentAnswers();
  
  var aiHints = document.querySelectorAll('.ai-hint');
  aiHints.forEach(function(hint) {
    hint.style.display = 'none';
  });
  
  saveHistoryProgress('comment', currentQuestion);
}

function initCommentPage() {
  var urlParams = new URLSearchParams(window.location.search);
  var qParam = urlParams.get('q');
  if (qParam && parseInt(qParam) >= 1 && parseInt(qParam) <= totalQuestions) {
    currentQuestion = parseInt(qParam);
  }
  
  updateCommentQuestion();
  
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function switchNewsTab(tab) {
  var tabs = document.querySelectorAll('.tab-item');
  var panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(function(t) { t.classList.remove('active'); });
  panels.forEach(function(p) { p.classList.remove('active'); });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    tabs.forEach(function(t) {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + tab + "'")) {
        t.classList.add('active');
      }
    });
  }
  
  var tabPanel = document.getElementById('tab-' + tab);
  if (tabPanel) {
    tabPanel.classList.add('active');
  }
  
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns) {
    actionBtns.style.display = tab === 'answer' ? 'flex' : 'none';
  }
}

function initNewsPage() {
  var urlParams = new URLSearchParams(window.location.search);
  var qParam = urlParams.get('q');
  if (qParam && parseInt(qParam) >= 1 && parseInt(qParam) <= totalQuestions) {
    currentQuestion = parseInt(qParam);
  }
  
  updateNewsQuestion();
  
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function saveNewsAnswer(field) {
  var input = document.getElementById('ans-' + field);
  if (input) {
    var answers = JSON.parse(localStorage.getItem('news_answers') || '{}');
    var key = 'nq' + currentQuestion + '_ans_' + field;
    answers[key] = input.value;
    localStorage.setItem('news_answers', JSON.stringify(answers));
  }
}

function loadNewsAnswers() {
  var answers = JSON.parse(localStorage.getItem('news_answers') || '{}');
  var fields = ['title', 'head', 'intro', 'body', 'end'];
  fields.forEach(function(field) {
    var input = document.getElementById('ans-' + field);
    if (input) {
      var key = 'nq' + currentQuestion + '_ans_' + field;
      input.value = answers[key] || '';
    }
  });
}

function showNewsFullAnswer() {
  var modal = document.getElementById('full-answer-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function showMyNewsAnswers() {
  var answers = JSON.parse(localStorage.getItem('news_answers') || '{}');
  var container = document.getElementById('my-news-answers-content');
  
  var sectionTitles = {
    'title': '一、标题',
    'head': '二、消息头',
    'intro': '三、导语',
    'body': '四、主体',
    'end': '五、结尾'
  };
  
  var fields = ['title', 'head', 'intro', 'body', 'end'];
  
  var html = '<div style="padding:16px 0;">';
  var hasContent = false;
  
  fields.forEach(function(field) {
    var key = 'nq' + currentQuestion + '_ans_' + field;
    var content = answers[key] || '';
    
    if (content.trim()) {
      hasContent = true;
      html += '<div style="margin-bottom:20px;">' +
        '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px;">' + sectionTitles[field] + '</div>' +
        '<div style="background:var(--paper);border-radius:8px;padding:12px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>' +
        '</div>';
    }
  });
  
  if (!hasContent) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">' +
      '<div style="font-size:48px;margin-bottom:12px;">📝</div>' +
      '<div>还没有填写答案</div>' +
      '<div style="font-size:12px;margin-top:8px;">在"考生作答"TAB中填写答案后可查看汇总</div>' +
      '</div>';
  }
  
  html += '</div>';
  container.innerHTML = html;
  
  var modal = document.getElementById('my-answers-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

var newsQuestions = [
  {
    id: 1,
    type: '消息改写',
    title: '请根据以下材料，改写一篇500字左右的新闻消息。\n\n【材料】近日，某市残联联合多家企业举办了一场残疾人就业招聘会。据了解，此次招聘会共有50家企业参与，提供了300多个就业岗位，涵盖了电商客服、手工制作、数据录入等多个领域。现场共有200余名残疾人求职者参与，最终有86人达成就业意向。市残联负责人表示，将持续推进残疾人就业帮扶工作，为残疾人提供更多就业机会。'
  },
  {
    id: 2,
    type: '消息改写',
    title: '请根据以下材料，改写一篇500字左右的新闻消息。\n\n【材料】今年以来，某市文旅部门积极推进文化旅游融合发展，推出了多条特色旅游线路。据统计，上半年全市共接待游客500万人次，同比增长30%；实现旅游收入45亿元，同比增长25%。其中，乡村旅游、红色旅游等特色旅游产品受到游客青睐。市文旅局局长表示，将继续丰富旅游产品供给，提升旅游服务质量。'
  },
  {
    id: 3,
    type: '消息改写',
    title: '请根据以下材料，改写一篇500字左右的新闻消息。\n\n【材料】为缓解城市交通拥堵问题，某市近日出台了新的交通管理措施。措施包括：优化信号灯配时、增加公交专用道、推广共享单车等。据交通部门统计，实施一周以来，早晚高峰时段主干道平均车速提升了15%，公交准点率提高了10%。市民普遍反映，交通状况有所改善，出行更加便捷。'
  }
];

function prevNewsQuestion() {
  if (currentQuestion > 1) {
    currentQuestion--;
    updateNewsQuestion();
  }
}

function nextNewsQuestion() {
  if (currentQuestion < totalQuestions) {
    currentQuestion++;
    updateNewsQuestion();
  }
}

function updateNewsQuestion() {
  var q = newsQuestions[currentQuestion - 1];
  
  document.getElementById('current-question').textContent = currentQuestion;
  document.querySelector('.question-type').textContent = '类型：' + q.type;
  document.querySelector('.question-title').innerHTML = q.title.replace(/\n/g, '<br>');
  
  document.getElementById('prev-btn').style.opacity = currentQuestion === 1 ? '0.5' : '1';
  document.getElementById('prev-btn').style.cursor = currentQuestion === 1 ? 'not-allowed' : 'pointer';
  document.getElementById('next-btn').style.opacity = currentQuestion === totalQuestions ? '0.5' : '1';
  document.getElementById('next-btn').style.cursor = currentQuestion === totalQuestions ? 'not-allowed' : 'pointer';
  
  loadNewsAnswers();
  
  var aiHints = document.querySelectorAll('.ai-hint');
  aiHints.forEach(function(hint) {
    hint.style.display = 'none';
  });
  
  saveHistoryProgress('news', currentQuestion);
}

document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('exam-news.html')) {
    isCommentPage = false;
  } else if (window.location.pathname.includes('exam-comment.html')) {
    isCommentPage = true;
  } else {
    isCommentPage = false;
  }
  
  renderAnalyses();
});

function switchHealthTab(tab) {
  var tabs = document.querySelectorAll('.tab-item');
  var panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(function(t) { t.classList.remove('active'); });
  panels.forEach(function(p) { p.classList.remove('active'); });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    tabs.forEach(function(t) {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + tab + "'")) {
        t.classList.add('active');
      }
    });
  }
  
  var tabPanel = document.getElementById('tab-' + tab);
  if (tabPanel) {
    tabPanel.classList.add('active');
  }
  
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns) {
    actionBtns.style.display = tab === 'answer' ? 'flex' : 'none';
  }
}

function initHealthPage() {
  var urlParams = new URLSearchParams(window.location.search);
  var qParam = urlParams.get('q');
  if (qParam && parseInt(qParam) >= 1 && parseInt(qParam) <= 4) {
    currentQuestion = parseInt(qParam);
  }
  
  updateHealthQuestion();
  
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function updateHealthQuestion() {
  var q = healthQuestions[currentQuestion - 1];
  
  document.getElementById('current-question').textContent = currentQuestion;
  document.querySelector('.question-type').textContent = '类型：' + q.type;
  document.querySelector('.question-title').textContent = q.title;
  
  document.getElementById('prev-btn').style.opacity = currentQuestion === 1 ? '0.5' : '1';
  document.getElementById('prev-btn').style.cursor = currentQuestion === 1 ? 'not-allowed' : 'pointer';
  document.getElementById('next-btn').style.opacity = currentQuestion === 4 ? '0.5' : '1';
  document.getElementById('next-btn').style.cursor = currentQuestion === 4 ? 'not-allowed' : 'pointer';
  
  renderHealthFramework();
  renderHealthAnswer();
  renderHealthAnalysis();
  
  saveHistoryProgress('health', currentQuestion);
}

function prevHealthQuestion() {
  if (currentQuestion > 1) {
    currentQuestion--;
    updateHealthQuestion();
  }
}

function nextHealthQuestion() {
  if (currentQuestion < 4) {
    currentQuestion++;
    updateHealthQuestion();
  }
}

function renderHealthFramework() {
  var q = healthQuestions[currentQuestion - 1];
  var container = document.getElementById('framework-content');
  
  var html = '';
  
  q.framework.forEach(function(section) {
    html += '<div class="framework-section">';
    html += '<div class="section-title">' + section.title + '</div>';
    
    if (section.children) {
      html += '<div class="section-content">';
      section.children.forEach(function(child) {
        if (child.children) {
          html += '<div class="subsection">';
          html += '<div class="subsection-title">' + child.title + '</div>';
          html += '<div class="subsection-content">';
          child.children.forEach(function(subchild) {
            html += '<div class="framework-item">';
            html += '<div class="item-label">' + subchild.title + '</div>';
            html += '<div class="item-placeholder">' + (subchild.placeholder || '') + '</div>';
            html += '</div>';
          });
          html += '</div>';
          html += '</div>';
        } else {
          html += '<div class="framework-item">';
          html += '<div class="item-label">' + child.title + '</div>';
          html += '<div class="item-placeholder">' + (child.placeholder || '') + '</div>';
          html += '</div>';
        }
      });
      html += '</div>';
    } else {
      html += '<div class="section-placeholder">' + (section.placeholder || '') + '</div>';
    }
    
    html += '</div>';
  });
  
  container.innerHTML = html;
}

function renderHealthAnswer() {
  var q = healthQuestions[currentQuestion - 1];
  var container = document.getElementById('answer-content');
  
  var html = '';
  
  q.framework.forEach(function(section) {
    html += '<div class="answer-section">';
    html += '<div class="answer-header">';
    html += '<div class="section-title">' + section.title + '</div>';
    html += '</div>';
    
    if (section.children) {
      section.children.forEach(function(child) {
        if (child.children) {
          html += '<div class="answer-subsection">';
          html += '<div class="subsection-title">' + child.title + '</div>';
          child.children.forEach(function(subchild) {
            html += '<textarea class="answer-textarea" id="ans-' + subchild.id + '" placeholder="' + (subchild.placeholder || '') + '" oninput="saveHealthAnswer(\'' + subchild.id + '\')"></textarea>';
          });
          html += '</div>';
        } else {
          html += '<textarea class="answer-textarea" id="ans-' + child.id + '" placeholder="' + (child.placeholder || '') + '" oninput="saveHealthAnswer(\'' + child.id + '\')"></textarea>';
        }
      });
    } else {
      html += '<textarea class="answer-textarea" id="ans-' + section.id + '" placeholder="' + (section.placeholder || '') + '" oninput="saveHealthAnswer(\'' + section.id + '\')"></textarea>';
    }
    
    html += '</div>';
  });
  
  container.innerHTML = html;
  loadHealthAnswers();
}

function saveHealthAnswer(field) {
  var input = document.getElementById('ans-' + field);
  if (input) {
    var answers = JSON.parse(localStorage.getItem('health_answers') || '{}');
    var key = 'hq' + currentQuestion + '_ans_' + field;
    answers[key] = input.value;
    localStorage.setItem('health_answers', JSON.stringify(answers));
  }
}

function loadHealthAnswers() {
  var answers = JSON.parse(localStorage.getItem('health_answers') || '{}');
  var q = healthQuestions[currentQuestion - 1];
  
  q.framework.forEach(function(section) {
    if (section.children) {
      section.children.forEach(function(child) {
        if (child.children) {
          child.children.forEach(function(subchild) {
            var key = 'hq' + currentQuestion + '_ans_' + subchild.id;
            var input = document.getElementById('ans-' + subchild.id);
            if (input && answers[key]) {
              input.value = answers[key];
            }
          });
        } else {
          var key = 'hq' + currentQuestion + '_ans_' + child.id;
          var input = document.getElementById('ans-' + child.id);
          if (input && answers[key]) {
            input.value = answers[key];
          }
        }
      });
    } else {
      var key = 'hq' + currentQuestion + '_ans_' + section.id;
      var input = document.getElementById('ans-' + section.id);
      if (input && answers[key]) {
        input.value = answers[key];
      }
    }
  });
}

function renderHealthAnalysis() {
  var q = healthQuestions[currentQuestion - 1];
  var analysisText = document.getElementById('analysis-text');
  if (analysisText) {
    analysisText.innerHTML = q.analysis[selectedAnalysisType].replace(/\n/g, '<br>');
  }
}

function selectAnalysisType(type) {
  selectedAnalysisType = type;
  
  var buttons = document.querySelectorAll('.analysis-btn');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
  });
  
  event.target.classList.add('active');
  
  if (window.location.pathname.includes('exam-health.html')) {
    renderHealthAnalysis();
  }
}

function showMyHealthAnswers() {
  var answers = JSON.parse(localStorage.getItem('health_answers') || '{}');
  var q = healthQuestions[currentQuestion - 1];
  
  var html = '<div style="padding:20px;">';
  var hasContent = false;
  
  q.framework.forEach(function(section) {
    var sectionHasContent = false;
    var sectionHtml = '<div style="margin-bottom:20px;">';
    sectionHtml += '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px;">' + section.title + '</div>';
    
    if (section.children) {
      section.children.forEach(function(child) {
        if (child.children) {
          child.children.forEach(function(subchild) {
            var key = 'hq' + currentQuestion + '_ans_' + subchild.id;
            var content = answers[key] || '';
            if (content.trim()) {
              hasContent = true;
              sectionHasContent = true;
              sectionHtml += '<div style="margin-bottom:8px;">';
              sectionHtml += '<div style="font-size:13px;color:var(--ink-soft);margin-bottom:4px;">' + subchild.title + '</div>';
              sectionHtml += '<div style="background:var(--paper);border-radius:8px;padding:10px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>';
              sectionHtml += '</div>';
            }
          });
        } else {
          var key = 'hq' + currentQuestion + '_ans_' + child.id;
          var content = answers[key] || '';
          if (content.trim()) {
            hasContent = true;
            sectionHasContent = true;
            sectionHtml += '<div style="margin-bottom:8px;">';
            sectionHtml += '<div style="font-size:13px;color:var(--ink-soft);margin-bottom:4px;">' + child.title + '</div>';
            sectionHtml += '<div style="background:var(--paper);border-radius:8px;padding:10px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>';
            sectionHtml += '</div>';
          }
        }
      });
    } else {
      var key = 'hq' + currentQuestion + '_ans_' + section.id;
      var content = answers[key] || '';
      if (content.trim()) {
        hasContent = true;
        sectionHasContent = true;
        sectionHtml += '<div style="background:var(--paper);border-radius:8px;padding:10px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>';
      }
    }
    
    sectionHtml += '</div>';
    if (sectionHasContent) {
      html += sectionHtml;
    }
  });
  
  if (!hasContent) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">';
    html += '<div style="font-size:48px;margin-bottom:12px;">📝</div>';
    html += '<div>还没有填写答案</div>';
    html += '<div style="font-size:12px;margin-top:8px;">在"考生作答"TAB中填写答案后可查看汇总</div>';
    html += '</div>';
  }
  
  html += '</div>';
  
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:var(--card);width:90%;max-height:80%;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">' +
    '<div style="padding:16px;border-bottom:1px solid var(--paper-line);display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-size:16px;font-weight:600;">我的答案汇总</div>' +
    '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;">' + html + '</div>' +
    '</div>';
  
  document.body.appendChild(modal);
}

function showFullHealthAnswer() {
  var q = healthQuestions[currentQuestion - 1];
  
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:var(--card);width:90%;max-height:80%;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">' +
    '<div style="padding:16px;border-bottom:1px solid var(--paper-line);display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-size:16px;font-weight:600;">完整答案</div>' +
    '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:20px;">' +
    '<div style="font-size:14px;line-height:1.8;color:var(--ink-soft);">' + q.fullAnswer + '</div>' +
    '</div>' +
    '</div>';
  
  document.body.appendChild(modal);
}

var marketingQuestions = [
  {
    type: '品牌整合营销策划',
    title: '请为"元气森林气泡水"设计一份完整的品牌整合营销广告全案',
    framework: [
      { id: 'preface', title: '一、策划前言', placeholder: '概述行业竞争格局、品牌现存短板，点明方案依托STP、4C、IMC整合营销三大核心理论' },
      { id: 'market', title: '二、市场环境分析', children: [
        { id: 'pest', title: '1. PEST宏观分析：', placeholder: '政治、经济、社会、技术四维度逐条简述' },
        { id: 'swot', title: '2. SWOT品牌分析：', placeholder: '品牌优势、劣势、市场机会、外部威胁' }
      ]},
      { id: 'stp', title: '三、STP战略定位', children: [
        { id: 'segment', title: '1. 市场细分：', placeholder: '按照年龄、消费能力、使用场景划分多类人群' },
        { id: 'target', title: '2. 目标市场：', placeholder: '锁定品牌核心目标消费群体画像' },
        { id: 'position', title: '3. 市场定位：', placeholder: '提炼差异化心智占位（国货/功能/情感定位）' }
      ]},
      { id: 'audience', title: '四、分层目标受众', children: [
        { id: 'core_audience', title: '1. 核心受众：', placeholder: '产品直接日常消费人群' },
        { id: 'secondary_audience', title: '2. 次要潜在受众：', placeholder: '拓展消费群体' },
        { id: 'influencer_audience', title: '3. 决策影响人群：', placeholder: '采购、推荐人群' }
      ]},
      { id: 'theme', title: '五、广告核心主题+3条Slogan', children: [
        { id: 'main_theme', title: '主传播主题：', placeholder: '' },
        { id: 'slogan1', title: 'Slogan1（功能向）：', placeholder: '' },
        { id: 'slogan2', title: 'Slogan2（情感向）：', placeholder: '' },
        { id: 'slogan3', title: 'Slogan3（品牌价值向）：', placeholder: '' }
      ]},
      { id: 'appeal', title: '六、诉求策略', placeholder: '理性诉求（数据、检测、产品实测）+ 感性诉求（生活场景、情怀共鸣）结合' },
      { id: 'strategy', title: '七、三阶段全域整合传播', children: [
        { id: 'warmup', title: '1. 预热期：', placeholder: '线上科普图文、小型线下试饮铺垫认知' },
        { id: 'burst', title: '2. 爆发期：', placeholder: '短视频信息流、KOL联动、线下大屏、门店物料全覆盖' },
        { id: 'sustain', title: '3. 续热期：', placeholder: '社群长效运营、联名活动持续曝光' }
      ]},
      { id: 'creative', title: '八、核心创意物料', placeholder: '30秒短视频广告分镜脚本（水源/产品/人群三段镜头+结尾标语）' },
      { id: 'budget', title: '九、广告预算分配', placeholder: '媒介投放、KOL合作、创意物料制作、线下活动物料（标注占比）' },
      { id: 'evaluation', title: '十、三层传播效果评估', children: [
        { id: 'process_eval', title: '1. 过程评估：', placeholder: '短视频播放、话题曝光、线下活动参与数据' },
        { id: 'conversion_eval', title: '2. 转化评估：', placeholder: '线上线下产品销量、新增用户数' },
        { id: 'brand_eval', title: '3. 长期品牌评估：', placeholder: 'TOMA无提示提及率、受众品牌好感度' }
      ]}
    ],
    analysis: {
      '思路': '本题需围绕元气森林气泡水品牌，运用STP、4C、IMC三大核心理论，从市场分析到效果评估进行系统性策划。重点关注年轻消费群体的需求和偏好，设计有吸引力的传播策略。',
      '采分点': '1. PEST+SWOT分析（10分）\n2. STP战略定位（10分）\n3. 受众分层（5分）\n4. 主题+Slogan（10分）\n5. 三阶段传播策略（15分）\n6. 效果评估体系（10分）',
      '常见问题': '1. 理论应用生硬，未结合实际品牌\n2. 预算分配不合理，缺乏依据\n3. 传播渠道单一，未形成整合\n4. 效果评估缺乏量化指标'
    },
    fullAnswer: '<b>《元气森林气泡水品牌整合营销广告全案》</b><br><br><b>一、策划前言：</b>随着健康饮品市场竞争加剧，元气森林需强化"无糖健康"品牌认知，依托STP、4C、IMC理论，打造差异化竞争优势。<br><br><b>二、市场环境分析：</b><br>1. PEST宏观分析：政策支持健康消费、经济水平提升、健康意识觉醒、电商渠道发展<br>2. SWOT分析：优势-无糖概念领先；劣势-品牌认知局限；机会-健康饮品风口；威胁-竞品模仿<br><br><b>三、STP战略定位：</b><br>1. 市场细分：Z世代、健身人群、白领阶层<br>2. 目标市场：18-30岁年轻消费群体<br>3. 市场定位："无糖健康生活方式引领者"<br><br><b>四、分层目标受众：</b><br>1. 核心受众：18-25岁大学生和职场新人<br>2. 次要潜在受众：25-35岁健身爱好者<br>3. 决策影响人群：家庭采购者、社交意见领袖<br><br><b>五、广告核心主题+3条Slogan：</b><br>主传播主题："元气满满，无糖生活"<br>Slogan1："0糖0卡，畅饮无负担"<br>Slogan2："元气森林，让生活有滋有味"<br>Slogan3："中国元气，健康未来"<br><br><b>六、诉求策略：</b>理性诉求（0糖0卡数据、成分检测报告）+ 感性诉求（活力生活场景、年轻态度表达）<br><br><b>七、三阶段全域整合传播：</b><br>1. 预热期：小红书科普、校园试饮活动<br>2. 爆发期：抖音短视频、KOL联动、线下大屏广告<br>3. 续热期：社群运营、品牌联名活动<br><br><b>八、核心创意物料：</b>镜头1：清新水源（品质背书）；镜头2：年轻人畅饮场景（情感共鸣）；镜头3：产品特写（功能展示）；结尾：元气森林，元气满满<br><br><b>九、广告预算分配：</b>媒介投放40%、KOL合作30%、创意制作20%、线下活动10%<br><br><b>十、三层传播效果评估：</b><br>1. 过程评估：短视频播放量、话题曝光量、活动参与人数<br>2. 转化评估：线上线下销量、新增用户数<br>3. 长期品牌评估：TOMA无提示提及率、品牌好感度'
  },
  {
    type: '品牌整合营销策划',
    title: '请为"华为Mate系列手机"设计一份完整的品牌整合营销广告全案',
    framework: [
      { id: 'preface', title: '一、策划前言', placeholder: '概述行业竞争格局、品牌现存短板，点明方案依托STP、4C、IMC整合营销三大核心理论' },
      { id: 'market', title: '二、市场环境分析', children: [
        { id: 'pest', title: '1. PEST宏观分析：', placeholder: '政治、经济、社会、技术四维度逐条简述' },
        { id: 'swot', title: '2. SWOT品牌分析：', placeholder: '品牌优势、劣势、市场机会、外部威胁' }
      ]},
      { id: 'stp', title: '三、STP战略定位', children: [
        { id: 'segment', title: '1. 市场细分：', placeholder: '按照年龄、消费能力、使用场景划分多类人群' },
        { id: 'target', title: '2. 目标市场：', placeholder: '锁定品牌核心目标消费群体画像' },
        { id: 'position', title: '3. 市场定位：', placeholder: '提炼差异化心智占位（国货/功能/情感定位）' }
      ]},
      { id: 'audience', title: '四、分层目标受众', children: [
        { id: 'core_audience', title: '1. 核心受众：', placeholder: '产品直接日常消费人群' },
        { id: 'secondary_audience', title: '2. 次要潜在受众：', placeholder: '拓展消费群体' },
        { id: 'influencer_audience', title: '3. 决策影响人群：', placeholder: '采购、推荐人群' }
      ]},
      { id: 'theme', title: '五、广告核心主题+3条Slogan', children: [
        { id: 'main_theme', title: '主传播主题：', placeholder: '' },
        { id: 'slogan1', title: 'Slogan1（功能向）：', placeholder: '' },
        { id: 'slogan2', title: 'Slogan2（情感向）：', placeholder: '' },
        { id: 'slogan3', title: 'Slogan3（品牌价值向）：', placeholder: '' }
      ]},
      { id: 'appeal', title: '六、诉求策略', placeholder: '理性诉求（数据、检测、产品实测）+ 感性诉求（生活场景、情怀共鸣）结合' },
      { id: 'strategy', title: '七、三阶段全域整合传播', children: [
        { id: 'warmup', title: '1. 预热期：', placeholder: '线上科普图文、小型线下体验铺垫认知' },
        { id: 'burst', title: '2. 爆发期：', placeholder: '新品发布会、KOL联动、线下门店物料全覆盖' },
        { id: 'sustain', title: '3. 续热期：', placeholder: '用户故事传播、品牌活动持续曝光' }
      ]},
      { id: 'creative', title: '八、核心创意物料', placeholder: '30秒短视频广告分镜脚本（技术/产品/人群三段镜头+结尾标语）' },
      { id: 'budget', title: '九、广告预算分配', placeholder: '媒介投放、KOL合作、创意物料制作、线下活动物料（标注占比）' },
      { id: 'evaluation', title: '十、三层传播效果评估', children: [
        { id: 'process_eval', title: '1. 过程评估：', placeholder: '短视频播放、话题曝光、线下活动参与数据' },
        { id: 'conversion_eval', title: '2. 转化评估：', placeholder: '线上线下产品销量、新增用户数' },
        { id: 'brand_eval', title: '3. 长期品牌评估：', placeholder: 'TOMA无提示提及率、受众品牌好感度' }
      ]}
    ],
    analysis: {
      '思路': '本题需围绕华为Mate系列手机，运用STP、4C、IMC理论进行系统性策划。重点突出华为的技术创新和高端定位，打造品牌差异化优势。',
      '采分点': '1. PEST+SWOT分析（10分）\n2. STP战略定位（10分）\n3. 受众分层（5分）\n4. 主题+Slogan（10分）\n5. 三阶段传播策略（15分）\n6. 效果评估体系（10分）',
      '常见问题': '1. 未突出技术创新优势\n2. 目标受众定位模糊\n3. 传播渠道与品牌调性不符\n4. 预算分配不合理'
    },
    fullAnswer: '<b>《华为Mate系列手机品牌整合营销广告全案》</b><br><br><b>一、策划前言：</b>在高端手机市场竞争白热化背景下，华为Mate系列需强化"科技创新+民族品牌"双重价值，依托三大理论打造差异化竞争优势。<br><br><b>二、市场环境分析：</b><br>1. PEST宏观分析：科技创新政策支持、消费升级趋势、民族品牌认同感提升、5G技术普及<br>2. SWOT分析：优势-技术领先、品牌溢价；劣势-芯片供应挑战；机会-国产替代需求；威胁-国际品牌竞争<br><br><b>三、STP战略定位：</b><br>1. 市场细分：商务精英、科技爱好者、高端消费者<br>2. 目标市场：25-45岁中高收入群体<br>3. 市场定位："全球领先的智能终端领导者"<br><br><b>四、分层目标受众：</b><br>1. 核心受众：商务人士和科技发烧友<br>2. 次要潜在受众：追求品质生活的中产家庭<br>3. 决策影响人群：行业意见领袖、科技媒体<br><br><b>五、广告核心主题+3条Slogan：</b><br>主传播主题："创新不止，引领未来"<br>Slogan1："超感知影像，记录每一刻精彩"<br>Slogan2："华为Mate，见证你的高光时刻"<br>Slogan3："中国创造，世界品质"<br><br><b>六、诉求策略：</b>理性诉求（麒麟芯片、徕卡镜头、续航数据）+ 感性诉求（商务场景、家国情怀、创新精神）<br><br><b>七、三阶段全域整合传播：</b><br>1. 预热期：科技媒体爆料、线下体验店预热<br>2. 爆发期：新品发布会直播、明星代言、机场大屏广告<br>3. 续热期：用户故事征集、国潮联名活动<br><br><b>八、核心创意物料：</b>镜头1：芯片研发场景（技术背书）；镜头2：商务人士使用场景（情感共鸣）；镜头3：影像能力展示（功能亮点）；结尾：华为Mate，引领未来<br><br><b>九、广告预算分配：</b>媒介投放35%、KOL合作25%、发布会20%、线下活动20%<br><br><b>十、三层传播效果评估：</b><br>1. 过程评估：发布会观看量、话题曝光量、体验店客流<br>2. 转化评估：首销销量、线上预订量<br>3. 长期品牌评估：TOMA无提示提及率、品牌忠诚度'
  },
  {
    type: '品牌整合营销策划',
    title: '请为"农夫山泉矿泉水"设计一份完整的品牌整合营销广告全案',
    framework: [
      { id: 'preface', title: '一、策划前言', placeholder: '概述行业竞争格局、品牌现存短板，点明方案依托STP、4C、IMC整合营销三大核心理论' },
      { id: 'market', title: '二、市场环境分析', children: [
        { id: 'pest', title: '1. PEST宏观分析：', placeholder: '政治、经济、社会、技术四维度逐条简述' },
        { id: 'swot', title: '2. SWOT品牌分析：', placeholder: '品牌优势、劣势、市场机会、外部威胁' }
      ]},
      { id: 'stp', title: '三、STP战略定位', children: [
        { id: 'segment', title: '1. 市场细分：', placeholder: '按照年龄、消费能力、使用场景划分多类人群' },
        { id: 'target', title: '2. 目标市场：', placeholder: '锁定品牌核心目标消费群体画像' },
        { id: 'position', title: '3. 市场定位：', placeholder: '提炼差异化心智占位（国货/功能/情感定位）' }
      ]},
      { id: 'audience', title: '四、分层目标受众', children: [
        { id: 'core_audience', title: '1. 核心受众：', placeholder: '产品直接日常消费人群' },
        { id: 'secondary_audience', title: '2. 次要潜在受众：', placeholder: '拓展消费群体' },
        { id: 'influencer_audience', title: '3. 决策影响人群：', placeholder: '采购、推荐人群' }
      ]},
      { id: 'theme', title: '五、广告核心主题+3条Slogan', children: [
        { id: 'main_theme', title: '主传播主题：', placeholder: '' },
        { id: 'slogan1', title: 'Slogan1（功能向）：', placeholder: '' },
        { id: 'slogan2', title: 'Slogan2（情感向）：', placeholder: '' },
        { id: 'slogan3', title: 'Slogan3（品牌价值向）：', placeholder: '' }
      ]},
      { id: 'appeal', title: '六、诉求策略', placeholder: '理性诉求（数据、检测、产品实测）+ 感性诉求（生活场景、情怀共鸣）结合' },
      { id: 'strategy', title: '七、三阶段全域整合传播', children: [
        { id: 'warmup', title: '1. 预热期：', placeholder: '水源地探秘内容、科普图文铺垫' },
        { id: 'burst', title: '2. 爆发期：', placeholder: '短视频信息流、KOL联动、线下渠道全覆盖' },
        { id: 'sustain', title: '3. 续热期：', placeholder: '环保公益活动、品牌IP持续运营' }
      ]},
      { id: 'creative', title: '八、核心创意物料', placeholder: '30秒短视频广告分镜脚本（水源/产品/人群三段镜头+结尾标语）' },
      { id: 'budget', title: '九、广告预算分配', placeholder: '媒介投放、KOL合作、创意物料制作、线下活动物料（标注占比）' },
      { id: 'evaluation', title: '十、三层传播效果评估', children: [
        { id: 'process_eval', title: '1. 过程评估：', placeholder: '短视频播放、话题曝光、线下活动参与数据' },
        { id: 'conversion_eval', title: '2. 转化评估：', placeholder: '线上线下产品销量、新增用户数' },
        { id: 'brand_eval', title: '3. 长期品牌评估：', placeholder: 'TOMA无提示提及率、受众品牌好感度' }
      ]}
    ],
    analysis: {
      '思路': '本题需围绕农夫山泉矿泉水，运用STP、4C、IMC理论进行系统性策划。重点突出天然水源地概念和健康饮水理念，强化品牌辨识度。',
      '采分点': '1. PEST+SWOT分析（10分）\n2. STP战略定位（10分）\n3. 受众分层（5分）\n4. 主题+Slogan（10分）\n5. 三阶段传播策略（15分）\n6. 效果评估体系（10分）',
      '常见问题': '1. 未突出天然水源地核心卖点\n2. 传播缺乏情感共鸣\n3. 渠道覆盖不足\n4. 未结合环保公益提升品牌价值'
    },
    fullAnswer: '<b>《农夫山泉矿泉水品牌整合营销广告全案》</b><br><br><b>一、策划前言：</b>在瓶装水市场同质化竞争背景下，农夫山泉需强化"天然水源"核心卖点，依托三大理论打造差异化品牌认知。<br><br><b>二、市场环境分析：</b><br>1. PEST宏观分析：健康消费趋势、环保意识提升、渠道多元化、电商发展<br>2. SWOT分析：优势-水源地资源、品牌知名度；劣势-价格偏高；机会-健康饮水需求；威胁-竞品低价竞争<br><br><b>三、STP战略定位：</b><br>1. 市场细分：健康意识人群、品质生活追求者、户外运动爱好者<br>2. 目标市场：全年龄段健康消费人群<br>3. 市场定位："天然健康饮水倡导者"<br><br><b>四、分层目标受众：</b><br>1. 核心受众：25-45岁城市白领和家庭消费者<br>2. 次要潜在受众：学生群体和户外运动爱好者<br>3. 决策影响人群：学校采购、企业采购、健康专家<br><br><b>五、广告核心主题+3条Slogan：</b><br>主传播主题："大自然的搬运工"<br>Slogan1："天然水源，健康之选"<br>Slogan2："农夫山泉，有点甜"<br>Slogan3："源自自然，惠及健康"<br><br><b>六、诉求策略：</b>理性诉求（水源地检测报告、矿物质含量数据）+ 感性诉求（自然场景、健康生活方式）<br><br><b>七、三阶段全域整合传播：</b><br>1. 预热期：水源地探秘纪录片、科普短视频<br>2. 爆发期：抖音信息流、明星代言、便利店陈列<br>3. 续热期：环保公益活动、水源地保护项目<br><br><b>八、核心创意物料：</b>镜头1：长白山天然水源（品质背书）；镜头2：家庭饮用场景（情感共鸣）；镜头3：产品特写（功能展示）；结尾：农夫山泉，大自然的搬运工<br><br><b>九、广告预算分配：</b>媒介投放40%、KOL合作25%、创意制作20%、公益活动15%<br><br><b>十、三层传播效果评估：</b><br>1. 过程评估：短视频播放量、话题曝光量、活动参与人数<br>2. 转化评估：终端销量、电商销售额<br>3. 长期品牌评估：TOMA无提示提及率、品牌偏好度'
  }
];

var copywritingQuestions = [
  {
    type: '广告文案写作',
    title: '请为"瑞幸咖啡生椰拿铁"撰写一则系列广告文案',
    framework: [
      { id: 'title', title: '一、标题', placeholder: '直击受众核心利益点，简洁抓眼球' },
      { id: 'body', title: '二、正文', placeholder: '二选一写作思路：①理性路线：产品参数、实测数据、竞品对比；②感性路线：生活化场景、情感共鸣叙事' },
      { id: 'slogan', title: '三、Slogan', placeholder: '提炼产品差异化卖点，简短易传播' },
      { id: 'postscript', title: '四、随文', placeholder: '标注品牌名称、购买渠道、限时活动信息' }
    ],
    analysis: {
      '思路': '本题需围绕瑞幸生椰拿铁的核心卖点（生椰+拿铁的创新组合），从标题、正文、Slogan、随文四个维度撰写广告文案。可选择理性路线突出产品品质，或感性路线营造消费场景。',
      '采分点': '1. 标题吸引力（5分）\n2. 正文逻辑性/感染力（10分）\n3. Slogan记忆点（5分）\n4. 随文完整性（5分）',
      '常见问题': '1. 标题过于平淡，缺乏吸引力\n2. 正文逻辑混乱，卖点不突出\n3. Slogan冗长，不易传播\n4. 随文信息不全，缺乏购买引导'
    },
    fullAnswer: '<b>一、标题：</b>生椰拿铁，一口入魂的海南风情<br><br><b>二、正文：</b>（感性路线）清晨的阳光洒在办公桌上，一杯生椰拿铁唤醒沉睡的味蕾。精选海南新鲜椰子，搭配阿拉比卡咖啡豆，每一口都是热带海岛的清甜与咖啡的醇厚完美融合。在繁忙的都市生活中，给自己一杯生椰拿铁的时间，让身心沉浸在椰林海风的惬意里。无论是晨间唤醒、午后提神还是深夜加班，生椰拿铁都是你最好的陪伴。<br><br><b>三、Slogan：</b>生椰拿铁，瑞幸懂你的味蕾<br><br><b>四、随文：</b>瑞幸咖啡 | 全国门店有售 | 小程序下单立减5元'
  },
  {
    type: '短视频创意简述',
    title: '请为"Nike运动鞋"撰写一则30秒短视频创意方案',
    framework: [
      { id: 'title', title: '一、标题', placeholder: '直击受众核心利益点，简洁抓眼球' },
      { id: 'body', title: '二、正文', placeholder: '二选一写作思路：①理性路线：产品参数、实测数据、竞品对比；②感性路线：生活化场景、情感共鸣叙事' },
      { id: 'slogan', title: '三、Slogan', placeholder: '提炼产品差异化卖点，简短易传播' },
      { id: 'postscript', title: '四、随文', placeholder: '标注品牌名称、购买渠道、限时活动信息' }
    ],
    analysis: {
      '思路': '本题需围绕Nike运动鞋的核心卖点（科技、运动精神、时尚潮流），设计30秒短视频创意方案。需包含镜头脚本、场景设计、情感表达等要素。',
      '采分点': '1. 创意新颖度（10分）\n2. 镜头设计合理性（10分）\n3. Slogan品牌契合度（5分）\n4. 随文购买引导（5分）',
      '常见问题': '1. 创意老套，缺乏新意\n2. 镜头设计混乱，节奏失控\n3. 未突出品牌精神\n4. 缺乏行动号召'
    },
    fullAnswer: '<b>一、标题：</b>Just Do It | 不止于运动<br><br><b>二、正文：</b>（感性路线）镜头1（0-5s）：城市街头，晨光微熹，跑者踏上征程。镜头2（5-15s）：健身房内，汗水挥洒，肌肉线条在运动中绽放。镜头3（15-25s）：篮球场、足球场、滑板场，不同场景切换，展现运动多样性。镜头4（25-30s）：特写Nike运动鞋，跑者冲向终点，阳光洒满全身。旁白：每一次奔跑，都是对自我的超越；每一次跳跃，都是对极限的挑战。Nike，陪你征服每一个不可能。<br><br><b>三、Slogan：</b>Just Do It | 运动无极限<br><br><b>四、随文：</b>Nike官方旗舰店 | 新品首发8折 | 限时特惠'
  },
  {
    type: '海报构思',
    title: '请为"故宫文创系列产品"设计一则海报文案',
    framework: [
      { id: 'title', title: '一、标题', placeholder: '直击受众核心利益点，简洁抓眼球' },
      { id: 'body', title: '二、正文', placeholder: '二选一写作思路：①理性路线：产品参数、实测数据、竞品对比；②感性路线：生活化场景、情感共鸣叙事' },
      { id: 'slogan', title: '三、Slogan', placeholder: '提炼产品差异化卖点，简短易传播' },
      { id: 'postscript', title: '四、随文', placeholder: '标注品牌名称、购买渠道、限时活动信息' }
    ],
    analysis: {
      '思路': '本题需围绕故宫文创系列产品的核心卖点（传统文化、匠心工艺、国潮美学），设计海报文案。需突出历史文化底蕴与现代设计的融合。',
      '采分点': '1. 标题文化内涵（10分）\n2. 正文文化表达（10分）\n3. Slogan品牌调性（5分）\n4. 随文信息完整（5分）',
      '常见问题': '1. 文化元素堆砌，缺乏创意\n2. 文案与产品脱节\n3. 未体现国潮美学\n4. 缺乏购买引导'
    },
    fullAnswer: '<b>一、标题：</b>千年故宫，潮起东方<br><br><b>二、正文：</b>（感性路线）红墙黄瓦，承载六百年皇家气度；匠心传承，演绎新时代国潮风尚。故宫文创系列，将紫禁城的历史底蕴与现代设计完美融合。每一件产品都凝聚着匠人之心，每一个细节都诉说着东方美学。从珐琅彩首饰到宫廷纹样文具，从古典纹样服饰到皇家御膳茶具，让传统文化走进现代生活，让东方美学闪耀世界舞台。<br><br><b>三、Slogan：</b>故宫文创，让传统潮起来<br><br><b>四、随文：</b>故宫文创旗舰店 | 新品上市 | 满200减50'
  }
];

function switchMarketingTab(tab) {
  var tabs = document.querySelectorAll('.tab-item');
  var panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(function(t) { t.classList.remove('active'); });
  panels.forEach(function(p) { p.classList.remove('active'); });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    tabs.forEach(function(t) {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + tab + "'")) {
        t.classList.add('active');
      }
    });
  }
  
  var tabPanel = document.getElementById('tab-' + tab);
  if (tabPanel) {
    tabPanel.classList.add('active');
  }
  
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns) {
    actionBtns.style.display = tab === 'answer' ? 'flex' : 'none';
  }
}

function initMarketingPage() {
  var urlParams = new URLSearchParams(window.location.search);
  var qParam = urlParams.get('q');
  if (qParam && parseInt(qParam) >= 1 && parseInt(qParam) <= 3) {
    currentQuestion = parseInt(qParam);
  }
  
  updateMarketingQuestion();
  
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function updateMarketingQuestion() {
  var q = marketingQuestions[currentQuestion - 1];
  
  document.getElementById('current-question').textContent = currentQuestion;
  document.querySelector('.question-type').textContent = '类型：' + q.type;
  document.querySelector('.question-title').textContent = q.title;
  
  document.getElementById('prev-btn').style.opacity = currentQuestion === 1 ? '0.5' : '1';
  document.getElementById('prev-btn').style.cursor = currentQuestion === 1 ? 'not-allowed' : 'pointer';
  document.getElementById('next-btn').style.opacity = currentQuestion === 3 ? '0.5' : '1';
  document.getElementById('next-btn').style.cursor = currentQuestion === 3 ? 'not-allowed' : 'pointer';
  
  renderMarketingFramework();
  renderMarketingAnswer();
  renderMarketingAnalysis();
  
  saveHistoryProgress('marketing', currentQuestion);
}

function prevMarketingQuestion() {
  if (currentQuestion > 1) {
    currentQuestion--;
    updateMarketingQuestion();
  }
}

function nextMarketingQuestion() {
  if (currentQuestion < 3) {
    currentQuestion++;
    updateMarketingQuestion();
  }
}

function renderMarketingFramework() {
  var q = marketingQuestions[currentQuestion - 1];
  var container = document.getElementById('framework-content');
  
  var html = '';
  
  q.framework.forEach(function(section) {
    html += '<div class="framework-section">';
    html += '<div class="section-title">' + section.title + '</div>';
    
    if (section.children) {
      html += '<div class="section-content">';
      section.children.forEach(function(child) {
        html += '<div class="framework-item">';
        html += '<div class="item-label">' + child.title + '</div>';
        html += '<div class="item-placeholder">' + (child.placeholder || '') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="section-placeholder">' + (section.placeholder || '') + '</div>';
    }
    
    html += '</div>';
  });
  
  container.innerHTML = html;
}

function renderMarketingAnswer() {
  var q = marketingQuestions[currentQuestion - 1];
  var container = document.getElementById('answer-content');
  
  var html = '';
  
  q.framework.forEach(function(section) {
    html += '<div class="answer-section">';
    html += '<div class="answer-header">';
    html += '<div class="section-title">' + section.title + '</div>';
    html += '</div>';
    
    if (section.children) {
      section.children.forEach(function(child) {
        html += '<textarea class="answer-textarea" id="ans-' + child.id + '" placeholder="' + (child.placeholder || '') + '" oninput="saveMarketingAnswer(\'' + child.id + '\')"></textarea>';
      });
    } else {
      html += '<textarea class="answer-textarea" id="ans-' + section.id + '" placeholder="' + (section.placeholder || '') + '" oninput="saveMarketingAnswer(\'' + section.id + '\')"></textarea>';
    }
    
    html += '</div>';
  });
  
  container.innerHTML = html;
  loadMarketingAnswers();
}

function saveMarketingAnswer(field) {
  var input = document.getElementById('ans-' + field);
  if (input) {
    var answers = JSON.parse(localStorage.getItem('marketing_answers') || '{}');
    var key = 'mq' + currentQuestion + '_ans_' + field;
    answers[key] = input.value;
    localStorage.setItem('marketing_answers', JSON.stringify(answers));
  }
}

function loadMarketingAnswers() {
  var answers = JSON.parse(localStorage.getItem('marketing_answers') || '{}');
  var q = marketingQuestions[currentQuestion - 1];
  
  q.framework.forEach(function(section) {
    if (section.children) {
      section.children.forEach(function(child) {
        var key = 'mq' + currentQuestion + '_ans_' + child.id;
        var input = document.getElementById('ans-' + child.id);
        if (input && answers[key]) {
          input.value = answers[key];
        }
      });
    } else {
      var key = 'mq' + currentQuestion + '_ans_' + section.id;
      var input = document.getElementById('ans-' + section.id);
      if (input && answers[key]) {
        input.value = answers[key];
      }
    }
  });
}

function renderMarketingAnalysis() {
  var q = marketingQuestions[currentQuestion - 1];
  var analysisText = document.getElementById('analysis-text');
  if (analysisText) {
    analysisText.innerHTML = q.analysis[selectedAnalysisType].replace(/\n/g, '<br>');
  }
}

function selectMarketingAnalysisType(type) {
  selectedAnalysisType = type;
  
  var buttons = document.querySelectorAll('.analysis-btn');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
  });
  
  event.target.classList.add('active');
  
  renderMarketingAnalysis();
}

function showMyMarketingAnswers() {
  var answers = JSON.parse(localStorage.getItem('marketing_answers') || '{}');
  var q = marketingQuestions[currentQuestion - 1];
  
  var html = '<div style="padding:20px;">';
  var hasContent = false;
  
  q.framework.forEach(function(section) {
    var sectionHasContent = false;
    var sectionHtml = '<div style="margin-bottom:20px;">';
    sectionHtml += '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px;">' + section.title + '</div>';
    
    if (section.children) {
      section.children.forEach(function(child) {
        var key = 'mq' + currentQuestion + '_ans_' + child.id;
        var content = answers[key] || '';
        if (content.trim()) {
          hasContent = true;
          sectionHasContent = true;
          sectionHtml += '<div style="margin-bottom:8px;">';
          sectionHtml += '<div style="font-size:13px;color:var(--ink-soft);margin-bottom:4px;">' + child.title + '</div>';
          sectionHtml += '<div style="background:var(--paper);border-radius:8px;padding:10px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>';
          sectionHtml += '</div>';
        }
      });
    } else {
      var key = 'mq' + currentQuestion + '_ans_' + section.id;
      var content = answers[key] || '';
      if (content.trim()) {
        hasContent = true;
        sectionHasContent = true;
        sectionHtml += '<div style="background:var(--paper);border-radius:8px;padding:10px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>';
      }
    }
    
    sectionHtml += '</div>';
    if (sectionHasContent) {
      html += sectionHtml;
    }
  });
  
  if (!hasContent) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">';
    html += '<div style="font-size:48px;margin-bottom:12px;">📝</div>';
    html += '<div>还没有填写答案</div>';
    html += '<div style="font-size:12px;margin-top:8px;">在"考生作答"TAB中填写答案后可查看汇总</div>';
    html += '</div>';
  }
  
  html += '</div>';
  
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:var(--card);width:90%;max-height:80%;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">' +
    '<div style="padding:16px;border-bottom:1px solid var(--paper-line);display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-size:16px;font-weight:600;">我的答案汇总</div>' +
    '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;">' + html + '</div>' +
    '</div>';
  
  document.body.appendChild(modal);
}

function showFullMarketingAnswer() {
  var q = marketingQuestions[currentQuestion - 1];
  
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:var(--card);width:90%;max-height:80%;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">' +
    '<div style="padding:16px;border-bottom:1px solid var(--paper-line);display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-size:16px;font-weight:600;">完整答案</div>' +
    '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:20px;">' +
    '<div style="font-size:14px;line-height:1.8;color:var(--ink-soft);">' + q.fullAnswer + '</div>' +
    '</div>' +
    '</div>';
  
  document.body.appendChild(modal);
}

function switchCopywritingTab(tab) {
  var tabs = document.querySelectorAll('.tab-item');
  var panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(function(t) { t.classList.remove('active'); });
  panels.forEach(function(p) { p.classList.remove('active'); });
  
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    tabs.forEach(function(t) {
      if (t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + tab + "'")) {
        t.classList.add('active');
      }
    });
  }
  
  var tabPanel = document.getElementById('tab-' + tab);
  if (tabPanel) {
    tabPanel.classList.add('active');
  }
  
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns) {
    actionBtns.style.display = tab === 'answer' ? 'flex' : 'none';
  }
}

function initCopywritingPage() {
  var urlParams = new URLSearchParams(window.location.search);
  var qParam = urlParams.get('q');
  if (qParam && parseInt(qParam) >= 1 && parseInt(qParam) <= 3) {
    currentQuestion = parseInt(qParam);
  }
  
  updateCopywritingQuestion();
  
  var activeTab = document.querySelector('.tab-item.active');
  var actionBtns = document.getElementById('action-btns');
  if (actionBtns && activeTab) {
    var onclickAttr = activeTab.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes("'answer'")) {
      actionBtns.style.display = 'flex';
    } else {
      actionBtns.style.display = 'none';
    }
  }
}

function updateCopywritingQuestion() {
  var q = copywritingQuestions[currentQuestion - 1];
  
  document.getElementById('current-question').textContent = currentQuestion;
  document.querySelector('.question-type').textContent = '类型：' + q.type;
  document.querySelector('.question-title').textContent = q.title;
  
  document.getElementById('prev-btn').style.opacity = currentQuestion === 1 ? '0.5' : '1';
  document.getElementById('prev-btn').style.cursor = currentQuestion === 1 ? 'not-allowed' : 'pointer';
  document.getElementById('next-btn').style.opacity = currentQuestion === 3 ? '0.5' : '1';
  document.getElementById('next-btn').style.cursor = currentQuestion === 3 ? 'not-allowed' : 'pointer';
  
  renderCopywritingFramework();
  renderCopywritingAnswer();
  renderCopywritingAnalysis();
  
  saveHistoryProgress('copywriting', currentQuestion);
}

function prevCopywritingQuestion() {
  if (currentQuestion > 1) {
    currentQuestion--;
    updateCopywritingQuestion();
  }
}

function nextCopywritingQuestion() {
  if (currentQuestion < 3) {
    currentQuestion++;
    updateCopywritingQuestion();
  }
}

function renderCopywritingFramework() {
  var q = copywritingQuestions[currentQuestion - 1];
  var container = document.getElementById('framework-content');
  
  var html = '';
  
  q.framework.forEach(function(section) {
    html += '<div class="framework-section">';
    html += '<div class="section-title">' + section.title + '</div>';
    html += '<div class="section-placeholder">' + (section.placeholder || '') + '</div>';
    html += '</div>';
  });
  
  container.innerHTML = html;
}

function renderCopywritingAnswer() {
  var q = copywritingQuestions[currentQuestion - 1];
  var container = document.getElementById('answer-content');
  
  var html = '';
  
  q.framework.forEach(function(section) {
    html += '<div class="answer-section">';
    html += '<div class="answer-header">';
    html += '<div class="section-title">' + section.title + '</div>';
    html += '</div>';
    html += '<textarea class="answer-textarea" id="ans-' + section.id + '" placeholder="' + (section.placeholder || '') + '" oninput="saveCopywritingAnswer(\'' + section.id + '\')"></textarea>';
    html += '</div>';
  });
  
  container.innerHTML = html;
  loadCopywritingAnswers();
}

function saveCopywritingAnswer(field) {
  var input = document.getElementById('ans-' + field);
  if (input) {
    var answers = JSON.parse(localStorage.getItem('copywriting_answers') || '{}');
    var key = 'cq' + currentQuestion + '_ans_' + field;
    answers[key] = input.value;
    localStorage.setItem('copywriting_answers', JSON.stringify(answers));
  }
}

function loadCopywritingAnswers() {
  var answers = JSON.parse(localStorage.getItem('copywriting_answers') || '{}');
  var q = copywritingQuestions[currentQuestion - 1];
  
  q.framework.forEach(function(section) {
    var key = 'cq' + currentQuestion + '_ans_' + section.id;
    var input = document.getElementById('ans-' + section.id);
    if (input && answers[key]) {
      input.value = answers[key];
    }
  });
}

function renderCopywritingAnalysis() {
  var q = copywritingQuestions[currentQuestion - 1];
  var analysisText = document.getElementById('analysis-text');
  if (analysisText) {
    analysisText.innerHTML = q.analysis[selectedAnalysisType].replace(/\n/g, '<br>');
  }
}

function selectCopywritingAnalysisType(type) {
  selectedAnalysisType = type;
  
  var buttons = document.querySelectorAll('.analysis-btn');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
  });
  
  event.target.classList.add('active');
  
  renderCopywritingAnalysis();
}

function showMyCopywritingAnswers() {
  var answers = JSON.parse(localStorage.getItem('copywriting_answers') || '{}');
  var q = copywritingQuestions[currentQuestion - 1];
  
  var html = '<div style="padding:20px;">';
  var hasContent = false;
  
  q.framework.forEach(function(section) {
    var key = 'cq' + currentQuestion + '_ans_' + section.id;
    var content = answers[key] || '';
    if (content.trim()) {
      hasContent = true;
      html += '<div style="margin-bottom:20px;">';
      html += '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px;">' + section.title + '</div>';
      html += '<div style="background:var(--paper);border-radius:8px;padding:12px;font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap;">' + content + '</div>';
      html += '</div>';
    }
  });
  
  if (!hasContent) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--ink-light);">';
    html += '<div style="font-size:48px;margin-bottom:12px;">📝</div>';
    html += '<div>还没有填写答案</div>';
    html += '<div style="font-size:12px;margin-top:8px;">在"考生作答"TAB中填写答案后可查看汇总</div>';
    html += '</div>';
  }
  
  html += '</div>';
  
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:var(--card);width:90%;max-height:80%;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">' +
    '<div style="padding:16px;border-bottom:1px solid var(--paper-line);display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-size:16px;font-weight:600;">我的答案汇总</div>' +
    '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;">' + html + '</div>' +
    '</div>';
  
  document.body.appendChild(modal);
}

function showFullCopywritingAnswer() {
  var q = copywritingQuestions[currentQuestion - 1];
  
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = '<div style="background:var(--card);width:90%;max-height:80%;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">' +
    '<div style="padding:16px;border-bottom:1px solid var(--paper-line);display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-size:16px;font-weight:600;">完整答案</div>' +
    '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:20px;">' +
    '<div style="font-size:14px;line-height:1.8;color:var(--ink-soft);">' + q.fullAnswer + '</div>' +
    '</div>' +
    '</div>';
  
  document.body.appendChild(modal);
}