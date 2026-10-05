## ADDED Requirements

### Requirement: 登录页提供纵向滚动叙事结构
系统 SHALL 在 `/login` 提供按滚动顺序推进的产品叙事结构，用于在用户决定登录之前解释产品定位、工作流与边界。

#### Scenario: 叙事章节按纵向顺序推进
- **WHEN** 用户访问 `/login` 并向下滚动
- **THEN** 页面 SHALL 按 `story-hero` → `story-problem` → `story-intake` → `story-timeline` → `story-views` → `story-labs` → `story-boundary` → `story-cta` 的固定顺序呈现叙事章节
- **AND** 章节推进 SHALL 由用户纵向滚动驱动
- **AND** 页面 SHALL NOT 使用横向轮播、自动播放或全屏 snap 翻页替代纵向滚动

#### Scenario: 叙事内容只描述已实现能力
- **WHEN** 系统渲染任一叙事章节
- **THEN** 章节内容 SHALL 对应 `openspec/specs` 中已定义的产品能力
- **AND** 章节 SHALL NOT 承诺未实现的功能
- **AND** 章节 SHALL NOT 呈现诊断结论或治疗建议

#### Scenario: 首尾 CTA 共用同一登录弹层
- **WHEN** 用户触发 `story-hero` 或 `story-cta` 中的 `登录` CTA
- **THEN** 页面 SHALL 打开同一个统一登录弹层
- **AND** 两处 CTA SHALL NOT 各自持有独立认证状态或独立表单值

### Requirement: 滚动动效使用自有原生进度绑定
系统 SHALL 使用自有浏览器原生滚动控制器 把滚动进度绑定到叙事章节的动画属性，并保持滚动位置与动画进度可逆对应。

#### Scenario: 滚动进度驱动章节动画
- **WHEN** 叙事章节进入配置的滚动区间
- **THEN** 系统 SHALL 依据滚动进度连续更新该章节的动画属性
- **AND** 用户反向滚动时动画 SHALL 反向回到对应进度
- **AND** scrub 绑定的动画 SHALL 使用线性缓动，避免与滚动位置产生非线性偏移

#### Scenario: 分层推进不改写原生定位
- **WHEN** 系统实现需要停留推进的章节
- **THEN** 系统 SHALL 使用 CSS sticky 容器配合兄弟 spacer 撑出滚动距离
- **AND** 系统 SHALL NOT 注入 pin-spacer 包装元素或由动画库接管定位
- **AND** 定位职责 SHALL 留在样式层，原生动效控制器 SHALL 只读取进度并写入动画属性

#### Scenario: 不引入平滑滚动劫持
- **WHEN** 系统实现滚动叙事
- **THEN** 系统 SHALL 使用浏览器原生滚动
- **AND** 系统 SHALL NOT 引入 ScrollSmoother、Lenis 或同类接管原生滚动的库

### Requirement: 滚动叙事保持渲染与生命周期安全
系统 SHALL 保证滚动叙事不破坏静态渲染、路由切换与既有登录页动效契约。

#### Scenario: 静态渲染不执行浏览器动效
- **WHEN** 系统在 `react-dom/server` 静态渲染环境渲染登录页
- **THEN** 渲染 SHALL 成功且不访问 `window`
- **AND** 静态渲染产物 SHALL NOT 包含动画库运行时标识
- **AND** 浏览器动效监听与观察器初始化 SHALL 只发生在客户端副作用中

#### Scenario: 离开登录页清理原生动效
- **WHEN** 用户从 `/login` 导航到其他路由
- **THEN** 系统 SHALL 取消待执行动画帧、断开布局观察器、移除监听并恢复被接管样式
- **AND** 反复进出 `/login` SHALL NOT 累积未回收的滚动监听

#### Scenario: 叙事动效与路由进入动效不叠加
- **WHEN** 系统渲染 `story-hero`
- **THEN** 首屏 SHALL 继续使用既有路由进入与 stagger CSS 动效
- **AND** 原生动效控制器 SHALL 只接管 `story-hero` 之后的叙事章节
- **AND** 同一元素 SHALL NOT 同时被 CSS 进入动效与 scrub 动画驱动

#### Scenario: 叙事章节不新起 WebGL 上下文
- **WHEN** 系统渲染 `story-hero` 之后的叙事章节
- **THEN** 章节 SHALL NOT 各自创建新的 WebGL 渲染上下文
- **AND** 登录页 WebGL 背景 SHALL 保持单一上下文归属首屏背景模块

### Requirement: 滚动叙事尊重降低动效偏好
系统 SHALL 在用户声明降低动效偏好时提供无滚动动画的等价可读结构。

#### Scenario: reduced-motion 降级为静态顺序章节
- **WHEN** 用户系统偏好为 `prefers-reduced-motion: reduce`
- **THEN** 系统 SHALL NOT 注册滚动驱动动画
- **AND** 全部叙事章节 SHALL 以完整可见状态按同一顺序静态呈现
- **AND** 用于撑出滚动距离的 spacer SHALL 收缩为内容自身高度
- **AND** 降级后叙事信息 SHALL 保持完整可读
