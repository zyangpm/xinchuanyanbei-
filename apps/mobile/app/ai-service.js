// ===== 新传研背 V5.1 多厂商 AI 服务层 =====
// 唯一职责：按用户配置向大模型 API 发起真实 HTTP 请求并解析返回。
//
// 设计铁律：
// 1. 不内置任何固定答案/关键词匹配；任何失败都向上抛错，禁止静默兜底为假结果
// 2. API Key / 接口地址只在调用时从 localStorage 运行时读取，不硬编码、不打印
// 3. 模型接入策略：
//    - DeepSeek：官方接口开箱即用，用户只需填 Key
//    - GPT / Claude / Gemini / 智谱清言 / 讯飞星火 / Kimi：均为「用户自配置」模型，
//      必须同时填写「接口地址 URL + API Key」（模型名提供默认值，可改）才能调用；
//      未配置时明确拦截并提示去配置，绝不伪装已接入或伪造成功回答
// 4. 所有厂商统一走 OpenAI 兼容的 /chat/completions 协议（Authorization: Bearer）
//    智谱/讯飞/Kimi/GPT/Gemini 官方均提供该兼容协议；Claude 可通过兼容中转地址接入
// 5. 本文件不依赖任何第三方库，浏览器与 Electron 环境均可用（fetch + AbortController）

var AiService = (function () {
  // 厂商目录：endpoint/model 为预填参考值（可在设置中修改），key 必须用户自己填
  var PROVIDERS = {
    deepseek: {
      label: 'DeepSeek',
      builtin: true,
      endpoint: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat',
      hint: '官方接口已内置，只需填写自己的 DeepSeek API Key。'
    },
    zhipu: {
      label: '智谱清言 GLM',
      builtin: false,
      endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: 'glm-4-flash',
      hint: '智谱 AI 开放平台（bigmodel.cn），glm-4-flash 模型注册后有免费额度。需自行填写 Key。'
    },
    kimi: {
      label: 'Kimi（月之暗面）',
      builtin: false,
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
      model: 'moonshot-v1-8k',
      hint: '月之暗面开放平台（platform.moonshot.cn），新用户通常赠送免费额度。需自行填写 Key。'
    },
    xunfei: {
      label: '讯飞星火',
      builtin: false,
      endpoint: 'https://spark-api-open.xf-yun.com/v1/chat/completions',
      model: 'generalv3.5',
      hint: '讯飞星火控制台的 OpenAI 兼容接口，密钥处填写 APIPassword（不是 APIKey/APISecret）。'
    },
    gpt: {
      label: 'GPT（OpenAI 兼容接口）',
      builtin: false,
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      hint: 'OpenAI 官方接口，或任何 OpenAI 兼容中转站地址。需自行填写可访问的 URL 与 Key。'
    },
    claude: {
      label: 'Claude（兼容接口）',
      builtin: false,
      endpoint: '',
      model: '',
      hint: 'Anthropic 官方协议与本应用不同，请填写支持 OpenAI 协议的中转站地址、模型名与 Key。'
    },
    gemini: {
      label: 'Gemini',
      builtin: false,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: 'gemini-1.5-flash',
      hint: 'Google AI Studio 提供的 OpenAI 兼容接口，需自行填写 Key。'
    }
  };

  // ===== V5.1 视频生成 Provider 目录 =====
  // 视频生成模型均为异步任务协议：POST 提交 → 返回 task_id → 轮询 GET 查询状态 → 完成后取 video_url。
  // 不同于对话 API（同步 /chat/completions）。代码层用「提交 + 轮询」通用模式。
  // 字段说明：
  //   submitEndpoint：提交任务的 POST 地址（完整 URL）
  //   queryTemplate：查询任务状态的 GET 地址模板，{taskId} 占位
  //   resultPath：完成任务后从响应中提取 video URL 的路径（点分隔，如 'data.video_url'）
  //   statusPath：查询响应中状态字段的路径（点分隔，如 'data.status'）
  //   statusDone：状态字段为何值时算完成（string 数组）
  //   taskIdPath：提交响应中 task_id 的路径
  var VIDEO_PROVIDERS = {
    jimeng: {
      label: '即梦 AI / 火山方舟视频',
      builtin: false,
      submitEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
      queryTemplate: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{taskId}',
      // Seedance 1.0 lite-i2v：入门图生视频模型，无 200 元余额门槛；
      // 想用 2.0 系列改为 doubao-seedance-2-0-260128（需账户余额>200元或购买资源包）
      model: 'doubao-seedance-1-0-lite-i2v-250428',
      taskIdPath: 'id',
      statusPath: 'status',
      statusDone: ['succeeded'],
      statusFailed: ['failed', 'error', 'cancelled'],
      resultPath: 'content.video_url',
      hint: '字节火山方舟 Doubao Seedance 视频生成模型。在 console.volcengine.com 开通模型并创建 API Key。状态：queued/running/succeeded/failed/cancelled。视频 URL 24 小时有效。Seedance 2.0 系列需账户余额>200元。'
    },
    custom: {
      label: '自定义视频生成接口',
      builtin: false,
      submitEndpoint: '',
      queryTemplate: '',
      model: '',
      taskIdPath: 'task_id',
      statusPath: 'status',
      statusDone: ['succeeded', 'success', 'completed', 'done'],
      statusFailed: ['failed', 'error', 'cancelled'],
      resultPath: 'video_url',
      hint: '任意"提交任务返回 task_id + 轮询查询返回 video_url"协议的视频生成接口。请填写提交地址、查询地址模板（含 {taskId}）、模型名和 Key。'
    }
  };

  var CONFIG_KEY = 'aiProviderConfig';
  var VIDEO_CONFIG_KEY = 'aiVideoProviderConfig';

  function getApiKey() {
    return (localStorage.getItem('apiKey') || '').trim();
  }

  function readProviderConfigs() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeProviderConfigs(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg || {}));
  }

  // 合并目录默认值与用户配置
  function getProvider(key) {
    var base = PROVIDERS[key] || null;
    if (!base) return null;
    var saved = readProviderConfigs()[key] || {};
    var keyVal = (saved.key || '').trim();
    if (base.builtin) keyVal = getApiKey(); // DeepSeek Key 沿用旧字段
    return {
      key: key,
      label: base.label,
      builtin: !!base.builtin,
      endpoint: (saved.endpoint || base.endpoint) || '',
      model: (saved.model != null && saved.model !== '' ? saved.model : base.model) || '',
      keyVal: keyVal,
      hint: base.hint || ''
    };
  }

  function saveProviderConfig(key, conf) {
    var all = readProviderConfigs();
    var cur = all[key] || {};
    cur.endpoint = (conf.endpoint || '').trim();
    cur.model = (conf.model || '').trim();
    if (typeof conf.key === 'string') cur.key = conf.key.trim();
    all[key] = cur;
    writeProviderConfigs(all);
  }

  // 是否已具备发起调用的条件（DeepSeek 只看 Key；其余厂商必须 URL+Key 齐全）
  function isConfigured(key) {
    var p = getProvider(key);
    if (!p) return false;
    if (!p.keyVal) return false;
    if (!p.builtin && !p.endpoint) return false;
    return true;
  }

  function isModelSupported(modelKey) {
    return !!PROVIDERS[modelKey || 'deepseek'];
  }

  function makeError(code, message) {
    var err = new Error(message);
    err.code = code;
    return err;
  }

  // ===== V5.1 浏览器同源代理 =====
  // 网页/PWA 环境下，讯飞星火、OpenAI 等默认端点不返回 CORS 头，浏览器直连必然
  // "Failed to fetch"。这些请求改走同源服务端转发（见 start-server.js 的 /api/ai-proxy）；
  // Electron(file://) 下不受 CORS 限制，仍直连厂商。
  var PROXY_PATH = '/api/ai-proxy';
  var PROXY_HOSTS = [
    'api.deepseek.com', 'open.bigmodel.cn', 'api.moonshot.cn',
    'spark-api-open.xf-yun.com', 'api.openai.com',
    'generativelanguage.googleapis.com', 'api.anthropic.com',
    // V5.1 视频生成：火山方舟 doubao-seedream 视频
    'ark.cn-beijing.volces.com'
  ];

  function inHttpBrowser() {
    try {
      return window.location.protocol.indexOf('http') === 0 &&
        !(window.xcShared && window.xcShared.mode === 'electron');
    } catch (e) { return false; }
  }

  function isProxyableHost(endpoint) {
    try {
      var host = new URL(endpoint).hostname.toLowerCase();
      return PROXY_HOSTS.some(function (h) {
        if (host === h) return true;
        // 严格子域后缀：主机名必须比 h 长至少 2，防止短域名误匹配
        return host.length > h.length + 1 && host.slice(-(h.length + 1)) === ('.' + h);
      });
    } catch (e) { return false; }
  }

  function resolveChatUrl(endpoint) {
    if (inHttpBrowser() && isProxyableHost(endpoint)) {
      return PROXY_PATH + '?u=' + encodeURIComponent(endpoint);
    }
    return endpoint;
  }

  // 把 service 层错误翻译为用户可理解的中文提示（不含 Key 等敏感信息）
  function friendlyError(err) {
    if (!err || !err.code) return 'AI 调用失败，请稍后重试。';
    switch (err.code) {
      case 'NO_KEY':
        return '尚未配置 API Key。请在「我的 → AI模型自定义管理」中选择模型并填写 API Key 后再试。';
      case 'NOT_CONFIGURED':
        return '该模型还没有完成配置：需要填写接口地址（URL）和 API Key。请在 AI 设置中配置后再使用。';
      case 'AUTH_FAILED':
        return 'API Key 无效或已失效（服务端拒绝访问）。请检查该模型的 API Key 是否正确。';
      case 'QUOTA_OR_RATE':
        return 'AI 服务拒绝了本次请求：账户余额/免费额度不足，或触发了频率限制。请稍后重试或检查账户。';
      case 'HTTP_ERROR':
        return 'AI 服务返回异常（' + (err.status || '未知状态码') + '）。请检查接口地址是否正确后重试。';
      case 'EMPTY':
        return 'AI 已响应但返回内容为空，请换个问法重试。';
      case 'TIMEOUT':
        return 'AI 响应超时（超过 30 秒），请检查网络后重试。';
      case 'ABORTED':
        return '已取消本次 AI 请求。';
      case 'NETWORK':
        return '网络连接失败，无法访问该 AI 接口。请检查网络，或确认接口地址（URL）是否可访问。';
      case 'VIDEO_FAILED':
        return '视频生成任务失败：' + (err.message || '服务端返回失败状态，请稍后重试或检查额度。');
      default:
        return 'AI 调用失败，请稍后重试。';
    }
  }

  // 发起一次真实对话补全。
  // payload: { modelKey, messages:[{role,content}], maxTokens, temperature, signal }
  // 返回 Promise<string>（模型文本）；失败 reject 带 code 的 Error。
  function chat(payload) {
    var modelKey = payload.modelKey || localStorage.getItem('aiModel') || 'deepseek';

    if (!isModelSupported(modelKey)) {
      return Promise.reject(makeError('NOT_CONFIGURED'));
    }

    var conf = getProvider(modelKey);
    if (!conf) {
      return Promise.reject(makeError('NOT_CONFIGURED'));
    }
    if (!conf.keyVal) {
      return Promise.reject(makeError(conf.builtin ? 'NO_KEY' : 'NOT_CONFIGURED'));
    }
    if (!conf.endpoint) {
      return Promise.reject(makeError('NOT_CONFIGURED'));
    }

    var body = {
      model: conf.model,
      messages: payload.messages,
      stream: false,
      temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.7,
      max_tokens: payload.maxTokens || 900
    };

    // 30 秒超时；若外部传入 signal（如用户取消）则联动
    var controller = new AbortController();
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, 30000);
    var externalSignal = payload.signal;
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      externalSignal.addEventListener('abort', function () { controller.abort(); });
    }

    return fetch(resolveChatUrl(conf.endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + conf.keyVal
      },
      body: JSON.stringify(body),
      signal: controller.signal
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        throw makeError('AUTH_FAILED');
      }
      if (res.status === 402 || res.status === 429) {
        throw makeError('QUOTA_OR_RATE');
      }
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var serverMsg = data && data.error && data.error.message;
          var e = makeError('HTTP_ERROR', serverMsg || ('HTTP ' + res.status));
          e.status = res.status;
          throw e;
        }
        var content = data
          && data.choices
          && data.choices[0]
          && data.choices[0].message
          && data.choices[0].message.content;
        if (typeof content !== 'string') {
          throw makeError('EMPTY');
        }
        content = content.trim();
        if (!content) {
          throw makeError('EMPTY');
        }
        return content;
      });
    }).catch(function (err) {
      // 超时优先：AbortController 中止后 fetch 抛出的 DOMException 自带数字 code=20，
      // 必须先判定超时/取消，再放行业务错误，否则 TIMEOUT/ABORTED 友好提示永远不生效
      if (timedOut) throw makeError('TIMEOUT');
      if (err && err.name === 'AbortError') {
        throw makeError('ABORTED');
      }
      // 业务错误（字符串 code）直接向上抛
      if (err && typeof err.code === 'string') throw err;
      // fetch 层网络失败（断网/DNS/TLS/CORS）
      throw makeError('NETWORK');
    }).then(function (result) {
      clearTimeout(timer);
      return result;
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  // ===== V5.1 视频生成 API（异步任务 + 轮询） =====
  function readVideoConfigs() {
    try {
      return JSON.parse(localStorage.getItem(VIDEO_CONFIG_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeVideoConfigs(cfg) {
    localStorage.setItem(VIDEO_CONFIG_KEY, JSON.stringify(cfg || {}));
  }

  function getVideoProvider(key) {
    var base = VIDEO_PROVIDERS[key] || null;
    if (!base) return null;
    var saved = readVideoConfigs()[key] || {};
    return {
      key: key,
      label: base.label,
      builtin: !!base.builtin,
      submitEndpoint: (saved.submitEndpoint || base.submitEndpoint) || '',
      queryTemplate: (saved.queryTemplate || base.queryTemplate) || '',
      model: (saved.model != null && saved.model !== '' ? saved.model : base.model) || '',
      keyVal: (saved.key || '').trim(),
      taskIdPath: base.taskIdPath,
      statusPath: base.statusPath,
      statusDone: base.statusDone,
      statusFailed: base.statusFailed,
      resultPath: base.resultPath,
      hint: base.hint || ''
    };
  }

  function saveVideoProviderConfig(key, conf) {
    var all = readVideoConfigs();
    var cur = all[key] || {};
    cur.submitEndpoint = (conf.submitEndpoint || '').trim();
    cur.queryTemplate = (conf.queryTemplate || '').trim();
    cur.model = (conf.model || '').trim();
    if (typeof conf.key === 'string') cur.key = conf.key.trim();
    all[key] = cur;
    writeVideoConfigs(all);
  }

  function isVideoConfigured(key) {
    var p = getVideoProvider(key);
    if (!p) return false;
    if (!p.keyVal) return false;
    if (!p.submitEndpoint || !p.queryTemplate) return false;
    return true;
  }

  function isVideoModelSupported(modelKey) {
    return !!VIDEO_PROVIDERS[modelKey || 'jimeng'];
  }

  // 点路径取值（'content.video_url' → obj.content.video_url）
  function getPath(obj, path) {
    if (!path) return null;
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function resolveVideoUrl(endpoint) {
    if (inHttpBrowser() && isProxyableHost(endpoint)) {
      return PROXY_PATH + '?u=' + encodeURIComponent(endpoint);
    }
    return endpoint;
  }

  // 提交视频生成任务 → 拿 task_id → 轮询查询 → 完成返回 { videoUrl, raw }
  // payload: { providerKey, prompt, model?, duration?, signal?, onProgress? }
  //   onProgress(status, attempt) 可选，外部用做进度提示
  function generateVideo(payload) {
    var providerKey = payload.providerKey || localStorage.getItem('aiVideoProvider') || 'jimeng';
    if (!isVideoModelSupported(providerKey)) {
      return Promise.reject(makeError('NOT_CONFIGURED'));
    }
    var conf = getVideoProvider(providerKey);
    if (!conf) return Promise.reject(makeError('NOT_CONFIGURED'));
    if (!conf.keyVal) return Promise.reject(makeError(conf.builtin ? 'NO_KEY' : 'NOT_CONFIGURED'));
    if (!conf.submitEndpoint || !conf.queryTemplate) {
      return Promise.reject(makeError('NOT_CONFIGURED'));
    }

    // 即梦/火山方舟 doubao-seedream 视频生成提交请求体（参考官方文档）
    var bodyObj;
    if (providerKey === 'jimeng') {
      bodyObj = {
        model: conf.model,
        content: [{ type: 'text', text: payload.prompt || '' }]
      };
    } else {
      // 通用协议：尽量兼容常见字段名
      bodyObj = {
        model: conf.model,
        prompt: payload.prompt || '',
        content: [{ type: 'text', text: payload.prompt || '' }]
      };
      if (payload.duration) bodyObj.duration = payload.duration;
    }

    var controller = new AbortController();
    var externalSignal = payload.signal;
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      externalSignal.addEventListener('abort', function () { controller.abort(); });
    }

    var submitUrl = resolveVideoUrl(conf.submitEndpoint);

    return fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + conf.keyVal
      },
      body: JSON.stringify(bodyObj),
      signal: controller.signal
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) throw makeError('AUTH_FAILED');
      if (res.status === 402 || res.status === 429) throw makeError('QUOTA_OR_RATE');
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var serverMsg = data && data.error && data.error.message;
          var e = makeError('HTTP_ERROR', serverMsg || ('HTTP ' + res.status));
          e.status = res.status;
          throw e;
        }
        var taskId = getPath(data, conf.taskIdPath);
        if (!taskId) throw makeError('EMPTY', '视频任务已提交，但未返回 task_id');
        return pollVideoTask(taskId, conf, controller, payload.onProgress);
      });
    }).catch(function (err) {
      if (err && err.name === 'AbortError') throw makeError('ABORTED');
      if (err && typeof err.code === 'string') throw err;
      throw makeError('NETWORK');
    });
  }

  // 轮询查询任务状态：每 5 秒查一次，最长 5 分钟（60 次）
  function pollVideoTask(taskId, conf, controller, onProgress) {
    var queryUrl = conf.queryTemplate.replace('{taskId}', encodeURIComponent(taskId));
    queryUrl = resolveVideoUrl(queryUrl);

    var maxAttempts = 60;
    var delayMs = 5000;
    var attempt = 0;

    function once() {
      attempt++;
      if (onProgress) {
        try { onProgress('polling', attempt); } catch (e) {}
      }
      return fetch(queryUrl, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + conf.keyVal },
        signal: controller.signal
      }).then(function (res) {
        if (res.status === 401 || res.status === 403) throw makeError('AUTH_FAILED');
        if (res.status === 402 || res.status === 429) throw makeError('QUOTA_OR_RATE');
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok) {
            var serverMsg = data && data.error && data.error.message;
            var e = makeError('HTTP_ERROR', serverMsg || ('HTTP ' + res.status));
            e.status = res.status;
            throw e;
          }
          var status = getPath(data, conf.statusPath);
          if (status && conf.statusFailed.indexOf(String(status).toLowerCase()) >= 0) {
            var failMsg = getPath(data, 'error.message') || '视频生成失败';
            var fe = makeError('VIDEO_FAILED', failMsg);
            fe.raw = data;
            throw fe;
          }
          var done = !status || conf.statusDone.indexOf(String(status).toLowerCase()) >= 0;
          if (done) {
            var videoUrl = getPath(data, conf.resultPath);
            if (!videoUrl) {
              // 兼容常见兜底路径
              videoUrl = getPath(data, 'data.video_url')
                || getPath(data, 'data.url')
                || getPath(data, 'video_url')
                || getPath(data, 'url');
            }
            if (!videoUrl) throw makeError('EMPTY', '任务已完成但未返回视频 URL');
            return { videoUrl: videoUrl, raw: data };
          }
          if (attempt >= maxAttempts) throw makeError('TIMEOUT');
          return new Promise(function (resolve) { setTimeout(resolve, delayMs); }).then(once);
        });
      }).catch(function (err) {
        if (err && err.name === 'AbortError') throw makeError('ABORTED');
        if (err && typeof err.code === 'string') throw err;
        throw makeError('NETWORK');
      });
    }
    return once();
  }

  return {
    chat: chat,
    getApiKey: getApiKey,
    isModelSupported: isModelSupported,
    isConfigured: isConfigured,
    getProvider: getProvider,
    saveProviderConfig: saveProviderConfig,
    providerKeys: Object.keys(PROVIDERS),
    friendlyError: friendlyError,
    // V5.1 视频生成
    generateVideo: generateVideo,
    getVideoProvider: getVideoProvider,
    saveVideoProviderConfig: saveVideoProviderConfig,
    isVideoConfigured: isVideoConfigured,
    isVideoModelSupported: isVideoModelSupported,
    videoProviderKeys: Object.keys(VIDEO_PROVIDERS)
  };
})();
