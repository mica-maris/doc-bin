# docbin 夜间队列

目标：可安装的 `@docbin/*` + demo（通用 `.doc` 引擎 / 纯前端；套表为强验收样张）。

| id | status | slice | verify |
|----|--------|-------|--------|
| Q-001 | done | M0 收口 + 队列/白名单；doc-codec→AST 策略 | docs 与仓结构可读 |
| Q-002 | done | M1：parseDoc + 纯文本 + smoke fixture | pnpm test |
| Q-003 | done | M2：表格映射（合并/边框/列宽）+ renderHtml | pnpm test + demo 表可见 |
| Q-004 | done | M3：页边距映射 + 矩阵更新（竖排诚实标 🟡） | support-matrix 同步 |
| Q-005 | done | M4：Vue/React DocPreview + apps/demo | pnpm build；demo 可打开 |
| Q-006 | done | 版本 0.1.0 + 本地 tgz（无 npm 登录） | `release/*.tgz` |
| Q-007 | todo | 用户 `npm login` 后正式 `npm publish` 三包 | registry 可见 |
