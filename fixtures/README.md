# Fixtures（回归资产）

放真实或**脱敏自制**的 `.doc` 套表样例，供解析器回归。

## 约定

| 目录/文件 | 用途 |
|-----------|------|
| `smoke/` | 极小合法 CFB / 自制最小表（可进 Git） |
| `forms/` | 公文套表（脱敏后），体积大可用 Git LFS |
| `*.expected.json` | 可选：AST / plainText 期望（后续） |

## 版权

- 禁止提交未授权的单位正式空白表格原件（若版权不明）  
- 优先：自己用 Word / `pnpm fixtures` 画「仿套表」  
- 若使用公开模板，在本目录 `SOURCES.md` 注明来源与许可

## 当前

| 文件 | 来源 |
|------|------|
| `smoke/plain-text.doc` | `pnpm fixtures`（doc-codec write） |
| `smoke/form-merge.doc` | 同上：合并格 + 边框 + 页边距 |
