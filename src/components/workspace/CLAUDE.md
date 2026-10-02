# src/components/workspace/
> L2 | 父级: /src/components/CLAUDE.md

成员清单
lab-report-import.tsx: 当前患者的三类化验上传与人工审核，支持未知指标映射/排除、逐行日期/数值/范围校验、重复批次确认和保存/读回分离重试；审核期间锁住同页病历写入。
lab-report-import.dom.test.tsx: 验证三类化验患者绑定、人工修正、重复取消/替换、失败保留草稿、只重试读回和迟到 OCR 隔离。
CLAUDE.md: 说明 workspace feature 层职责边界与成员清单，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
extraction-composer.tsx: 工作区输入与主操作区，收口文本输入、病历/检验报告 OCR 文件上传、语音工具、OCR 文本确认、自然语言编辑反馈、错误提示、状态反馈、已有病历编辑/新病历提取分流、control/popover 动效与外层容器旋转 loading icon 的唯一主提取动作，不承载正式导出入口，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
follow-up-panel.tsx: 追问输入和提交；处理期间禁用重复请求，失败由工作台提供原答重试。
llm-provider-settings-panel.tsx: 工作区模型设置区块，渲染整块可点击收起的系统内置 deepseek-v4-flash、API 自提供、自定义 provider 设置入口、DeepSeek 服务测试入口、accordion/tab 动效、模式字段映射与第三方医疗数据披露，并调用前端 provider settings client 保存设置，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
llm-provider-settings-panel.test.ts: 模型设置字段显隐合同测试，约束系统内置无第二行、API 自提供显示 Provider/API Key/模型名、自定义显示 Base URL/API Key/模型名且 URL 在前，并渲染 DeepSeek 服务测试入口，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
report-preview-frame.tsx: V3 工作区病历预览主表面，内联渲染正式档案入口、按需追问进度提示、Dense Clinical Ledger 基本信息台账、诊断日期前置、治疗方案与最新基因/免疫组化摘要、由 initialOnset/treatmentLines 投影的横向病程轨及干净等待空态、可编辑临床备注、既往检测历史、验证状态与编辑翻出动效，并保留 setReportRef 导出捕获点，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: feature 层承载页面业务结构块；/app 做输入、提取、模型设置与草稿预览，正式导出属于 /record/:id。
