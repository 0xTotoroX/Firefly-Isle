# src/components/login/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
types.ts: 登录展示层类型边界，定义 AuthMode、AuthMethod、AuthFeedback、LoginPageViewProps 与内部 V3LoginProps
skins.ts: 登录入口与认证卡视觉材料表，集中主题 token、背景资产和场景图片路径
auth-copy.ts: 认证模式文案选择器，从共享 copy 真相源派生登录、注册、重置密码标题与动作文案
auth-card.tsx: 认证卡展示邮箱、Google、匿名会话、隐私入口与反馈态；未接入的手机/微信控件不渲染，不触碰 Supabase
auth-overlay.tsx: 统一登录弹层容器，编排 AuthCard、modal/popover 弹出关闭动画、Esc 关闭和背景点击关闭
login-entry-view.tsx: 登录页入口编排层，渲染八章纵向叙事、首尾同源登录 CTA、唯一 AuthOverlay、route/stagger 首屏节奏、响应式全局工具区与仅在 reduced-motion 下禁用的长生命周期液体背景；不提供 Demo CTA
login-story-sections.tsx: hero 后七章叙事内容层，按问题、录入、时间线、三视图、实验室趋势、隐私边界、收束 CTA 顺序呈现已实现能力，并用 CSS sticky + sibling spacer 承载三视图几何
scroll-story-motion.ts: 登录页客户端滚动动效边界，只在 useEffect 内动态导入并注册 GSAP/ScrollTrigger，负责 scrub、refresh、gsap.context 卸载清理、reduced-motion 静态降级与首屏 WebGL 活跃状态
login-trace-map.tsx: 登录页唯一双主题海岸 WebGL 背景模块，保留静态兜底、线性氛围遮罩、极慢背景呼吸与鼠标/触摸水波折射色差；renderer 不随首屏可见性或主题切换重建，离屏暂停交给底层观察器

auth-card.dom.test.tsx: components/login 的认证卡 DOM 测试，验证受控输入回调、表单提交回调、提交禁用态、反馈块渲染与重置模式切换入口。

法则: facade 对外稳定；内容、滚动动效、背景和认证弹层各自单向依赖，认证状态只在入口编排层持有一次，叙事章节不创建 WebGL 上下文。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
