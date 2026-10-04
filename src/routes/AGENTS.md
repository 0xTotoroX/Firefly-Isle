# src/routes/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
demo-flow.dom.test.tsx: 真实 App 装配的演示逐页零 Supabase/网络调用、偏好隔离、模式内导航与会话重置回归。
lab-analytics-page.dom.test.tsx: 验证指标加载/失败/真实空态互斥、重试读取同患者，以及携带 patient 参数进入化验上传。
record-saving.test.tsx: 真实 RecordPage 验证连续字段保存、失败后恢复、语言切换和迟到请求隔离。
workspace-state.test.tsx: 真实 React 生命周期下验证主题/语言状态、保存、账号切换、追问并发、初次提取仅重试保存，以及指定患者的化验保存后重读。
login-page.tsx: 登录页容器，负责认证表单与展示层接线；本次邮箱/匿名登录或带会话注册成功后 replace 到 Dashboard，避免留在失效回调或重置入口
login-page.logic.ts: 登录认证动作层，区分本次认证成功、注册待邮箱确认与 OAuth 跳转；统一 Supabase 调用、反馈和 redirect 参数
login-page.logic.test.ts: 登录认证动作回归，验证成功标记、注册待确认、重置邮件和 OAuth 分支
login-success.dom.test.tsx: 登录恢复的路由回归，验证错误回调后的显式成功、重置入口切回登录、历史替换、待确认注册与旧会话错误优先。
auth-callback-page.tsx: 公开 OAuth 回调路由；等待或交换 Supabase 会话，显式处理 query/hash 错误与失败恢复，成功后进入 /dashboard。
auth-callback-page.logic.ts: OAuth 回调动作层，负责 provider 错误归一、code exchange、session restore 与友好失败映射
auth-callback-page.logic.test.ts: OAuth 回调动作回归测试，约束 provider 错误优先、code exchange 优先于 getSession、已恢复 session 兼容、失败文案与无 session 回落
privacy-page.tsx: 独立隐私条款页，对应 /privacy，消费 V3 topbar、surface token 与克制 route/stagger 动效，复用共享隐私真相源并提供可访问政策说明
lab-analytics-page.tsx: 真实病历或 Demo 内存会话的患者指标编排，复用 LabAnalyticsDashboard，区分加载/失败/真实空态并携带患者上下文进入 /app 上传；不读取公开分享码。
lab-analytics-page.test.tsx: 指标页 Demo route 回归测试，约束 /demo/analytics 显示 Demo 模式提醒、模式内导航与完整血常规/血生化/肿瘤标志物数据
workspace-page.tsx: 临床工作区实现，对应 /app，在统一 system shell 与 surface token 上承载真实用户空白态、无自有病历时禁用病历/统计入口并提示先提取、文本/OCR 文件输入、自然语言修改、已有病历编辑/新病历提取分流、最多 3 轮追问、LLM 失败原因分流、解析失败重试、route reveal 根节点与独立 preview stagger 入场、经 patient-record-storage 恢复/持久化患者记录与实验室指标、匿名/非匿名会话身份展示、已有真实病历时的真实统计/病历入口、直接进入时间线主表面的报告预览、inline edit 持久化与工作区状态补丁 helpers，不承载正式 PDF/PNG 导出入口
workspace-page.test.tsx: 工作区报告区、真实治疗线预览、OCR 文件导入、OCR 文本确认、LLM provider 设置入口、自然语言编辑入口、单主按钮、输入 composer 工具行、全站动效合同、背景音 provider 壳层依赖、邮件 hover 联系弹窗与邮箱点击复制入口、移除侧栏状态卡、公开 Demo fallback 导航、主题/语言顺序、active 导航、病历/语言切换图标、匿名/非匿名身份图标、隐藏恢复胶囊、左缘渐进拉出、拖拽到隐藏、紧凑默认弹出宽度、locale 与 user.id 持久化回归测试，约束 dark/light 都不再渲染正式导出按钮、多余总标题壳、废弃控制块、装饰性运行状态卡、active 卡片高亮、边缘亮条、folder 病历图标、泛化语言图标、下拉误导箭头、过宽隐藏恢复按钮、旧侧栏宽度缓存污染、双语漂移或按 email/phone/provider 持久化病历
workspace-page-metrics.test.tsx: 工作区局部合同测试，约束已有病历编辑/新病历提取分流、失败追问回滚、OCR 失败不污染记录、OCR 确认文本归一、/app 姓名/性别/年龄/身高/体重展示且不渲染 BMI、姓名/证据/临床备注可编辑、Dense Clinical Ledger 预览、诊断日期前置、紧凑治疗时间线、最新检测摘要与既往检测历史，同时为 workspace-page.test.tsx 分担新增断言避免超过 800 行
demo-mode.logic.ts: 默认虚构病历的兼容读取入口，不接触 Supabase 或公开分享码。
demo-mode.logic.test.ts: 默认 fixture 的独立副本读取回归。
record-page.logic.ts: 病例详情 route 逻辑层，复用 patient-record-storage 的 patients/treatment_lines/lab_results 读取，并保留 active load-state 归一，不导出 React 组件
record-page.tsx: 真实/演示病历编排，共享字段编辑队列、档案/表格/Gantt、导出与患者导航；Demo 保存到内存，AI 和分享只作预览。
record-page.view.tsx: 共享档案/TimelineTable/Gantt、分析与分享内容组合，以及编辑、保存、导出和不可用状态。
record-page.test.tsx: 病例详情页平面阅读层、响应式版心、背景音 provider 壳层依赖、loader 源码合同、公开 Demo 完整产品预览、Demo 模式提醒、dossier/TimelineTable/Gantt 切换、AI 分析入口、分享预览、当前病历编辑工具条、保存状态、日期范围 patch、字段级 Supabase 保存边界、默认病例逐线档案、页头去重、癌种概要、年龄/性别/身高/体重/BMI/多段基因检测与免疫组化证据、BL/L 标记、时间线 rail 时间段/每线 PFS、标题旁线别小字隐藏、编号/标题/补充资料去重、全站动效与导出职责回归测试，约束 /record/:id 使用共享宽幅 shell、真实记录和 Demo PDF/PNG 可导出、默认虚构病例、TimelineTable/Gantt 不劫持导出且禁止回退到 980px 固定画布
shared-record-page.tsx: 公开只读分享页，对应 /share/:code，通过授权码状态加载单份 PatientRecord，复用 RecordDossier 但禁用编辑、导出和 AI 分析动作，页面根节点只消费 route reveal
shared-record-page.test.tsx: 分享页源码合同测试，约束 /share/:code 公开装配、授权码加载、过期/撤销/错误反馈与只读能力边界

follow-up-page.tsx: 随访状态与就诊记录的患者隔离页面，包含表单验证、保存重试、删除确认和上下文导航

follow-up-page.dom.test.tsx: 随访编辑、日期逆序、读取/写入失败、删除确认与患者切换的 DOM 回归

side-effects-page.tsx: 可恢复症状表单与记录列表；复诊摘要按持续时间相交取数，条件变化清空旧摘要

side-effects-page.dom.test.tsx: 症状 CRUD、摘要范围与失效、数据不完整、日期验证和患者切换的 DOM 回归

dashboard-page.tsx: 真实计数、逾期/今日随访、我的病历分页列表与分区错误恢复，列表独立加载并按账号隔离迟到响应

dashboard-page.dom.test.tsx: 真实计数、病历分页与患者链接、空态、失败重试、账号切换、导航及日历提醒的 DOM 回归

record-navigation.dom.test.tsx: 患者导航、默认折叠分享及方向键/Home/End 页签切换与焦点回归

auth-callback-pages.dom.test.tsx: 真实 React/Router 生命周期验证回调终态、错误优先、恢复凭据与表单重试，验证账号切换取消迟到密码提交。
donate-page.tsx: routes 的一次性捐赠页。功能全免费，这里只发起 Stripe payment checkout；未配置密钥时展示说明而不假装可支付。
models-page.dom.test.tsx: routes 的模型配置页 DOM 测试，约束目录条目渲染、DeepSeek v4 默认标记、自带密钥面板承载与设置页入口。
models-page.tsx: routes 的模型配置页，按 Codex++ 目录协议展示默认模型目录（文字 deepseek-v4-flash / 图像 deepseek-v4-image），并承载从工作区输入区迁移过来的自带密钥设置面板。
reset-password-page.tsx: /auth/reset-password 公共入口；链接/账号 key 隔离表单与迟到提交，不用浏览器会话替代有效链接。
settings-page.dom.test.tsx: routes 的账户设置 DOM 测试，验证账户身份展示、显示名称保存链路、语言/主题偏好即时应用与档案写入、档案服务缺失时的降级提示。
settings-page.tsx: 账户身份、档案和本地语言/主题/强调色偏好编排，提供完整 JSON 导出与确认词注销；Demo 仅预览，缺可选 profiles 表时明示本地降级。

法则: 路由页负责组合页面块；认证动作可局部抽离为同目录逻辑层，但不能绕过 Supabase Auth 或复制全局 session 状态机；分享页只能消费授权码换回的单份只读记录。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。

router-upgrade.dom.test.tsx: 真实 BrowserRouter 验证匿名守卫、患者链接、公开分享与认证回调。
升级兼容：SettingsPage 同时绑定 Demo 会话和真实账号，普通重渲染保留草稿，身份变化清空旧档案；症状摘要随范围/源数据/语言条件变化清除。
