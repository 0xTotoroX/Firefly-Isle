# src/components/workspace/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
lab-report-import.tsx: 患者 key 隔离三类化验队列与迟到请求，支持未知指标映射/排除、逐行校验、重复确认和保存/读回分离重试；审核期间锁住同页病历写入。
lab-report-import.dom.test.tsx: 验证三类化验患者绑定、人工修正、重复取消/替换、失败保留草稿、只重试读回和迟到 OCR 隔离。
extraction-composer.tsx: 工作区输入与主操作区，收口文本输入、病历/检验报告 OCR 文件上传、语音工具、OCR 文本确认、自然语言编辑反馈、错误提示、状态反馈、已有病历编辑/新病历提取分流、control/popover 动效与外层容器旋转 loading icon 的唯一主提取动作，不承载正式导出入口
follow-up-panel.tsx: 追问输入和提交；处理期间禁用重复请求，失败由工作台提供原答重试。
llm-provider-settings-panel.tsx: 由 /models 承载的 BYOK 配置面板；保存、脱敏读取、系统恢复与连接测试通过 settings client，Demo 只保存非敏感预览状态。
llm-provider-settings-panel.test.ts: 模型设置字段显隐合同测试，约束系统内置无第二行、API 自提供显示 Provider/API Key/模型名、自定义显示 Base URL/API Key/模型名且 URL 在前，并渲染 DeepSeek 服务测试入口
report-preview-frame.tsx: 平面草稿预览，组合基本信息、完整治疗经过、分阶段检测、备注与真实缺失提示；保留正式病历入口及 setReportRef。
report-preview-field.tsx: 字段阅读/编辑和保存/取消；处理期间锁住输入和提交。
report-preview-field.dom.test.tsx: 字段提交、取消和异步锁定行为回归。

法则: feature 层承载页面业务结构块；/app 做输入、提取与草稿预览；模型设置归 /models，正式导出属于 /record/:id。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
