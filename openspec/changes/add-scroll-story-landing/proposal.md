> 当前实现更新（2026-10-05）：用户已选择自有原生滚动控制器替代 GSAP，不引入其他动画库。本文保留最初 GSAP 参考取证及提出变更时的动机；现行实现合同和替代决策见 spec/design。

## Why

`/login` 目前是一屏静态介绍页：品牌字标、一句定位、`登录` CTA、`查看 Demo` CTA、安全状态、工具区，全部塞在同一个首屏里（`src/components/login/login-entry-view.tsx`）。想了解产品的人只有两条路：立刻登录，或者点 `查看 Demo` 跳到 `/demo/record` 自己摸索一个满是临床术语的病历页。

这造成两个真实问题：

1. **首屏没有信息密度。** 一句"把复杂治疗史整理为可追溯的结构化病历"无法说明产品到底做什么、为谁做、凭什么可信。访客在决定是否注册之前，拿不到任何足以判断的内容。
2. **`查看 Demo` 承担了它承担不了的解释责任。** Demo 是产品界面，不是叙事。未登录访客点进去看到的是陌生的病历档案页，缺少"这是什么、为什么这样设计"的上下文。用一个跳出当前页面的动作替代产品介绍，等于把理解成本推给访客。

参考实现 `https://vibehub.icu/` 给出的解法是：把介绍做成一条纵向滚动叙事线，滚动本身成为讲解节奏。经抓取其线上产物确认，它的技术选择是 GSAP + ScrollTrigger（页面产物中出现 36 次 `gsap`、21 次 `ScrollTrigger`），章节以 `#hero` / `#platform` / `#project` / `#feature-room` / `#docs` / `#ai-workflow-wrapper` 等语义 section 顺序推进，滚动进度驱动元素显隐与位移，而不是横向轮播或自动播片。

## What Changes

- 把 `/login` 从单屏介绍页改为纵向滚动叙事落地页：保留同一路由、同一双主题视觉系统、同一统一登录弹层，新增按滚动顺序推进的产品叙事章节。
- 移除登录页 `查看 Demo` CTA（`data-testid="login-demo-cta"`）。产品解释责任由滚动叙事承担，不再依赖跳出页面的 Demo 入口。
- 引入 GSAP + ScrollTrigger 作为滚动叙事的动画契约，替代当前登录页依赖的一次性 CSS 进入动效（`t-route-reveal` / `t-stagger`）在叙事区的适用范围；首屏进入节奏与既有 CSS 动效保持不变。
- 叙事章节复用产品真实语义：临床时间线是什么、结构化抽取如何工作、多线治疗与实验室趋势如何呈现、隐私与非诊断边界在哪里。章节内容 SHALL 来自 `openspec/specs` 已定义的真实能力，不得新增未实现的功能承诺。
- 保留 `/demo/*` 全部公开路由与 Demo 能力本身。本次只取消登录页的 Demo CTA 入口，不删除 Demo 模式。
- 尊重 `prefers-reduced-motion`：降级为无滚动动画的顺序静态章节，内容完整可读。

## Capabilities

### New Capabilities

- `scroll-story-landing`: `/login` 纵向滚动叙事落地页能力，包括章节顺序契约、ScrollTrigger 滚动进度绑定、sticky 分层推进、reduced-motion 降级、SSR/静态渲染安全边界与登录弹层共存规则。

### Modified Capabilities

- `app-shell`: 登录页结构 SHALL 从单屏介绍区域扩展为纵向滚动叙事结构，仍保持单一 `/login` 路由与 CTA 驱动的统一登录弹层；登录页 SHALL NOT 再提供 Demo CTA。
- `demo-mode`: 登录页 SHALL NOT 再作为 Demo 入口；`/demo` 及其子路由 SHALL 保持公开可访问与现有 Demo 行为不变。
- `theme-system`: 滚动叙事章节 SHALL 在 dark / light 主题间共享同一套 token、层级与动效语义，SHALL NOT 引入仅单主题可用的叙事视觉。

## Impact

- 受影响前端组件：`src/components/login/login-entry-view.tsx`（入口编排层从单屏改为叙事容器）、`src/components/login/AGENTS.md`、新增叙事章节与 ScrollTrigger 编排模块。
- 受影响依赖：新增 `gsap`（当前未安装，`package.json` 中仅有 `three` 与 `threejs-components`）。
- 受影响样式：`src/styles/transitions-dev.css` 的 reduced-motion 收敛清单需覆盖新增叙事类。
- 受影响测试：`src/components/login-page-view.test.tsx` 中锁 Demo CTA 的断言需改为锁"不存在 Demo CTA"；新增章节顺序与 reduced-motion 契约测试。
- 受影响规格：`openspec/specs/app-shell/spec.md`、`openspec/specs/demo-mode/spec.md`、`openspec/specs/theme-system/spec.md` 的登录页与 Demo 入口条款。
- 受影响文档：`DESIGN.md` 与 V3 登录页视觉契约（原稿现归档于 `docs/design/archive/Image-2/V3/DESIGN.md`，仅记录当时设计来源）、`openspec/changes/AGENTS.md` 变更地图、`src/components/**/AGENTS.md` 架构头部。
- 不受影响：Supabase 认证语义、`/app`、`/record/:id`、`/analytics/:id`、导出、分享、AI 分析、Capacitor 移动壳与 PWA 契约。
