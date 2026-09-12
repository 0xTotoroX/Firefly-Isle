# src/routes/
> L2 | 父级: /src/CLAUDE.md

成员清单
CLAUDE.md: 说明页面骨架文件、公开/受保护路由与设计预览隔离职责，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
login-page.tsx: 登录页容器，对应 /login，负责邮箱登录、注册、重置密码、手机/微信敬请期待占位、Google OAuth、匿名会话、主题选择与展示层接线，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
login-page.logic.ts: 登录页认证动作层，收敛 Supabase Auth 调用、反馈文案、无邮箱确认注册会话要求、密码重置 redirect 与 OAuth redirect 参数，Google redirect 指向公共 /auth/callback 并请求账号选择器，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
login-page.logic.test.ts: 登录页认证动作回归测试，约束邮箱登录、注册必须返回 session、重置密码、匿名登录与 Google OAuth 的 Supabase 调用、公共 callback URL、账号选择 prompt 和反馈分支，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
auth-callback-page.tsx: OAuth 公共回调页，对应 /auth/callback，先恢复 Supabase session，再由路由守卫进入 /app 或回落 /login，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
auth-callback-page.logic.ts: OAuth 回调动作层，负责 provider 错误归一、code exchange、session restore 与友好失败映射，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
auth-callback-page.logic.test.ts: OAuth 回调动作回归测试，约束 provider 错误优先、code exchange 优先于 getSession、已恢复 session 兼容、失败文案与无 session 回落，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
privacy-page.tsx: 独立隐私条款页，对应 /privacy，消费 V3 topbar、surface token 与克制 route/stagger 动效，复用共享隐私真相源并提供可访问政策说明，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-analytics-page.tsx: 实验室趋势统计页，对应公开 /demo/analytics 与受保护 /analytics/:id、/analytics/demo，按 Demo/真实路由 id 读取真实病历、可选 Supabase 公开 Demo 病历或 demo lab fixture，显示 Demo 模式提醒，以纵向统计控制台承载只读趋势展示，并把文件上传入口交还 /app 输入区；页面根节点只消费 route reveal，子内容按需独立 stagger，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-analytics-page.test.tsx: 指标页 Demo route 回归测试，约束 /demo/analytics 显示 Demo 模式提醒、模式内导航与完整血常规/血生化/肿瘤标志物数据，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
brand-lockup-preview-page.tsx: 品牌锁定组合预览页，对应 /brand-lockup-preview，组合带 stagger/selection pulse 的 6 套侧栏品牌区候选并展示 full-label、icon-only、dark、light 四态供选择，不替换生产侧栏，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
brand-lockup-preview-page.test.tsx: 品牌锁定组合预览页回归测试，约束 6 套候选、light/dark、full-label/icon-only 四态标识与预览动效合同同时存在，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
design-preview-page.tsx: 隔离 V4 视觉评估页，对应公开 /design-preview，用同一虚构病历、同一 DOM 与本地状态比较 Clinical Calm / Firefly Glass / Living Archive 的 Light/Dark 材质，不读取远端患者数据、不写全局主题且不进入正式导航，[PROTOCOL]: 变更候选、数据结构、控件或路由边界时更新此头部、V4 DESIGN.md 与 CLAUDE.md
design-preview-page.test.tsx: V4 视觉评估页静态渲染与源码合同测试，约束三候选、共享内容、默认推荐、原生 pressed 控件、lazy 路由、正式导航隔离、样式分层、移动溢出与 reduced-motion 合同，[PROTOCOL]: 变更预览路由或样式边界时更新此头部，然后检查 CLAUDE.md
workspace-page.tsx: 临床工作区实现，对应 /app，在统一 system shell 与 surface token 上承载真实用户空白态、无自有病历时禁用病历/统计入口并提示先提取、文本/OCR 文件输入、自然语言修改、已有病历编辑/新病历提取分流、最多 3 轮追问、LLM 失败原因分流、解析失败重试、route reveal 根节点与独立 preview stagger 入场、经 patient-record-storage 恢复/持久化患者记录与实验室指标、匿名/非匿名会话身份展示、已有真实病历时的真实统计/病历入口、直接进入时间线主表面的报告预览、inline edit 持久化与工作区状态补丁 helpers，不承载正式 PDF/PNG 导出入口，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
workspace-page.test.tsx: 工作区报告区、真实治疗线预览、OCR 文件导入、OCR 文本确认、LLM provider 设置入口、自然语言编辑入口、单主按钮、输入 composer 工具行、全站动效合同、背景音 provider 壳层依赖、邮件 hover 联系弹窗与邮箱点击复制入口、移除侧栏状态卡、公开 Demo fallback 导航、主题/语言顺序、active 导航、病历/语言切换图标、匿名/非匿名身份图标、隐藏恢复胶囊、左缘渐进拉出、拖拽到隐藏、紧凑默认弹出宽度、locale 与 user.id 持久化回归测试，约束 dark/light 都不再渲染正式导出按钮、多余总标题壳、废弃控制块、装饰性运行状态卡、active 卡片高亮、边缘亮条、folder 病历图标、泛化语言图标、下拉误导箭头、过宽隐藏恢复按钮、旧侧栏宽度缓存污染、双语漂移或按 email/phone/provider 持久化病历，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
workspace-page-metrics.test.tsx: 工作区局部合同测试，约束已有病历编辑/新病历提取分流、失败追问回滚、OCR 失败不污染记录、OCR 确认文本归一、/app 姓名/性别/年龄/身高/体重展示且不渲染 BMI、姓名/证据/临床备注可编辑、Dense Clinical Ledger 预览、诊断日期前置、紧凑治疗时间线、最新检测摘要与既往检测历史，同时为 workspace-page.test.tsx 分担新增断言避免超过 800 行，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
demo-mode.logic.ts: 公开 Demo 数据源逻辑层，优先通过 `VITE_DEMO_RECORD_SHARE_CODE` 和授权码只读边界读取 Supabase Demo 病历，缺配置/失效/不完整时回退本地完整 fixture，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
demo-mode.logic.test.ts: Demo 数据源回归测试，约束缺分享码、缺 Supabase env、active 分享码、撤销/过期/不可用、不完整远端记录与异常失败时的读取/降级行为，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-page.logic.ts: 病例详情 route 逻辑层，复用 patient-record-storage 的 patients/treatment_lines/lab_results 读取，并保留 active load-state 归一，不导出 React 组件，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-page.tsx: 档案详情 route 编排层，对应公开 /demo/record 与受保护 /record/:id，只负责 Demo/真实 params、可选 Supabase 公开 Demo 数据加载、locale/theme、加载状态、视图状态、授权码分享状态、Demo 模式提醒、Demo 分享预览、AI 分析状态、Demo 静态分析预览、页面级图表/表格编辑状态、字段级 Supabase 保存状态、导出状态、根节点 route reveal 与内部视图动效、shell 与 record-page.view 组合，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-page.view.tsx: 档案详情内容组合层，隔离 dossier/TimelineTable/Gantt 文字页签、真实分享 disclosure、Demo 折叠分享预览、AI 分析面板、轻量编辑工具条、保存状态和 record-view 动效、demo-record 当前态、demo-only 甘特补充资料、不可用态与导出目标边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
record-page.test.tsx: 病例详情页平面阅读层、响应式版心、背景音 provider 壳层依赖、loader 源码合同、公开 Demo 完整产品预览、Demo 模式提醒、dossier/TimelineTable/Gantt 切换、AI 分析入口、分享预览、当前病历编辑工具条、保存状态、日期范围 patch、字段级 Supabase 保存边界、默认病例逐线档案、页头去重、癌种概要、年龄/性别/身高/体重/BMI/多段基因检测与免疫组化证据、BL/L 标记、时间线 rail 时间段/每线 PFS、标题旁线别小字隐藏、编号/标题/补充资料去重、全站动效与导出职责回归测试，约束 /record/:id 使用共享宽幅 shell、真实记录和 Demo PDF/PNG 可导出、默认乳腺癌病例、TimelineTable/Gantt 不劫持导出且禁止回退到 980px 固定画布，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
shared-record-page.tsx: 公开只读分享页，对应 /share/:code，通过授权码状态加载单份 PatientRecord，复用 RecordDossier 但禁用编辑、导出和 AI 分析动作，页面根节点只消费 route reveal，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
shared-record-page.test.tsx: 分享页源码合同测试，约束 /share/:code 公开装配、授权码加载、过期/撤销/错误反馈与只读能力边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

follow-up-page.tsx: 随访状态与就诊记录的患者隔离页面，包含表单验证、保存重试、删除确认和上下文导航，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

follow-up-page.dom.test.tsx: 随访编辑、日期逆序、读取/写入失败、删除确认与患者切换的 DOM 回归，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

side-effects-page.tsx: 可恢复症状表单与记录列表；复诊摘要按持续时间相交取数，条件变化清空旧摘要，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

side-effects-page.dom.test.tsx: 症状 CRUD、摘要范围与失效、数据不完整、日期验证和患者切换的 DOM 回归，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

dashboard-page.tsx: 紧凑双列移动总览、逾期/今日随访提示、最近病历快捷入口和分区错误恢复，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

dashboard-page.dom.test.tsx: 真实计数、空态引导、分区失败恢复和日历提醒文案的 DOM 回归，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

record-navigation.dom.test.tsx: 患者导航、默认折叠分享及方向键/Home/End 页签切换与焦点回归，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 路由页负责组合页面块；认证动作可局部抽离为同目录逻辑层，但不能绕过 Supabase Auth 或复制全局 session 状态机；分享页只能消费授权码换回的单份只读记录。
