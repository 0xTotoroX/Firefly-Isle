<!--
 * [INPUT]: 依赖 2026-05-05 时点 docs/products/product-priority-roadmap.md 的 14 项产品路线图快照。
 * [OUTPUT]: 对外提供历史 Goal Forge 草案、候选 done_when、执行边界与验证回路归档。
 * [POS]: docs/products/archive 的历史计划证据，不再作为当前产品执行入口。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# 产品 Goal 草案集（2026-05-05 归档）

状态：ARCHIVED。本文保留 2026-05-05 的 Goal Forge 草案原貌；其中前 5 项后来已进入 OpenSpec archive 与 baseline specs。当前执行顺序以 `docs/products/product-priority-roadmap.md` 为准，不从本文直接启动 `/goal`。

共享执行规则（历史原文）：

- 先读 `CLAUDE.md`、`docs/products/product-priority-roadmap.md` 与相关 `openspec/specs/**/spec.md`。
- 先创建或更新 OpenSpec change，再实施代码，完成后同步 baseline specs 与 CLAUDE.md。
- 保留无关工作区改动，不回滚用户已有变更。
- 优先使用 `rg` 搜索，手写编辑使用 `apply_patch`。
- 先跑聚焦测试，再跑 `npm run test`、`npm run lint`、`npm run build` 中与变更范围匹配的命令。

## 01 add-medical-document-ocr

<goal>
在 Firefly-Isle 中实现上传 / 拍照纸质病历识别，把图片或 PDF 中的病历文字提取为可进入现有结构化病历流程的输入。
</goal>

<context>
先读 `openspec/specs/info-extraction/spec.md`、`src/routes/workspace-page.tsx`、`src/components/workspace/extraction-composer.tsx`、`src/lib/extraction.ts`、`supabase/functions/`。用 `rg "upload|OCR|暂未开放|file|voice|extract" src supabase openspec` 找当前占位入口。
</context>

<constraints>
不得把 OCR key 暴露到前端公开变量。第一版只支持病历图片 / PDF 转文本并进入现有提取链路，不同时实现血液趋势模型。上传失败必须可恢复，不能污染已有 PatientRecord。
</constraints>

<done_when_candidate>
- 用户在 `/app` 能上传图片或 PDF，并看到识别出的原始文本。
- 识别文本能触发现有 `extractPatientRecord` 流程并生成 / 合并 PatientRecord。
- 上传失败、文件类型不支持、OCR 失败都有中文与英文反馈。
- 新增 OpenSpec change 与对应测试；相关聚焦测试、`npm run test`、`npm run build` 通过。
</done_when_candidate>

<workflow>
1. 新建 `add-medical-document-ocr` OpenSpec change。
2. 设计 OCR 边界：前端只上传，服务端或 Edge Function 调 OCR。
3. 接入 composer 上传入口，展示识别文本确认态。
4. 将确认后的文本送入现有结构化提取流程。
5. 补测试、更新 CLAUDE.md 与 specs。
</workflow>

<verification_loop>
运行上传组件测试、提取流程测试、Edge Function 单元测试；手动验证图片成功、PDF 成功、错误类型失败、匿名 / 登录用户都不越权。
</verification_loop>

<output_contract>
输出 OpenSpec change、实现代码、测试、文档更新与最终验证摘要。
</output_contract>

## 02 add-lab-result-trends

<goal>
实现血常规、血生化、肿瘤标志物的结构化识别、趋势表格与异常持续增高高亮。
</goal>

<context>
先读 `openspec/specs/patient-record/spec.md`、`openspec/specs/supabase-schema/spec.md`、`src/types/patient.ts`、`supabase/migrations/001_init.sql`。用 `rg "lab|marker|blood|tumor|trend|indicator|血" src openspec supabase` 确认无现成模型。
</context>

<constraints>
实验室指标应作为独立结构，不塞进 `treatmentLines`。第一版只做趋势展示与异常提示，不给出诊断结论。异常阈值必须有可配置来源或明确默认表，不写死在多个组件里。
</constraints>

<done_when_candidate>
- PatientRecord 或关联表能保存多次实验室指标记录。
- `/record/:id` 能显示趋势表格，异常持续增高有可见高亮。
- OCR / 手动录入后的指标能进入同一数据结构。
- RLS 隔离实验室记录；迁移、类型、测试、spec 均更新。
</done_when_candidate>

<workflow>
1. 新建 `add-lab-result-trends` OpenSpec change。
2. 设计指标数据模型、阈值来源、数据库迁移。
3. 实现提取 / 录入到趋势数据的合并逻辑。
4. 实现趋势表格与异常高亮。
5. 补数据模型、RLS、渲染和导出相关测试。
</workflow>

<verification_loop>
运行 migration 测试、类型测试、趋势渲染测试；手动构造正常、单次异常、连续异常、缺日期四类记录。
</verification_loop>

<output_contract>
输出数据模型、迁移、趋势 UI、测试、OpenSpec 与文档变更。
</output_contract>

## 03 add-conversational-record-editing

<goal>
实现输入框中的自然语言病历修改，让用户用一句话修改已有 PatientRecord，而不是逐格编辑。
</goal>

<context>
先读 `openspec/specs/editing/spec.md`、`src/lib/extraction.ts`、`src/lib/extractionPrompt.ts`、`src/routes/workspace-page.tsx`、`src/components/workspace/follow-up-panel.tsx`。
</context>

<constraints>
修改必须合并到现有 PatientRecord，不新建第二份记录。LLM 返回必须经过 schema 校验与 merge 逻辑。用户明确修改某字段时，不得覆盖未提及字段。
</constraints>

<done_when_candidate>
- 用户在 `/app` 对已有记录输入修改指令后，目标字段被更新。
- 未提及字段保持不变。
- 修改前后有可见反馈，失败可重试。
- 覆盖 regimen、startDate、endDate、basicInfo 与 initialOnset 的测试通过。
</done_when_candidate>

<workflow>
1. 新建 `add-conversational-record-editing` OpenSpec change。
2. 扩展 prompt，区分初次提取、追问补全、修改指令。
3. 强化 merge 规则与字段级目标定位。
4. 接入 workspace 输入框状态。
5. 补回归测试和文档。
</workflow>

<verification_loop>
运行 extraction 相关测试、workspace 渲染测试；手动验证“把二线治疗改为 X”“补充诊断日期”“删除错误结束日期”等场景。
</verification_loop>

<output_contract>
输出修改模式实现、测试、OpenSpec、文档与验证摘要。
</output_contract>

## 04 add-record-treatment-gantt-view

<goal>
在 `/record/:id` 正式档案页新增治疗线甘特图视图，把 treatmentLines 投影为治疗持续时间、换线节点与当前治疗线。
</goal>

<context>
先读 `src/routes/record-page.tsx`、`src/components/timeline/TimelineTable.tsx`、`src/components/timeline/CLAUDE.md`、`src/types/patient.ts`、`openspec/specs/timeline-table/spec.md`、`openspec/specs/export/spec.md`。
</context>

<constraints>
不新增治疗线数据结构，不引入重型甘特图库作为第一版。甘特图组件放在 `src/components/timeline/`，路由页只组合视图。第一版只在 `/record/:id`，不进入 `/app`。
</constraints>

<done_when_candidate>
- `/record/:id` 有“档案视图 / 甘特图视图”切换。
- 甘特图按 `lineNumber` 展示每条治疗线，startDate/endDate 映射为横向 bar。
- 缺失日期显示为“日期待补充”，不画假时间。
- demo 与真实记录都能渲染；PDF/PNG 导出行为不回退。
- 新组件测试、record-page 测试、lint/build 通过。
</done_when_candidate>

<workflow>
1. 新建 `add-record-treatment-gantt-view` OpenSpec change。
2. 提取治疗线甘特数据归一化函数。
3. 新增 `TreatmentGanttView` 组件。
4. 在 record page 接入视图切换。
5. 更新 timeline CLAUDE.md、spec 与测试。
</workflow>

<verification_loop>
运行 `record-page.test.tsx`、timeline 相关测试、`npm run lint`、`npm run build`；手动检查多线、缺 startDate、缺 endDate、无治疗线四种记录。
</verification_loop>

<output_contract>
输出甘特图组件、路由接入、测试、OpenSpec 与文档更新。
</output_contract>

## 05 add-user-llm-provider-settings

<goal>
实现多平台 LLM API 适配与用户自填 API：Gemini、Claude、OpenAI、GLM、DeepSeek、Kimi 与自定义 OpenAI 风格接口，同时保留系统默认 DeepSeek。
</goal>

<context>
先读 `openspec/specs/llm-adapter/spec.md`、`src/lib/llm/**`、`supabase/functions/llm-proxy/**`、`supabase/migrations/001_init.sql`、`src/routes/workspace-page.tsx`、`wrangler.jsonc`。
</context>

<constraints>
用户 API key 不得进入前端公开变量。预设平台只让用户填 key，base URL 与协议适配由系统维护。自定义平台必须填写 base URL、API key 与模型名，并只承诺 OpenAI 风格 chat/completions 最小兼容。默认仍使用项目方 DeepSeek。
</constraints>

<done_when_candidate>
- 用户可在设置入口选择系统默认 DeepSeek 或自带 provider。
- Gemini、Claude、OpenAI、GLM、DeepSeek、Kimi 有预设配置表。
- 自定义 provider 支持 base URL、API key、model。
- API key 服务端加密存储并受 RLS 保护。
- llm-proxy 能按用户设置路由；无用户设置时回落默认 DeepSeek。
- 单元测试覆盖 provider 选择、fallback、自定义 URL 校验与密钥不外泄。
</done_when_candidate>

<workflow>
1. 新建 `add-user-llm-provider-settings` OpenSpec change。
2. 设计 provider 配置表、密钥存储与读取边界。
3. 扩展 llm-proxy provider adapter。
4. 实现用户设置 UI 与保存逻辑。
5. 补安全、fallback、协议适配测试。
</workflow>

<verification_loop>
运行 llm adapter 测试、Supabase RLS / migration 测试、设置 UI 测试；手动验证默认 DeepSeek、自带 key、自定义 URL、错误 key 四条路径。
</verification_loop>

<output_contract>
输出 provider 设置功能、数据库迁移、Edge Function 更新、测试、OpenSpec 与安全说明。
</output_contract>

## 06 add-clinical-ai-analysis

<goal>
实现 AI 助理分析治疗方案和血液指标，在已有结构化病历与趋势数据上生成辅助分析。
</goal>

<context>
先读 `openspec/specs/info-extraction/spec.md`、`openspec/specs/llm-adapter/spec.md`、未来 lab trends spec、`src/lib/extractionPrompt.ts`、`src/routes/record-page.tsx`。
</context>

<constraints>
输出必须是辅助信息，不给出确定诊断或治疗指令。分析必须基于当前 PatientRecord 与 lab trends，不读取用户无权记录。没有实验室趋势时降级为治疗线摘要。
</constraints>

<done_when_candidate>
- `/record/:id` 展示 AI 分析区，区分治疗线分析与指标趋势分析。
- 分析请求走 llm-proxy，并带明确免责声明。
- 缺少 lab trends 时显示降级分析。
- 测试覆盖 prompt 生成、权限、加载、失败与空数据。
</done_when_candidate>

<workflow>
1. 新建 `add-clinical-ai-analysis` OpenSpec change。
2. 定义分析 prompt 与输出 schema。
3. 接入 record page 分析区。
4. 实现缓存或手动刷新策略。
5. 补测试与文档。
</workflow>

<verification_loop>
运行 llm prompt 测试、record page 测试；手动验证有趋势、无趋势、LLM 失败、无权限记录。
</verification_loop>

<output_contract>
输出分析 UI、服务调用、测试、OpenSpec 与风险边界说明。
</output_contract>

## 07 add-secure-record-sharing

<goal>
实现加密分享 / 授权码分享，让用户可把单份病历以受控方式分享给家属或医生查看。
</goal>

<context>
先读 `openspec/specs/auth/spec.md`、`openspec/specs/supabase-schema/spec.md`、`openspec/specs/export/spec.md`、`src/routes/record-page.tsx`、`supabase/migrations/001_init.sql`。
</context>

<constraints>
分享链接必须有过期或撤销机制。授权码不得暴露原始 user id。分享访问只读，不能修改原记录。不要绕过 RLS。
</constraints>

<done_when_candidate>
- 用户能为某个 record 生成分享链接或授权码。
- 被分享者只能查看授权记录，不能查看其他记录或编辑。
- 用户能撤销分享。
- 过期、错误授权码、撤销后访问都有明确反馈。
- RLS / 路由 / UI 测试覆盖访问边界。
</done_when_candidate>

<workflow>
1. 新建 `add-secure-record-sharing` OpenSpec change。
2. 设计 share token / authorization code 数据模型。
3. 实现分享创建、撤销、读取路由。
4. 接入 record page 分享入口。
5. 补权限和失效测试。
</workflow>

<verification_loop>
运行 Supabase policy 测试、record route 测试；手动验证正常分享、撤销、过期、错误码。
</verification_loop>

<output_contract>
输出分享数据模型、路由、UI、测试、OpenSpec 与权限说明。
</output_contract>

## 08 restore-minimal-timeline-table-view

<goal>
把一页极简表格 / TimelineTable 重新纳入主链路，让用户可在 V3 档案视图之外查看 PRD 风格的一页表格。
</goal>

<context>
先读 `src/components/timeline/TimelineTable.tsx`、`src/components/workspace/report-preview-frame.tsx`、`src/routes/record-page.tsx`、`openspec/specs/timeline-table/spec.md`。
</context>

<constraints>
不替换现有 V3 档案页，只新增清晰视图入口。TimelineTable 仍以 PatientRecord 为唯一数据源。不要复制一套编辑逻辑。
</constraints>

<done_when_candidate>
- `/record/:id` 或指定主链路中有极简表格视图入口。
- TimelineTable 能渲染真实 record，并保持关键缺失字段高亮。
- 视图切换不破坏甘特图和正式导出。
- 测试覆盖非晚期、确诊即晚期、复发晚期三类患者。
</done_when_candidate>

<workflow>
1. 新建 `restore-minimal-timeline-table-view` OpenSpec change。
2. 确认视图入口位置。
3. 复用 TimelineTable，并补齐真实记录接线。
4. 调整导出边界。
5. 补测试和文档。
</workflow>

<verification_loop>
运行 timeline table 测试、record page 测试；手动验证三类患者和导出入口。
</verification_loop>

<output_contract>
输出视图接入、测试、OpenSpec 与文档更新。
</output_contract>

## 09 enable-wechat-login

<goal>
启用微信登录，把现有 Cloudflare Pages Functions 适配层从预工作推进到前端可用入口。
</goal>

<context>
先读 `openspec/specs/auth/spec.md`、`functions/`、`wrangler.jsonc`、`src/routes/login-page.tsx`、`src/components/login-page-view.tsx`、`src/routes/login-page.logic.ts`。
</context>

<constraints>
不得把 WeChat AppSecret 或 adapter signing key 暴露给前端。必须保留 Supabase OAuth state 与 PKCE。没有真实微信开放平台配置时，提供可测试的失败反馈，不伪装成功。
</constraints>

<done_when_candidate>
- 登录页微信入口从“敬请期待”变为可点击登录。
- Cloudflare adapter 正确生成微信 QR OAuth 跳转。
- 回调后能恢复 Supabase session 或显示友好失败。
- 测试覆盖 state/PKCE 保留、错误回调、缺配置。
</done_when_candidate>

<workflow>
1. 新建 `enable-wechat-login` OpenSpec change。
2. 审计现有 adapter 与登录 UI。
3. 接通登录动作与回调恢复。
4. 加配置缺失保护。
5. 补测试、更新部署说明。
</workflow>

<verification_loop>
运行 auth logic 测试、functions 测试、build；手动验证缺配置失败路径与真实配置路径。
</verification_loop>

<output_contract>
输出微信登录 UI、adapter 接线、测试、OpenSpec 与配置说明。
</output_contract>

## 10 add-phone-otp-login

<goal>
实现手机验证码登录，使用户可通过手机号接收验证码并登录。
</goal>

<context>
先读 `openspec/specs/auth/spec.md`、`src/components/login-page-view.tsx`、`src/routes/login-page.logic.ts`、Supabase Auth 当前配置说明。
</context>

<constraints>
验证码发送必须考虑频率限制和错误反馈。不得在前端保存验证码。第一版只做登录 / 注册统一 OTP，不做账号合并复杂流程。
</constraints>

<done_when_candidate>
- 登录页手机号入口可输入手机号、发送验证码、提交验证码。
- 发送中、倒计时、错误、成功状态清晰。
- Supabase phone OTP 调用被测试覆盖。
- 未配置短信服务时显示可理解错误。
</done_when_candidate>

<workflow>
1. 新建 `add-phone-otp-login` OpenSpec change。
2. 设计手机号表单与状态机。
3. 接入 Supabase OTP 发送和验证。
4. 处理限流和缺配置。
5. 补 UI 与 logic 测试。
</workflow>

<verification_loop>
运行 login page logic / view 测试；手动验证发送、倒计时、错误验证码、缺配置。
</verification_loop>

<output_contract>
输出手机 OTP 登录、测试、OpenSpec 与配置说明。
</output_contract>

## 11 add-msd-health-query

<goal>
新增 MSD 健康查询入口，为用户提供外部医学内容检索或跳转能力。
</goal>

<context>
先读 `docs/products/archive/prd.md`、`src/routes/workspace-page.tsx`、`src/routes/record-page.tsx`、现有导航与 sidebar 组件。
</context>

<constraints>
第一版不抓取或重发布版权内容。若只是外链，必须清楚标识离开本站。若做检索代理，必须确认来源许可与免责声明。
</constraints>

<done_when_candidate>
- 产品中有清晰 MSD 健康查询入口。
- 用户可基于疾病关键词打开外部查询或站内安全检索。
- 外部内容边界、免责声明与错误状态可见。
- 测试覆盖入口渲染、语言文案和空关键词。
</done_when_candidate>

<workflow>
1. 新建 `add-msd-health-query` OpenSpec change。
2. 决定外链模式还是许可检索模式。
3. 接入导航或 record page 辅助区。
4. 补免责声明与语言文案。
5. 补测试和文档。
</workflow>

<verification_loop>
运行路由 / 组件测试；手动验证中文、英文、关键词为空、外部跳转。
</verification_loop>

<output_contract>
输出查询入口、文案、测试、OpenSpec 与版权边界说明。
</output_contract>

## 12 add-warm-companion-surfaces

<goal>
实现每日鼓励语、许愿墙与拥抱动画欢迎页组成的温暖陪伴体验，但不干扰病历主链路。
</goal>

<context>
先读 `src/routes/login-page.tsx`、`src/components/login-page-view.tsx`、`src/components/app-shell.tsx`、`src/lib/copy.ts`、当前主题系统 specs。
</context>

<constraints>
温暖体验不得遮挡主工作流、不得要求用户先互动才能进入病历功能。许愿墙若涉及公开内容，必须有审核或本地私密模式。动画不得影响登录页性能。
</constraints>

<done_when_candidate>
- 登录或首页有轻量欢迎动画，用户可跳过。
- 每日鼓励语按日期稳定展示。
- 许愿墙第一版明确是本地私密或具备审核边界。
- 测试覆盖跳过、日期稳定、隐私边界与主题适配。
</done_when_candidate>

<workflow>
1. 新建 `add-warm-companion-surfaces` OpenSpec change。
2. 明确三项是否同一阶段交付。
3. 设计轻量状态与文案来源。
4. 实现不阻塞主链路的 UI。
5. 补测试、性能和文档。
</workflow>

<verification_loop>
运行登录页和 app shell 测试；手动验证动画跳过、移动端、低性能设备、深浅主题。
</verification_loop>

<output_contract>
输出陪伴体验 UI、文案、测试、OpenSpec 与隐私说明。
</output_contract>

## 13 plan-platform-expansion

<goal>
为 Windows / Mac / Android / iOS / 小程序 / 鸿蒙扩展制定可执行平台路线，并优先落地最小可行 PWA 或单平台包装方案。
</goal>

<context>
先读 `README.md`、`wrangler.jsonc`、`.github/workflows/`、`src/`、`public/`、`openspec/specs/deployment/spec.md`。
</context>

<constraints>
不得把六个平台放进一个实现目标里硬做完。第一阶段必须先产出平台路线和一个最小可验证目标。优先复用 Web/PWA，除非有明确原生能力需求。
</constraints>

<done_when_candidate>
- 文档列出各平台可行性、成本、风险与推荐顺序。
- 至少一个最小平台目标有实现或详细 OpenSpec。
- 若选择 PWA，manifest、图标、安装体验和离线边界被验证。
- 不承诺未实现平台已完成。
</done_when_candidate>

<workflow>
1. 新建 `plan-platform-expansion` OpenSpec change。
2. 审计当前 Vite app 的 PWA/包装适配度。
3. 比较 PWA、Electron/Tauri、Capacitor、小程序重写、鸿蒙方案。
4. 选择第一阶段目标。
5. 输出文档和可验证最小实现。
</workflow>

<verification_loop>
运行 build；若实现 PWA，手动验证安装 manifest、移动端 viewport、离线失败提示。
</verification_loop>

<output_contract>
输出平台路线、首阶段实现或 spec、测试与风险清单。
</output_contract>

## 14 add-openclaw-webchrome-integration

<goal>
评估并实现 OpenClaw / WebChrome 扩展集成的最小闭环，让外部浏览器或自动化入口能把病历文本送入 Firefly-Isle。
</goal>

<context>
先读 `README.md`、`src/routes/workspace-page.tsx`、`src/lib/extraction.ts`、`openspec/specs/info-extraction/spec.md`、`openspec/specs/auth/spec.md`。如需本机上下文，再读 `/Users/Totoro/Docker/openclaw` 的运行配置。
</context>

<constraints>
外部集成必须走认证边界，不允许匿名外部写入真实用户记录。第一版只做文本导入或打开预填页面，不做完整浏览器扩展商店发布。
</constraints>

<done_when_candidate>
- 明确 OpenClaw / WebChrome 集成入口：URL scheme、API endpoint、bookmarklet 或 extension prototype 之一。
- 外部文本能进入 `/app` 输入框或安全导入 endpoint。
- 未登录用户被引导登录，登录用户记录归属正确。
- 测试覆盖认证、预填、错误输入和跨来源限制。
</done_when_candidate>

<workflow>
1. 新建 `add-openclaw-webchrome-integration` OpenSpec change。
2. 选择最小集成形态。
3. 实现预填 / 导入边界。
4. 接入认证和记录归属。
5. 补测试与使用说明。
</workflow>

<verification_loop>
运行 auth、workspace、导入逻辑测试；手动验证未登录、已登录、非法来源、大文本输入。
</verification_loop>

<output_contract>
输出集成最小闭环、测试、OpenSpec 与使用说明。
</output_contract>
