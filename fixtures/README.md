# Fixtures（回归资产）

放真实或**脱敏自制**的 `.doc` 套表样例，供解析器回归。

## 约定

| 目录/文件 | 用途 |
|-----------|------|
| `smoke/` | 极小合法 CFB / 自制最小表（可进 Git） |
| `forms/` | 本机复杂套表对照；`*.doc` **不进 Git**；`pnpm compare:wps -- fixtures/forms` |
| `forms/SOURCES.example.md` | 本机来源记录模板（公开） |
| `forms/SOURCES.md` | 本机私有笔记（已 gitignore） |

## 版权

- 禁止提交未授权的单位正式空白表格原件  
- 优先：自己用 Word / `pnpm fixtures` 画「仿套表」  
- 公开模板：在 `smoke/SOURCES.md` 或 PR 说明里写来源与许可；勿把内网路径写进仓  
- 本机 `scripts/probe-*.mjs` 已 gitignore（常绑私有样张）；公开对照用 `pnpm compare:wps`

## 当前

| 文件 | 来源 |
|------|------|
| `smoke/plain-text.doc` | `pnpm fixtures`（doc-codec write） |
| `smoke/form-merge.doc` | 同上：合并格 + 边框 + 页边距 |
| `smoke/paged.doc` | 显式分页符（封面 + 第二页） |
