## Purpose

定义 Firefly-Isle 的 Dark / Light 主题来源、token 合同、surface 语义、主题切换行为与登录页主题噪声边界。

资料与适用范围：V3及其他旧视觉现归档于 docs/design/archive/，本轮AI Native原型输入在 docs/design/current/，由根 DESIGN.md 导航。当前实现对应 src/index.css、src/lib/accent.ts、src/lib/theme/ 与 src/components/system/。本轮只同步设计来源优先级，不改变运行行为；下文其余V3配色、形状与登录视觉条款仍是待与当前实现逐项核对的历史合同，不能作为新提案的默认输入，也不能据其回退已确认的品牌和共通样式。正式实施新视觉时再同步受影响条款。
## Requirements
### Requirement: 主题实现必须来源于设计系统
系统 SHALL 根据经用户批准的当前设计决定维护统一的设计系统 token、surface contract 与系统组件。根 `DESIGN.md` 区分当前设计输入、已批准实现与历史资料；`docs/design/archive/` 中的V3、A/B、Stitch及其他旧稿仅作历史证据，不得自动覆盖最新用户要求或已确认实现。

#### Scenario: Dark / Light 主题通过统一 token 实现
- **WHEN** 系统渲染 Dark 或 Light 主题
- **THEN** 颜色、文字层级、边框、surface 层级、圆角、状态色与强调色 SHALL 来自统一命名的设计系统 token，而不是在业务组件中直接散写十六进制值

#### Scenario: 当前决定与历史参考分开
- **WHEN** 实现需要判断视觉取舍
- **THEN** 系统 SHALL 核对根 `DESIGN.md` 指向的当前材料与用户批准范围
- **AND** 新原型尚未批准时 SHALL 保留既有有效实现，不把提案写成已上线规范
- **AND** 归档截图或旧规范 SHALL 不作为默认必读来源或回退依据

#### Scenario: 页面只能消费设计系统组件与 token
- **WHEN** 工作区、登录页、档案页、隐私页或时间线表格实现主题相关结构
- **THEN** 页面 SHALL 通过设计系统组件与 token 组合视觉结果，而不是在页面中重复拼装新的主题结构与表面语义

#### Scenario: 设计素材被提炼为 contract 而非直接运行时依赖
- **WHEN** 系统需要依据已确认原型对齐主题语言
- **THEN** 实现 SHALL 先将这些证据提炼为 token、surface contract 与 component contract，再由页面消费这些 contract

### Requirement: 默认主题为 Dark
系统 SHALL 在用户首次进入应用且不存在已保存主题偏好时使用 Dark 主题。

#### Scenario: 首次访问默认主题
- **WHEN** 用户首次进入应用且本地不存在主题偏好
- **THEN** 系统 SHALL 使用设计系统中定义的默认 Dark token 集合，而不是自由选择页面级颜色

### Requirement: 支持手动切换为 Light
系统 SHALL 提供显式主题切换能力，允许用户在应用中从 Dark 切换到 Light，且切换只改变材质、排版语气与 token 映射，不改变结构角色。

#### Scenario: 用户切换到 Light
- **WHEN** 用户触发主题切换控件
- **THEN** 系统 SHALL 将当前主题切换为 Light，并立即以对应 token 集合更新界面材质、文字与边框表现

#### Scenario: 主题切换保持结构同构
- **WHEN** 用户在 Dark 与 Light 主题间切换
- **THEN** 侧栏宽度、顶部空间角色、主内容起始线、版心关系、组件角色与主要操作位置 SHALL 保持一致，不得因主题切换而改变页面结构角色

### Requirement: 恢复上次主题选择
系统 SHALL 持久化用户上次选择的主题，并在后续访问时优先恢复该选择。

#### Scenario: 刷新后恢复主题
- **WHEN** 用户此前已手动选择 Light 主题并刷新或重新打开应用
- **THEN** 系统 SHALL 恢复 Light 主题对应的设计系统 token 映射，而不是回退到默认 Dark

#### Scenario: 已保存偏好优先于默认值
- **WHEN** 本地已存在主题偏好
- **THEN** 系统 SHALL 优先使用已保存的主题偏好，而不是使用首次访问默认值

### Requirement: Dark surface 层级必须收敛为有限语义面
系统 SHALL 为 Dark 主题定义有限且具名的 surface contract，至少区分 base、shell、panel、inset、rule 与 accent surface 等语义层级，并禁止在实现中持续增加未命名的 dark 背景色。

#### Scenario: Dark surface 使用具名层级
- **WHEN** 系统渲染 dark sidebar、top bar、panel、内嵌输入区或表格单元
- **THEN** 这些区域 SHALL 映射到已命名的 dark surface token，而不是使用无语义的新黑色值

#### Scenario: 新增 dark 面板不发明新黑色
- **WHEN** 后续实现新增 dark 主题区块或组件
- **THEN** 开发 SHALL 复用既有 dark surface token；若现有 token 无法表达语义，必须先更新设计系统 contract，再修改实现

### Requirement: 主题切换动效必须是材质切换而非布局切换
系统 SHALL 将主题切换视为 token 与材质的切换，而不是页面布局重排。

#### Scenario: 切换时仅发生材质过渡
- **WHEN** 用户触发主题切换
- **THEN** 系统 MAY 对背景、边框、文字与强调色做轻量过渡，但 SHALL 不因主题切换改变主布局宽度、壳层层次或主要区块位置

### Requirement: V3 色彩语义必须保持一致
系统 SHALL 将橙色作为唯一主要行动/焦点/风险色，将绿色仅用于系统健康、完成或通过状态，不得在 Light 主题中以黑色作为主要行动色；登录页的项目介绍与统一登录弹层 SHALL 通过橙色 CTA 与同一几何语法表达同一入口流程。

#### Scenario: 登录页使用橙色行动连接介绍页与登录弹层
- **WHEN** 系统渲染桌面 `/login`
- **THEN** 页面 SHALL 使用橙色登录 CTA 表达从能力介绍到身份访问的路径
- **AND** 页面 MAY 使用橙色节点或焦点状态强化真实结构节点、能力节点或身份访问 CTA
- **AND** 页面 SHALL NOT 使用无语义的随机橙色装饰点替代结构连接

#### Scenario: 登录页默认态使用全屏双主题扁平背景
- **WHEN** 系统渲染桌面 `/login` 默认态
- **THEN** 页面 SHALL 在暗色主题使用无灯塔蓝眼泪夜海与萤火虫光点背景，在亮色主题使用平潭风车白昼海岸背景
- **AND** 页面 SHALL 将品牌文案与 `登录` CTA 整合为一张全屏视觉
- **AND** 页面 SHALL NOT 将默认 intro 包裹在独立圆角卡片或外层 framed panel 中
- **AND** 页面 SHALL 使用适合全屏铺底的高清无文字背景资产，避免低分辨率裁切图在桌面端发糊
- **AND** 页面 SHALL NOT 额外覆盖经纬线、角度数值、罗盘刻度或航线 SVG
- **AND** 页面 SHALL NOT 额外渲染 `混乱`、`整理`、`结构化`、`可追溯` 四个 waypoint 或说明弹窗
- **AND** 页面 SHALL 在主 CTA 附近提供轻量安全状态，而不是大型运行状态卡片或悬浮角落状态

#### Scenario: 绿色仅用于登录页系统状态
- **WHEN** 登录页渲染 `OPERATIONAL`、安全通道或完成状态
- **THEN** 这些状态 MAY 使用绿色状态 token
- **AND** 登录主按钮和身份访问 CTA SHALL 使用橙色行动 token

### Requirement: V3 形状与层级必须来自组件语义
系统 SHALL 使用 V3 的 8px 主圆角、1px 结构边界与 2px 橙色焦点线表达层级，不得通过全局 `border-radius: 0 !important` 或厚阴影抹除组件语义；登录页介绍区与统一登录弹层 SHALL 共享同一几何合同。

#### Scenario: 登录弹层与介绍页共享材质
- **WHEN** `/login` 同时展示项目介绍页与统一登录弹层
- **THEN** 二者 SHALL 使用兼容的 surface、边框、圆角、字体层级与强调色
- **AND** Light 主题中的身份访问卡 SHALL 使用白色卡片 surface、浅色输入框、浅色次级按钮与花路灯塔白昼 hero
- **AND** Dark 主题中的身份访问卡 MAY 保留夜航 hero 与暗色 surface
- **AND** 登录弹层 SHALL NOT 看起来像与介绍页无关的独立海报

#### Scenario: 身份访问卡使用参考图式登录顺序
- **WHEN** 用户打开 `/login` 的统一登录弹层
- **THEN** 身份访问卡 SHALL 先展示灯塔路径 hero、`登录` 标题与 `此程虽艰，您永不踽踽独行。` 辅助文案
- **AND** 表单 SHALL 按邮箱、密码、记住我/忘记密码、社交登录、橙色登录按钮、`或` 分隔、匿名会话的顺序呈现
- **AND** 注册/返回登录入口 SHALL 降级为卡片底部辅助文本，不得重新成为顶部 tab 或主视觉
- **AND** 主题切换与语言切换 SHALL 留在项目介绍页工具区，不得回到身份访问卡内部

#### Scenario: 动画表达弹层状态
- **WHEN** 用户触发统一登录弹层展开
- **THEN** 页面 MAY 使用轻量遮罩、模糊、透明度或 CTA 焦点变化表达状态变化
- **AND** 动画 SHALL 保持可读性，不得遮挡表单字段或主要登录动作
- **AND** 页面 SHOULD 支持 reduced-motion 用户不依赖动画完成登录
