# src/components/workspace/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
lab-report-import.tsx: 当前患者的三类化验上传与人工审核，支持未知指标映射/排除、逐行日期/数值/范围校验、重复批次确认和保存/读回分离重试；审核期间锁住同页病历写入。
lab-report-import.dom.test.tsx: 验证三类化验患者绑定、人工修正、重复取消/替换、失败保留草稿、只重试读回和迟到 OCR 隔离。
extraction-composer.tsx: 工作区输入与主操作区，收口文本输入、病历/检验报告 OCR 文件上传、语音工具、OCR 文本确认、自然语言编辑反馈、错误提示、状态反馈、已有病历编辑/新病历提取分流、control/popover 动效与外层容器旋转 loading icon 的唯一主提取动作，不承载正式导出入口
follow-up-panel.tsx: 追问输入和提交；处理期间禁用重复请求，失败由工作台提供原答重试。
llm-provider-settings-panel.tsx: 由 /models 承载的 BYOK 配置面板；保存、脱敏读取、系统恢复与连接测试通过 settings client，Demo 只保存非敏感预览状态。
llm-provider-settings-panel.test.ts: 模型设置字段显隐合同测试，约束系统内置无第二行、API 自提供显示 Provider/API Key/模型名、自定义显示 Base URL/API Key/模型名且 URL 在前，并渲染 DeepSeek 服务测试入口
report-preview-frame.tsx: V3 工作区病历预览主表面，内联渲染正式档案入口、按需追问进度提示、Dense Clinical Ledger 基本信息台账、诊断日期前置、治疗方案与最新基因/免疫组化摘要、由 initialOnset/treatmentLines 投影的横向病程轨及干净等待空态、可编辑临床备注、既往检测历史、验证状态与编辑翻出动效，并保留 setReportRef 导出捕获点

法则: feature 层承载页面业务结构块；/app 做输入、提取、模型设置与草稿预览，正式导出属于 /record/:id。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
