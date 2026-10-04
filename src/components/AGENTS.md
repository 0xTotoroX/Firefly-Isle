# src/components/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
app-shell.tsx: Dark/Light 共享壳层入口，导出 V3 顶部状态条、可变侧栏、匿名/非匿名会话身份展示、主题切换、认证出口与占位素材
analytics/: 实验室趋势统计展示组件目录，承载全产品 Demo 指标/AI 预览数据、分类指标索引、折线图、等价表格与监测面板；上传入口归 /app 输入区
background-music-toggle.tsx: 全局背景音乐共享控件，消费 BackgroundAudioProvider 状态并以可访问标签表达播放、暂停、拦截、不可用、当前曲目、上一首/下一首、control press、紧凑顶栏直接切换、hover 播放器弹层与按钮到弹层桥接层
background-music-toggle.test.tsx: 背景音乐控制入口回归测试，约束登录页工具区与 authenticated top bar 共用同一音乐开关、曲目标题、切歌语义、暂停文案、紧凑顶栏直接切换、hover 弹层触发与桥接层合同
login/: 登录页展示层内部模块，收敛类型、skin、认证卡、统一弹层、八章叙事内容、客户端 ScrollTrigger 编排与唯一液体折射背景；登录页不再提供 Demo CTA，公开 Demo 路由仍由路由层维护
login-page-view.tsx: 登录页稳定 facade，继续导出 LoginPageView 与 AuthMode/AuthMethod/AuthFeedback/LoginPageViewProps，内部转交 components/login 实现
login-page-view.test.tsx: 登录页八章顺序、无 Demo CTA、首尾同源 AuthOverlay、双主题、认证模式、SSR 安全 ScrollTrigger、CSS sticky + spacer、reduced-motion 与单一 WebGL 背景合同测试；Demo 路由可达性由路由/Demo 测试继续负责
privacy-gate.tsx: 首次使用隐私门控层，负责 localStorage 确认状态、独立隐私页放行与可滚动全屏阻塞弹层
record/: 病例详情展示层内部模块，收敛 dossier 展示、文案、demo 数据、真实病历派生数据与展示类型
system/: 设计系统壳层、品牌 mark、Demo 模式提醒、PWA 网络状态提示与 surface 基元目录，统一 sidebar、top bar、panel、邮件 hover 联系弹窗与 section 结构语义
timeline/: 时间线表格与甘特图组件目录，收敛 TimelineTable、基本信息区块、初发区块、治疗线区块渲染与 treatmentLines 甘特投影
theme-toggle.tsx: 全局主题切换入口，供壳层头部复用且只负责 theme 状态
locale-toggle.tsx: 全局语言切换入口，与 ThemeToggle 并列复用但只负责 locale 状态
ui/: 本地 shadcn/Radix Button 与独立 WebGL 背景封装；不是完整 shadcn 组件库，来源配置见根 components.json
workspace/: 临床工作区 feature 组件目录，统一输入区、追问补充区与报告预览骨架

error-boundary.dom.test.tsx: components 的错误边界 DOM 测试，验证子树渲染崩溃时降级 UI 可见、重载按钮触发整页刷新、正常子树不受影响。
error-boundary.test.ts: components 的错误边界合同测试，约束边界不消费 Theme/Locale 上下文、始终提供整页重载恢复路径，并保持双语文案走 copy 字典。
error-boundary.tsx: components 的全局渲染崩溃护栏，捕获子树渲染错误并给出可恢复降级 UI；禁止消费 Theme/Locale 上下文，保证崩溃发生在 Provider 层时护栏自身仍可渲染。
privacy-gate.dom.test.tsx: components 的隐私门控 DOM 测试，验证未同意时渲染遮罩、同意动作持久化到 localStorage、隐私页路径绕过门控。

法则: 组件只表达结构与交互骨架，不承载数据持久化决策。

来源边界: system/ 与业务目录以现有自研组件为主，Radix 提供部分交互基元；Lucide 与本地 Material Symbols 并用。归档设计稿和 Open Design 原型不自动成为生产组件来源，新布局的组件清单及映射尚待确认。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
