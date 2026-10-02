## ADDED Requirements

### Requirement: V4 视觉评估必须与 V3 生产主题隔离
系统 SHALL 将 `docs/design/Image-2/V4/DESIGN.md` 作为下一代视觉系统的评估真源，同时在产品负责人明确选定方向之前继续以 V3 token 与组件作为所有正式产品路由的生产实现真源。

#### Scenario: 设计预览消费 V4 合同
- **WHEN** 系统渲染 `/design-preview`
- **THEN** 预览 SHALL 使用 V4 定义的语义色、排版角色、surface 层级、间距与动效合同
- **AND** 预览样式 SHALL 使用独立命名空间，不得覆盖 `html`、`.dark` 或全局 `--ff-*` token

#### Scenario: 正式页面继续消费 V3 实现
- **WHEN** 用户访问 `/login`、`/app`、`/record/:id`、`/analytics/:id`、`/privacy` 或 `/share/:code`
- **THEN** 系统 SHALL 在方向被明确选定前继续使用现有 V3 生产 token 与组件
- **AND** 本次评估 SHALL NOT 改变这些路由的结构、材质或业务行为

#### Scenario: V4 token 以角色而非页面命名
- **WHEN** V4 为候选方向定义颜色、字体、surface、边界、强调或状态
- **THEN** token SHALL 以语义角色命名并由候选方向映射具体值
- **AND** 异常、警告、成功与主要动作 SHALL NOT 仅依赖同一个品牌强调色表达

#### Scenario: V4 排版表达信息角色
- **WHEN** V4 渲染导航、正文、编辑型标题、日期、标识符或测量值
- **THEN** 系统 SHALL 分别使用 UI sans、有限 display serif 与 mono/tabular numeric 角色
- **AND** 控件、导航和高密度数据 SHALL NOT 普遍使用 display serif
