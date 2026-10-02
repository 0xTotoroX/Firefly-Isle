## ADDED Requirements

### Requirement: 系统提供隔离的 V4 视觉比较路由
系统 SHALL 提供无需登录即可访问的 `/design-preview` 设计评估路由，并明确标识该页面不是正式产品界面。

#### Scenario: 未登录用户打开设计预览
- **WHEN** 未登录用户访问 `/design-preview` 并已通过全局隐私门控
- **THEN** 系统 SHALL 渲染完整视觉比较页而不是重定向到 `/login`
- **AND** 页面 SHALL NOT 发起患者记录、实验室指标或用户设置的 Supabase 读取

#### Scenario: 预览不会进入正式导航
- **WHEN** 系统渲染正式侧栏、顶栏或登录入口
- **THEN** 系统 SHALL NOT 把 `/design-preview` 加入正式产品导航
- **AND** 删除该路由 SHALL NOT 影响任何业务流程

### Requirement: 三个候选方向必须在同一内容合同下比较
系统 SHALL 使用同一份静态病历、同一信息架构和同一 DOM 结构渲染 Clinical Calm、Firefly Glass 与 Living Archive 三个候选方向。

#### Scenario: 用户切换候选方向
- **WHEN** 用户在三个候选方向之间切换
- **THEN** 系统 SHALL 只改变视觉 token、材料与允许的装饰语法
- **AND** 患者信息、治疗摘要、异常摘要、时间线、指标数据、动作位置与阅读顺序 SHALL 保持不变

#### Scenario: 默认推荐方向
- **WHEN** 用户首次进入 `/design-preview`
- **THEN** 系统 SHALL 默认选择 Clinical Calm
- **AND** 页面 SHALL 将其标记为推荐方向，同时仍允许用户选择另外两个方向

### Requirement: 预览必须支持可比较的 Light 与 Dark 材质
系统 SHALL 为每个候选方向提供 Light 与 Dark 两种材料映射，并在预览内切换而不修改用户已保存的全局主题偏好。

#### Scenario: 用户切换预览材质
- **WHEN** 用户在预览控制条中切换 Light 或 Dark
- **THEN** 当前候选 SHALL 使用相同结构映射到对应材料 token
- **AND** 系统 SHALL NOT 写入正式主题偏好或改变离开预览后的产品主题

### Requirement: 预览必须建立临床任务优先级
系统 SHALL 将页面首屏阅读顺序收敛为患者与当前治疗状态、异常摘要、指标浏览、当前指标详情，并把分享等次级动作降级到辅助区域。

#### Scenario: 用户扫描首屏
- **WHEN** 用户在桌面或移动宽度打开任一候选方向
- **THEN** 患者身份、当前治疗与异常摘要 SHALL 在主要视觉层级中先于分享、导出或装饰信息
- **AND** 异常状态 SHALL 同时通过图标或文字与颜色表达

### Requirement: 预览必须满足响应式、可访问与 reduced-motion 合同
系统 SHALL 让候选切换、材料切换和页面内容在桌面与 390px 移动宽度下可操作、可读且无水平溢出。

#### Scenario: 移动宽度阅读
- **WHEN** viewport 宽度为 390px
- **THEN** 控制条、患者摘要、指标列表、图表和时间线 SHALL 收敛为单列或可安全换行的布局
- **AND** document SHALL NOT 出现页面级水平滚动

#### Scenario: 键盘与辅助技术操作
- **WHEN** 用户使用键盘或辅助技术访问候选与材料控件
- **THEN** 控件 SHALL 使用原生 button 语义、可见 focus 状态、当前选择状态和可读标签

#### Scenario: 减少动态效果
- **WHEN** 用户启用 `prefers-reduced-motion: reduce`
- **THEN** 非必要动画与过渡 SHALL 被移除或缩短为近零
- **AND** 所有内容与选择状态 SHALL 保持可见和可操作

### Requirement: 正式 V4 迁移必须等待明确选择
系统 SHALL 将本变更的交付边界限定为设计合同、候选预览与验证证据，不得因默认推荐而自动改造正式产品页面。

#### Scenario: 预览完成但尚未选择
- **WHEN** 三个候选已经实现并通过验证，但产品负责人尚未明确选择方向
- **THEN** 正式路由 SHALL 保持 V3
- **AND** 后续全站迁移 SHALL 由新的 OpenSpec 变更承载
