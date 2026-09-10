# packages/content

新传研背 V4 唯一题库数据源。移动端（apps/mobile）与后台管理平台（apps/admin）统一读取这里，不允许保留第二份数据库。

## 当前数据文件（V4.0）

| 文件 | 全局变量 | 说明 |
| --- | --- | --- |
| `noun-data.js` | `nounData` | 名词解释词条（对象格式，key 为词目） |
| `short-data.js` | `shortData` | 简答题（`{ items: [] }`） |
| `essay-data.js` | `essayData` | 论述题（`{ items: [] }`） |
| `practice-data.js` | `practiceData` | 实务题 V1（按消息/评论/策划/采访分类） |
| `practice-v2-data.js` | `practiceV2Data` | 实务题 V2（`{ items: [] }`） |
| `tags.json` | — | 标签数据（占位，后续由后台维护） |
| `videos.json` | — | 视频资源数据（占位，后续由后台维护） |

## 数据格式说明

V4.0 题库数据以 `.js` 文件形式存储，使用 `var X = {...}` 全局变量赋值模式，
通过 `<script src>` 在 HTML 中同步加载。这是 V4.0 的既定加载方式，
不能改为 `.json` + `fetch()` 的异步加载，否则会改变运行行为。

后续 V5+ 版本可考虑迁移至 `.json` + 异步加载，本次重构保持 `.js` 格式不变。

## 移动端引用方式

apps/mobile/app/ 下的 HTML 通过相对路径引用：

```html
<script src="../../../packages/content/noun-data.js"></script>
<script src="../../../packages/content/short-data.js"></script>
```

相对路径 `../../../packages/content/` 在 file://（Electron）与 http://（start-server）协议下均可正确解析。

## 后台维护职责

后台管理平台（apps/admin）负责维护本目录下所有数据文件，
包括新增/编辑/删除词条、标签、视频资源。
