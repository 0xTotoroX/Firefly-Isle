# Design: `/login` 纵向滚动叙事落地页

> 2026-10-05 当前实现：按用户选择，移除 GSAP，使用自有原生滚动控制器。以下参考库取证及早期 GSAP 决策保留作历史依据，不再要求安装或注册 GSAP。

## 参考实现的事实基础

方案不基于对 `https://vibehub.icu/` 的观感猜测，而基于两组一手证据。

**证据一：32 秒 4K 录屏抽帧**（`/Users/Totoro/Desktop/录屏2026-07-26 凌晨1.19.12.mov`，60fps，4096x2202，按 1fps 抽出 32 帧存于 `work/vibehub-frames/`）。抽帧确认交互形态是单向纵向滚动推进，不是横向轮播、不是自动播片、不是全屏 snap 翻页。

**证据二：线上产物抓取**（`curl https://vibehub.icu/`，HTTP 200，164KB）。产物中的关键计数与配置：

| 事实 | 观测值 |
| --- | --- |
| 动画库 | `gsap` 出现 36 次，`ScrollTrigger` 出现 21 次 |
| 章节结构 | `#hero` `#platform` `#project` `#feature-room` `#docs` `#ai-workflow-wrapper` `#rules-engine` `#prompts` `#context` |
| GSAP `pin` 使用 | **0 次**——无 `pin:` / `pinSpacing:` |
| 平滑滚动库 | **无**——无 `ScrollSmoother` / `Lenis` / `locomotive` |
| 分层推进手法 | CSS `sticky`（3 次）配合超高 spacer：`h-[300vh]` `h-[250vh]` `h-[120vh]` |
| 进度回写 | `onUpdate` 将 `progress` 写入 `dataset.yPercent`（5 次） |

从产物提取的实际 ScrollTrigger 配置：

```javascript
{ trigger: "#project",              start: "top 80%", end: "top 60%",       scrub: 0.3 }
{ trigger: "#project",              start: "top 75%", end: "top 55%",       scrub: 0.3 }
{ trigger: "#feature-room",         start: "top 80%", end: "top 60%",       scrub: 0.3 }
{ trigger: "#feature-room",         start: "top 75%", end: "top 55%",       scrub: 0.3 }
{ trigger: "#docs",                 start: "top 70%", end: "top 50%",       scrub: 0.3 }
{ trigger: "#docs",                 start: "top 65%", end: "top 45%",       scrub: 0.3 }
{ trigger: "#ai-workflow-pin",      start: "top 70%", end: "top 30%",       scrub: 0.5 }
{ trigger: "#ai-workflow-pin",      start: "80% center", end: "bottom center", scrub: 0.5 }
{ trigger: "#layered-pin-trigger",  start: "top 30%", end: "center top",    scrub: 1 }
{ trigger: "#layered-pin-trigger-2",start: "top bottom", end: "top top",    scrub: 1 }
```

缓动分布：`ease:"none"` 5 次（scrub 场景的正确选择），`power2.out` / `power2.in` 各 1 次（非 scrub 的一次性入场）。

## 从证据推出的三个设计决策

### 决策一：不用 GSAP `pin`，用 CSS `sticky` + 高 spacer

参考实现零 `pin` 使用，全靠 `sticky` 加 `h-[300vh]` 类 spacer。这不是偷懒，是更干净的选择：

- GSAP `pin` 会注入 `pin-spacer` 包装元素、改写目标元素定位，与 Tailwind 布局和既有 `min-h-dvh` 结构容易互相干扰；换主题、换语言、字体加载完成都可能触发 layout 变化而需要 `ScrollTrigger.refresh()`。
- `sticky` 的定位职责完全留在 CSS 层，ScrollTrigger 只读进度、只写动画属性，两层不打架。职责边界清晰，出问题时只需判断"是布局问题还是动画问题"，而不是"pin-spacer 把布局改成什么了"。

对应到本项目：叙事章节用 `sticky top-0` 容器 + 兄弟 spacer 撑出滚动距离，ScrollTrigger 只负责把 `progress` 映射到透明度/位移。

### 决策二：`scrub` 分档，不是统一值

参考实现的 `scrub` 是分档的，且档位与动画职责对应：

- `scrub: 0.3` —— 文案/卡片入场。跟手，几乎无延迟，滚动停下动画立刻停。
- `scrub: 0.5` —— 工作流分步推进。轻微追赶感，让分步有节奏。
- `scrub: 1` —— 分层背景位移。明显滞后，制造纵深。

统一 `scrub: true` 会让所有元素同速，纵深感消失；统一大值会让文案入场显得黏滞。本项目沿用同一分档逻辑。

### 决策三：`start`/`end` 全部落在视口内部，且成对错开

参考实现的 `start` 集中在 `top 80%` ~ `top 65%`，`end` 集中在 `top 60%` ~ `top 45%`——都在视口内部，不用 `top bottom`（元素刚露头就开始）。效果是元素滚到视口中上部才开始动，用户视线已经在那里，动画被"看见"而不是在余光里浪费掉。

同一 trigger 的两条配置刻意错开 5%（`top 80%/top 60%` 与 `top 75%/top 55%`），这是标题与正文的层次差，比 `stagger` 更受滚动控制。

## Firefly-Isle 的叙事章节序列

内容取自 `openspec/specs` 已实现能力，不承诺未实现功能。

| 顺序 | 章节 id | 叙事职责 | 规格来源 |
| --- | --- | --- | --- |
| 0 | `story-hero` | 品牌字标 + 定位 + `登录` CTA + 安全状态（保留当前首屏，改为叙事第一章） | `app-shell` |
| 1 | `story-problem` | 复杂治疗史为何难以追溯：多线治疗、反复检验、信息散落 | `patient-record` |
| 2 | `story-intake` | 自然语言录入 → 结构化抽取 → 最多 3 轮澄清 | `info-extraction` |
| 3 | `story-timeline` | 三类患者原型如何决定渲染：`non-advanced` / `de-novo-advanced` / `relapsed-advanced` | `patient-record` |
| 4 | `story-views` | 档案视图 / TimelineTable / Gantt 三视图切换（sticky 分层，`scrub: 0.5` 分步推进） | `timeline-table` `record-treatment-gantt` |
| 5 | `story-labs` | 实验室指标分组趋势与肿瘤标志物上升提醒（非诊断） | `lab-result-trends` `lab-analytics-page` |
| 6 | `story-boundary` | 隐私优先、非诊断边界、只读分享与授权码撤销 | `record-sharing` `demo-mode` |
| 7 | `story-cta` | 收束回 `登录` CTA，打开同一统一登录弹层 | `app-shell` `auth` |

`story-hero` 与 `story-cta` 共用同一个 `IntroAccessCta`，指向同一个 `AuthOverlay` 实例，不复制认证状态。

## 参数映射表

| 章节 | trigger | start | end | scrub | 动画属性 |
| --- | --- | --- | --- | --- | --- |
| `story-problem` 标题 | `#story-problem` | `top 80%` | `top 60%` | 0.3 | `opacity` `y` |
| `story-problem` 正文 | `#story-problem` | `top 75%` | `top 55%` | 0.3 | `opacity` `y` |
| `story-intake` 步骤 | `#story-intake` | `top 70%` | `top 50%` | 0.3 | `opacity` `y` `stagger` |
| `story-timeline` 原型卡 | `#story-timeline` | `top 75%` | `top 55%` | 0.3 | `opacity` `y` |
| `story-views` 分步 | `#story-views-sticky` | `top 70%` | `top 30%` | 0.5 | 视图切换 `opacity` |
| `story-views` 退出 | `#story-views-sticky` | `80% center` | `bottom center` | 0.5 | `opacity` 淡出 |
| `story-labs` 趋势 | `#story-labs` | `top 70%` | `top 50%` | 0.3 | `opacity` 线条 `scaleX` |
| 分层背景位移 | `#story-layer-trigger` | `top 30%` | `center top` | 1 | `yPercent` |

scrub 场景统一 `ease: "none"`。非 scrub 的一次性入场用 `power2.out`。

## 与既有系统的边界

**与 CSS 动效的分工。** 首屏 `t-route-reveal` / `t-stagger` 保持不变——它们是路由进入动效，与滚动无关。ScrollTrigger 只接管 `story-problem` 及之后的章节。两套动效不叠加在同一元素上。

**与 WebGL 背景的分工。** `LoginTraceMap` 的液体折射背景（当前工作树中已存在的暂存改动，含 `liquid-effect-animation.tsx` 与 `threejs-components` 依赖）继续作为 `story-hero` 的背景层。叙事章节 SHALL NOT 各自新起 WebGL 上下文——单页多个 Three.js 上下文会撞浏览器上下文上限。滚动进入后续章节时降低其渲染负载。

**React 生命周期。** ScrollTrigger 实例必须在组件卸载时清理，否则 `/login` 与 `/app` 之间来回切换会累积僵尸 trigger。使用 `gsap.context()` 配合 `useEffect` 返回 `ctx.revert()`。

**SSR / 静态渲染安全。** `src/components/login-page-view.test.tsx` 用 `react-dom/server` 做静态渲染断言，GSAP 与 ScrollTrigger 都依赖 `window`。注册与实例化必须在 `useEffect` 内，不能在模块顶层。现有测试已用 `expect(markup).not.toContain('threejs-components')` 锁住同类边界，本次沿用该模式锁 `gsap`。

**reduced-motion 降级。** `prefers-reduced-motion: reduce` 时不注册任何 ScrollTrigger，章节以完整不透明度顺序静态呈现，spacer 高度收缩为内容高度。降级后信息完整——叙事靠顺序，动画只是节奏。

## 明确排除

- 不引入 `ScrollSmoother` / `Lenis` 等平滑滚动库。参考实现没用，且它们会劫持原生滚动、破坏移动端与 Capacitor WebView 的滚动手感。
- 不做全屏 snap 翻页。抽帧证明参考实现是连续滚动，snap 会打断阅读节奏。
- 不用 GSAP `pin`。见决策一。
- 不新增路由。`/login` 保持单一路由，符合 `app-shell` 既有约束。
- 不删除 `/demo/*`。只移除登录页 Demo CTA 入口。

## 2026-10-05 原生替代决策

不增加新的动画库或 GSAP 链接例外。CSS sticky 与 spacer、章节顺序、首屏 CSS 进入、独立 WebGL 背景、音乐及认证逻辑保持原有职责。scroll-story-motion.ts 的自有控制器通过被动 scroll/resize 监听读取布局区间，rAF 按时间戳追赶目标进度，保留 0.3/0.5/1 秒的层次；章节插值线性且可反向，错峰与三视图用分段进度。初次挂载直接同步恢复的滚动位置。

sticky 的视觉 rect 会停在视口顶部，故三视图区间从父章节布局锚点与 offsetTop 测量，不使用其固定后的 viewport top 计算。ResizeObserver、图片 load、字体 ready 和主题/语言变化触发重测，不重置滚动位置；静止时不持续申请动画帧。卸载取消 rAF、移除监听、断开观察器并逐项恢复自身接管的 opacity/transform。降低动效时不初始化控制器，既有 CSS 保证全部内容顺序可见。

替代验证以实际进度、反向、布局重测、静态渲染与清理行为为主，配合真实浏览器滚动和窄屏检查；不再用 GSAP import/config 源码文本作为回归合同。移除 GSAP 仅解决该依赖问题，不证明音乐或完整发行包的 AGPL 要求已经完成。
