# forms/ — 真实/脱敏套表样张

把可用于回归的 `.doc` 放这里（优先脱敏仿样或已获授权的模板）。

## 用法

```bash
# 本仓 HTML 预览 + WPS 同开对照
pnpm compare:wps -- fixtures/forms
```

## 约定

| 项 | 说明 |
|----|------|
| 版权 | 不明版权的单位正式空白表不要进 Git |
| 命名 | `cover-*.doc` / `form-*.doc` / `multi-*.doc` 便于辨认 |
| 对照记录 | 差距写到 `docs/compare-notes.md` |

当前若为空：先用 `fixtures/smoke/` 跑通对照流程。

可选：将本机复杂套表复制为 `private-grid.doc`，可启用依赖私有样张的 vitest 用例（该文件已 gitignore）。
