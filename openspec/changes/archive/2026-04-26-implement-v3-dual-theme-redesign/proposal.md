## Why

当前 Firefly-Isle 已经有 dark / light 双主题和主题切换能力，但运行时界面仍停留在“两套页面互相切换”：dark 偏黑色控制台，light 偏杂志/编辑排版，结构、行动位置、侧栏宽度、圆角、按钮语义与信息密度都存在漂移。用户已接受 `docs/design/Image-2/V3/` 作为新的视觉方向，其中 `DESIGN.md` 明确要求“同一骨架，不同材料”：dark 是黑色临床控制室，light 是白色法证档案文档。

现在需要把 V3 图像批次转化为真实前端视觉系统，而不是继续把页面调成通用 SaaS 仪表盘。目标是保留强烈设计冲击力，同时移除偶发杂乱、重复动作和主题分叉。

## What Changes

- 将当前视觉系统真源切换为 `docs/design/Image-2/V3/DESIGN.md` 与同目录截图，尤其 `/app` dark 以 `03-app-dark-new.png` 为优先参考。
- 重建主题 token 与全局 CSS：橙色成为唯一主要行动色，绿色只表达健康/完成，恢复 V3 的 8px 主圆角语言，移除全局扁平化冲突。
- 收敛 shared shell：`/app` 与 `/record/:id` 使用默认展开、边线胶囊折叠/隐藏、可拖拽调整宽度、低于阈值自动 icon-only 的同一左侧栏，配合共享 top status bar 和同一内容节奏；dark / light 只通过材料语言分化。
- 重构 workspace composition：删除 `/app` 中重复的主提取动作，移除 V3 已判定为噪声的参数/语音/多余控制块，让病史输入后直接进入治疗时间线。
- 重构 record / login / privacy 的视觉一致性：保留戏剧性和档案感，但不新增第三套视觉语法，不改变路由、认证、提取、数据结构或导出行为。
- 更新受影响的文件职责注释和模块说明，使其与实现一致。

## Capabilities

### Modified Capabilities

- `theme-system`: 主题实现从旧 dark/light/Stitch 证据源切换到 V3 `DESIGN.md` 视觉真源，并明确 token、圆角、字体和状态色语义。
- `app-shell`: 页面壳层从硬编码 72px rail / 分叉顶部结构收敛为 V3 的边线胶囊可变侧栏、共享 top status bar 和同骨架双主题页面。

## Impact

- Affected code: `src/lib/theme/tokens.ts`, `src/index.css`, `src/components/system/*`, `src/components/workspace/*`, `src/components/login-page-view.tsx`, `src/routes/workspace-page.tsx`, `src/routes/record-page.tsx`, `src/routes/privacy-page.tsx`, removed stale `src/components/record/*`, and related tests.
- Affected docs: this change, `docs/products/design-system.md`, `src/**/CLAUDE.md`, and any L3 headers whose responsibilities change.
- Explicitly not affected: routing, Supabase auth, extraction logic, `PatientRecord` schema, PDF/PNG export behavior, current `/app` workflow, database schema, Edge Functions.
- Required verification: lint, type-check, tests, build, and browser screenshots for `/login`, `/app`, `/record/demo`, `/privacy` in dark/light desktop/mobile, compared against accepted V3 images with mismatch notes.
