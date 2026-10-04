## Why

当前 `/login` 已经具备 dark / light 双主题，但三个入口层细节仍带着错误的空间身份：

- light 登录页的主题切换按钮位于认证卡片标题行，像表单内动作，而不是页面级主题控制。
- light 登录页背景使用点阵纹理，视觉噪声压过了登录入口本身。
- dark 登录页复用了工作区侧栏，导致未认证入口看起来像已进入控制台。

这些不是业务能力问题，而是登录页壳层语义问题。登录页应当是纯入口：保留品牌、认证与主题切换，不承载工作区导航。

## What Changes

- 将 light 登录页主题切换从认证卡片标题行移出，改为参考 dark 登录页的右下角悬浮控制。
- 将 light 登录页背景从点阵纹理收敛为纯色 surface，保留报纸式黑白线框语言。
- dark 登录页移除 `ArchiveSideNav` 工作区侧栏与对应左侧 offset，让登录页成为独立入口画布。
- 保留 dark 登录页现有右下角主题切换入口，确保去侧栏后仍可切换主题。
- 同步 OpenSpec 与架构文档，使登录页不再被描述为复用工作区导航壳层。

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `app-shell`: 登录页壳层从“复刻工作区侧栏的入口页”收敛为“无工作区导航的独立入口页”。
- `theme-system`: 登录页主题切换成为页面级 utility；light 登录页背景不得使用点阵纹理。

## Impact

- Affected code: `src/components/login-page-view.tsx`, `src/index.css`, and potentially login-related tests.
- Affected docs: `openspec/changes/refine-login-theme-entry/**`, `src/components/CLAUDE.md`, `docs/products/design-system.md` if contract wording changes.
- No Auth, Supabase, LLM, database, or routing behavior changes are expected.
