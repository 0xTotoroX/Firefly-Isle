# demo-mode Specification

## Purpose
定义无需认证、仅使用明确虚构资料的完整产品演示，覆盖总览、录入、病历、指标、症状、随访、设置和模型页面。演示复用正式页面与交互，通过独立内存会话保存演示操作，并与真实账户、数据库、模型服务及个人偏好隔离。
## Requirements
### Requirement: 公开 Demo 模式覆盖完整产品主链路
系统 SHALL 提供无需登录即可访问的 Demo 模式，用于投资人演示、使用教程和开发调试，并覆盖当前产品主链路的主要可见能力。

#### Scenario: 打开公开 Demo
- **WHEN** 用户访问 `/demo`
- **THEN** 系统 SHALL 进入公开 Demo 模式
- **AND** 系统 SHALL NOT 要求创建、恢复或伪造 Supabase session
- **AND** 系统 SHALL 展示真实产品页面组件，而不是营销落地页

#### Scenario: Demo 页面显示模式提醒
- **WHEN** 用户访问任意 `/demo` 页面
- **THEN** 页面 SHALL 显示当前为 Demo 视图的提醒
- **AND** 提醒 SHALL 说明资料完全虚构、操作仅影响演示状态
- **AND** 提醒 SHALL 说明 Demo 不会写入个人账号

#### Scenario: Demo 覆盖病历详情能力
- **WHEN** 用户访问 Demo 病历页
- **THEN** 页面 SHALL 展示档案视图、极简 TimelineTable 视图、Gantt 视图、实验室趋势、AI 分析预览、分享预览和 PDF/PNG 导出入口
- **AND** 页面 SHALL 明确表达这些是 Demo/预览能力

#### Scenario: Demo 覆盖指标统计能力
- **WHEN** 用户访问 Demo 统计页
- **THEN** 页面 SHALL 展示血常规、血生化和肿瘤标志物趋势
- **AND** Demo 统计页 SHALL 与 Demo 病历页使用同一语义患者记录和同一组 `labResults`

#### Scenario: Demo 固定示例与真实账户隔离
- **WHEN** 用户进入演示，包括已登录真实账户的用户
- **THEN** 系统 SHALL 仅读取本地虚构 fixture，不通过分享码或真实 session 取得演示数据
- **AND** 示例 SHALL 覆盖非晚期、初诊晚期、复发晚期三种模型形态
- **AND** 演示 SHALL NOT 初始化真实账户数据读取或提供真实 Key、支付、注销入口

#### Scenario: Demo 覆盖持续记录工作流
- **WHEN** 用户在演示中进入总览、录入、化验、症状、随访、设置和模型配置预览
- **THEN** 系统 SHALL 复用正式产品组件，提供对应的演示资料和本地交互
- **AND** 提取/OCR/AI 输出 SHALL 明确使用固定示例，不发送文件或文字到真实服务
- **AND** 页面之间 SHALL 共享当前演示状态，刷新或明确重置后可恢复固定示例

### Requirement: Demo 不污染真实用户数据
系统 SHALL 将 Demo 数据保持为本地 fixture 或只读预览，不得默认写入真实用户或匿名用户的 Supabase 数据空间。

#### Scenario: 真实用户首次进入工作区
- **WHEN** 已认证或匿名用户访问 `/app` 且没有用户自有病历
- **THEN** 工作区 SHALL 保持空白输入/预览状态
- **AND** 系统 SHALL NOT 自动创建 demo patient、demo treatment_lines、demo lab_results 或 demo record_shares

#### Scenario: Demo 编辑不落库
- **WHEN** 用户在 Demo 病历页开启编辑并修改字段
- **THEN** 修改 SHALL 在当前演示会话中临时呈现，跨演示页面保持一致
- **AND** 系统 SHALL NOT 调用真实 patient 持久化写入

#### Scenario: Demo 分享不创建授权码
- **WHEN** 用户查看 Demo 分享能力
- **THEN** 页面 SHALL 显示分享功能预览或禁用态
- **AND** 系统 SHALL NOT 创建真实 `record_shares` 行
- **AND** 系统 SHALL NOT 暴露真实授权码

### Requirement: Demo AI 分析为静态非诊断预览
系统 SHALL 在 Demo 模式展示 AI 辅助分析能力，但不得调用真实 LLM 或把 Demo 内容保存为真实分析结论。

#### Scenario: Demo 展示 AI 分析预览
- **WHEN** 用户访问 Demo 病历页
- **THEN** 页面 SHALL 展示包含治疗线摘要、指标趋势摘要、复核关注点、就诊前问题和免责声明的静态 AI 分析预览
- **AND** 文案 SHALL 保持非诊断语气

#### Scenario: Demo 不调用 LLM
- **WHEN** 用户在公开 Demo 中查看 AI 分析区域
- **THEN** 浏览器 SHALL NOT 调用 `llm-proxy`
- **AND** 浏览器 SHALL NOT 携带任何 LLM provider API key

### Requirement: Demo 导航保持模式内闭环
系统 SHALL 在 Demo 模式中使用 Demo 路由闭环导航，避免把公开 Demo 用户带入受保护真实记录路由。

#### Scenario: 演示全局与患者导航
- **WHEN** 用户使用演示内总览、录入、模型、设置、病历、化验、症状或随访入口
- **THEN** 导航 SHALL 保持在 `/demo` 范围内
- **AND** 进入真实产品 SHALL 是明确标识的退出演示动作

#### Scenario: Demo 病历页侧栏
- **WHEN** 用户位于 Demo 病历页
- **THEN** 侧栏病历入口 SHALL 指向 Demo 病历页
- **AND** 侧栏统计入口 SHALL 指向 Demo 统计页

#### Scenario: Demo 统计页侧栏
- **WHEN** 用户位于 Demo 统计页
- **THEN** 侧栏病历入口 SHALL 指向 Demo 病历页
- **AND** 侧栏统计入口 SHALL 指向 Demo 统计页
