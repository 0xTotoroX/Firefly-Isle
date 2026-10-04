## 1. 参考实现取证与决策固化

- [x] 1.1 从 32 秒录屏抽帧确认参考实现是纵向连续滚动，而非横向轮播或 snap 翻页
- [x] 1.2 抓取 `https://vibehub.icu/` 线上产物，确认动画栈为 GSAP + ScrollTrigger
- [x] 1.3 提取参考实现真实 `start`/`end`/`scrub` 配置与章节 id 序列
- [x] 1.4 确认参考实现零 `pin`、零平滑滚动库，改用 CSS sticky + 高 spacer
- [x] 1.5 把上述事实与三个设计决策写入 `design.md`
- [x] 1.6 写 proposal 与 app-shell / demo-mode / theme-system / scroll-story-landing delta 规格

## 2. 依赖与基础设施

- [x] 2.1 安装 `gsap` 固定版本，确认与既有 `three` / `threejs-components` 无冲突
- [x] 2.2 建立 ScrollTrigger 注册边界模块：只在客户端副作用中 `registerPlugin`
- [x] 2.3 确认 `npm run build` 产物体积变化可接受，记录增量

## 3. 叙事结构落地

- [x] 3.1 把 `login-entry-view.tsx` 从单屏编排改为叙事容器，首屏内容迁为 `story-hero`
- [x] 3.2 移除 `IntroDemoCta` 与 `data-testid="login-demo-cta"`
- [x] 3.3 新增 `story-problem` / `story-intake` / `story-timeline` 章节，内容对齐 `patient-record`、`info-extraction`
- [x] 3.4 新增 `story-views` sticky 分层章节，呈现档案/TimelineTable/Gantt 三视图切换
- [x] 3.5 新增 `story-labs` 章节，呈现分组趋势与标志物上升提醒的非诊断表达
- [x] 3.6 新增 `story-boundary` 章节，呈现隐私优先、非诊断、只读分享与授权码撤销
- [x] 3.7 新增 `story-cta` 收束章节，复用同一 `IntroAccessCta` 与 `AuthOverlay`
- [x] 3.8 保持首屏 `t-route-reveal` / `t-stagger` 不变，确认无元素被双动效驱动

## 4. 滚动动效编排

- [x] 4.1 按 `design.md` 参数映射表实现各章节 ScrollTrigger，scrub 场景统一 `ease: "none"`
- [x] 4.2 实现 sticky + spacer 分层推进，不使用 GSAP `pin`
- [x] 4.3 用 `gsap.context()` 包裹，`useEffect` 返回 `ctx.revert()` 保证卸载清理
- [x] 4.4 主题切换与语言切换后调用 `ScrollTrigger.refresh()`，且不重置滚动位置
- [x] 4.5 实现 reduced-motion 分支：不注册 trigger、章节全可见、spacer 收缩
- [x] 4.6 确认 `story-hero` 之后章节不新建 WebGL 上下文，滚离首屏后降低背景渲染负载

## 5. 文档与架构同步

- [x] 5.1 更新 `src/components/login/AGENTS.md` 与新增模块的文件职责注释
- [x] 5.2 更新 `DESIGN.md` / `docs/design/Image-2/V3/DESIGN.md` 的登录页视觉契约
- [x] 5.3 更新 `openspec/changes/AGENTS.md` 变更地图
- [x] 5.4 更新 `src/styles/transitions-dev.css` reduced-motion 收敛清单覆盖新增叙事类

## 6. 验证

- [x] 6.1 改写 `login-page-view.test.tsx`：Demo CTA 断言改为断言不存在
- [x] 6.2 新增测试锁章节顺序契约与首尾 CTA 同源
- [x] 6.3 新增测试锁静态渲染产物不含 gsap 运行时标识
- [x] 6.4 新增测试锁 sticky + spacer 实现且源码无 `pin:` 配置
- [x] 6.5 浏览器验证 dark / light 双主题完整滚动叙事，逐章截图存 `work/`
- [x] 6.6 浏览器验证反向滚动动画可逆、窄屏 390px 无横向溢出
- [x] 6.7 浏览器验证 reduced-motion 降级后信息完整可读
- [x] 6.8 验证反复进出 `/login` 无 ScrollTrigger 实例累积
- [x] 6.9 运行 `npm run test`、`npm run lint`、`npm run type-check`、`npm run build`
