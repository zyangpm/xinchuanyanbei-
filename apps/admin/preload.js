// ===== 管理后台预加载脚本（V5.1）=====
// 与学生端 preload 使用同一个共享 JSON 文件：
//   <用户目录>/.xinchuan-yanbei/shared.json
// 管理后台的题库增删改、资料变更通过该文件同步到桌面版学生端；
// 网页版（同源 http://localhost:8081/admin/）则直接共用 localStorage，不走此桥。

const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

var SHARED_FILE = path.join(os.homedir(), '.xinchuan-yanbei', 'shared.json');

function readShared() {
  try {
    return JSON.parse(fs.readFileSync(SHARED_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeShared(data) {
  try {
    fs.mkdirSync(path.dirname(SHARED_FILE), { recursive: true });
    fs.writeFileSync(SHARED_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

contextBridge.exposeInMainWorld('xcShared', {
  mode: 'electron',
  getAll: () => readShared(),
  setCollection: (name, value) => {
    var data = readShared();
    data[name] = value;
    return writeShared(data);
  }
});
