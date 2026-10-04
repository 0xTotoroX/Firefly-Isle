## Purpose

定义 Firefly-Isle 的邮箱认证、密码重置、Google OAuth、匿名模式、隐私条款门控与 session 持久化行为。
## Requirements
### Requirement: 邮箱登录
系统 SHALL 支持用户通过邮箱和密码注册、登录，使用 Supabase Auth 邮箱认证流程，并保证认证弹层的可见文案与当前认证模式一致。

#### Scenario: 登录模式显示一致
- **WHEN** 用户打开认证弹层并处于登录模式
- **THEN** 弹层标题、dialog label、主按钮、辅助文案 SHALL 表达登录语义
- **AND** 系统 SHALL NOT 在登录模式中显示注册主动作标题

#### Scenario: 注册模式显示一致
- **WHEN** 用户在认证弹层中切换到注册模式
- **THEN** 弹层标题、dialog label、主按钮、辅助文案 SHALL 全部表达注册语义
- **AND** 系统 SHALL NOT 同时显示注册动作和登录标题的混合状态

#### Scenario: 邮箱注册直接认证
- **WHEN** 用户提交注册表单且 Supabase 返回有效 session
- **THEN** 系统 SHALL 进入已认证状态
- **AND** 路由 SHALL 通过统一 session 恢复路径进入 `/app`
- **AND** 系统 SHALL NOT 提示用户查收验证邮件

#### Scenario: 注册等待邮箱确认
- **WHEN** 用户提交注册表单且 Supabase 成功返回用户但未返回有效 session
- **THEN** 系统 SHALL 显示查收确认邮件的成功等待状态，并清除密码字段
- **AND** 系统 SHALL 保持在未认证入口状态
- **AND** 系统 SHALL 使用公共 `/auth/callback` 作为确认落点，不要求关闭邮箱确认配置

#### Scenario: 邮箱登录成功
- **WHEN** 用户输入正确的邮箱和密码
- **THEN** 系统 SHALL 获取有效 session，用户进入已认证状态，跳转到主界面

#### Scenario: 邮箱登录失败
- **WHEN** 用户输入错误的邮箱或密码
- **THEN** 系统 SHALL 展示可读错误信息
- **AND** 系统 SHALL NOT 暴露账户存在性、密码校验细节或后端原始错误

#### Scenario: 邮箱与手机占位模式分离
- **WHEN** 用户打开认证弹层
- **THEN** 系统 SHALL 提供清晰的邮箱认证模式与手机认证模式切换
- **AND** 邮箱模式 SHALL 保留邮箱、密码、登录、注册和密码重置语义
- **AND** 手机模式 SHALL 显示 `敬请期待`
- **AND** 手机模式 SHALL NOT 显示邮箱密码字段、验证码字段、发送验证码动作或邮箱密码主动作

### Requirement: 密码重置入口
系统 SHALL 为邮箱密码用户提供真实密码重置入口，并使用 Supabase Auth 的 password reset 能力。

#### Scenario: 密码重置模式显示一致
- **WHEN** 用户从登录模式进入密码重置模式
- **THEN** 弹层标题、dialog label、主按钮、辅助文案 SHALL 表达密码重置语义
- **AND** 系统 SHALL 只要求用户输入邮箱

#### Scenario: 请求密码重置
- **WHEN** 用户提交密码重置请求
- **THEN** 系统 SHALL 调用 Supabase `resetPasswordForEmail()`
- **AND** 系统 SHALL 提供中性反馈，说明如果该邮箱已注册则会发送重置邮件
- **AND** 系统 SHALL NOT 暴露该邮箱是否存在

#### Scenario: 密码重置配置错误
- **WHEN** Supabase 拒绝密码重置请求或 redirect URL 配置无效
- **THEN** 系统 SHALL 显示可读失败反馈
- **AND** 系统 SHALL NOT 显示后端原始错误或敏感配置值

#### Scenario: 从邮件设置新密码
- **WHEN** 用户打开有效重置邮件链接
- **THEN** 系统 SHALL 在独立 `/auth/reset-password` 路由等待回调和会话初始化完成，再显示当前邮箱、新密码与确认字段
- **AND** 提交 SHALL 调用 Supabase `updateUser({ password })`，成功后清除密码并提供明确反馈
- **AND** 改密请求 SHALL 绑定该恢复回调取得的凭据，其他标签或窗口切换登录账号不得改变目标身份或被此次恢复流程覆盖

#### Scenario: 重置链接错误优先于旧会话
- **WHEN** 重置链接无效或初始化失败，但浏览器仍保留其他账户的 session
- **THEN** 系统 SHALL 显示链接错误而不是提供旧账户的改密表单
- **AND** 回调的 query 和 fragment 错误、返回的业务错误均 SHALL 可见，不无限等待

### Requirement: Google OAuth 登录
系统 SHALL 在 Google provider 配置完成后提供真实 Google OAuth 登录入口。

#### Scenario: Google provider 可见
- **WHEN** Google OAuth 在本环境中被配置为可用
- **THEN** 认证弹层 MAY 展示 Google 登录入口
- **AND** 该入口 SHALL 表达真实可用的 OAuth 登录，而不是禁用占位

#### Scenario: Google 登录启动
- **WHEN** 用户触发 Google 登录入口
- **THEN** 系统 SHALL 调用 Supabase `signInWithOAuth()` 并使用 `google` provider
- **AND** 系统 SHALL 使用公共 `/auth/callback` 作为 OAuth 回调落点，避免受保护路由在 session 恢复前丢弃回调参数
- **AND** 系统 SHALL 请求 Google 显示账号选择器，避免浏览器复用上一次 Google 会话而跳过家庭成员身份选择
- **AND** OAuth 回调成功后 SHALL 进入统一 session 恢复路径

#### Scenario: Google 首次登录即注册
- **WHEN** 用户从登录模式或注册模式触发 Google OAuth
- **THEN** 系统 SHALL 将 Google OAuth 作为统一登录/注册入口处理
- **AND** 已存在的 Supabase Google 身份 SHALL 恢复同一个用户 uid 并读取该 uid 绑定的数据
- **AND** 尚不存在的 Google 身份 SHALL 在第一次成功 OAuth 回调后创建新的 Supabase 用户

#### Scenario: Google provider 未配置
- **WHEN** Google OAuth 在本环境中尚未配置
- **THEN** 系统 SHALL NOT 将 Google 展示为可用主认证动作

### Requirement: 未启用社交登录不得伪装成入口
系统 SHALL 只展示真实可用的认证入口，并只通过 Supabase Auth provider 建立 OAuth session；不得把未接通 provider 放在主路径里制造可用错觉，也不得伪造登录成功或自建微信 session。

#### Scenario: 微信 provider 未接通
- **WHEN** 微信登录未完成微信平台配置、Supabase provider 配置、回调域名或 session 恢复验证
- **THEN** 系统 MAY 展示微信占位以表达当前主攻方向
- **AND** 该占位 SHALL 显示 `敬请期待`
- **AND** 该占位 SHALL NOT 作为可点击 OAuth 主动作
- **AND** 系统 SHALL NOT 创建本地用户、伪造 session、保存微信 token 或把用户手动送入 `/app`

#### Scenario: 第三方入口禁用态
- **WHEN** 任意第三方 provider 只作为未来计划存在
- **THEN** 系统 SHALL 隐藏该入口或明确标记为不可用
- **AND** 系统 SHALL NOT 让它看起来像当前可点击的主登录方式

### Requirement: 匿名模式
系统 SHALL 支持用户在不注册的情况下以匿名身份使用，并通过 Supabase `signInAnonymously()` 创建匿名 session，将数据关联到匿名用户 uid。

#### Scenario: 匿名模式进入
- **WHEN** 用户触发匿名会话入口
- **THEN** 系统 SHALL 调用 Supabase `signInAnonymously()`
- **AND** 成功后用户 SHALL 通过统一 session 路径进入主界面

#### Scenario: 匿名入口说明真实身份边界
- **WHEN** 用户查看匿名会话入口
- **THEN** 系统 SHALL 说明匿名会话会创建 Supabase 匿名身份
- **AND** 系统 SHALL 说明用户创建的数据会绑定到该匿名 uid

#### Scenario: 匿名用户数据隔离
- **WHEN** 匿名用户创建患者记录
- **THEN** 记录的 user_id SHALL 为匿名用户的 uid，RLS 策略同等生效，其他用户不可访问

### Requirement: 首次使用显示隐私条款
系统 SHALL 在用户首次进入应用时展示隐私条款门控，用户确认后方可继续使用，并与独立隐私页共享同一份文案真相源。

#### Scenario: 首次使用隐私条款展示
- **WHEN** 用户首次访问应用（本地无已确认记录）
- **THEN** 系统 SHALL 在进入主功能前展示隐私条款门控，包含数据使用说明，并阻塞主功能导航

#### Scenario: 用户拒绝隐私条款
- **WHEN** 用户拒绝或关闭隐私条款而未确认
- **THEN** 系统 SHALL 不允许用户进入主功能，停留在隐私条款门控状态

#### Scenario: 已确认用户不重复展示
- **WHEN** 用户已确认过隐私条款（本地有确认记录）
- **THEN** 系统 SHALL 跳过隐私条款门控，直接进入主界面

#### Scenario: 门控与独立隐私页共用同一文案来源
- **WHEN** 用户在首次门控与独立隐私页之间切换查看说明
- **THEN** 两处内容 SHALL 受同一真相源约束，不得出现摘要与条款边界相互漂移

### Requirement: Session 持久化
系统 SHALL 在用户关闭并重新打开浏览器后保持登录状态，直到用户主动退出。

#### Scenario: Session 自动恢复
- **WHEN** 已登录用户关闭浏览器后重新打开应用
- **THEN** 系统 SHALL 自动恢复 Supabase session
- **AND** 已认证用户访问 `/login` SHALL 被导向 `/app`

#### Scenario: 不展示未实现的记住我控制
- **WHEN** 系统没有实现可切换的 session 持久化策略
- **THEN** 登录表单 SHALL NOT 展示可交互的 `记住我` 控件

#### Scenario: 主动退出登录
- **WHEN** 用户点击退出登录
- **THEN** 系统 SHALL 调用 Supabase Auth signOut，清除本地 session，跳转到登录页

### Requirement: 手机登录占位
系统 SHALL 在短信服务、防刷策略和成本策略完成前，将手机登录作为占位能力展示，不得发起真实短信认证。

#### Scenario: 手机模式占位显示
- **WHEN** 用户切换到手机认证模式
- **THEN** 系统 SHALL 显示 `敬请期待`
- **AND** 系统 SHALL 告知用户当前可使用 Google 或邮箱
- **AND** 系统 SHALL NOT 要求用户输入密码
- **AND** 系统 SHALL NOT 显示手机号输入、验证码输入、发送验证码动作或进入工作区主动作

#### Scenario: 手机短信不被调用
- **WHEN** 手机登录仍处于占位状态
- **THEN** 系统 SHALL NOT 调用 Supabase Phone OTP 发送能力
- **AND** 系统 SHALL NOT 调用 Supabase Phone OTP 验证能力
- **AND** 系统 SHALL NOT 生成 phone identity

### Requirement: 微信登录占位
系统 SHALL 在微信开放平台、Supabase provider、回调域名与 session 恢复完成 live verification 前，将微信登录作为占位能力展示，不得发起真实微信 OAuth。

#### Scenario: 微信占位显示
- **WHEN** 用户打开认证弹层并查看社交入口
- **THEN** 系统 MAY 展示微信占位
- **AND** 该占位 SHALL 显示 `微信` 与 `敬请期待`
- **AND** 微信图标 SHALL 直接使用自身绿色图标，不套用白色圆底

#### Scenario: 微信 OAuth 不启动
- **WHEN** 微信登录仍处于占位状态
- **THEN** 系统 SHALL NOT 调用 Supabase `signInWithOAuth()` 的微信 provider
- **AND** 系统 SHALL NOT 读取前端 provider id 来决定微信入口是否可点击
- **AND** 系统 SHALL NOT 跳转公共 callback 或手动进入 `/app`

#### Scenario: 微信 provider 兼容性预研
- **WHEN** 微信原始 OAuth2 端点不能满足 Supabase custom provider 的标准 OAuth2/OIDC code exchange、userinfo 或 identity mapping 要求
- **THEN** 未来恢复微信登录前 SHALL route WeChat through a server-side standard OAuth2 adapter before enabling the provider
- **AND** 系统 SHALL NOT put WeChat AppSecret, adapter signing keys, or provider client secrets into frontend-exposed Vite variables

#### Scenario: 微信 adapter 短时桥接预研
- **WHEN** Supabase custom provider calls the WeChat adapter
- **THEN** adapter SHALL preserve Supabase OAuth `state` and PKCE parameters while sending the user to WeChat QR login
- **AND** adapter SHALL consume authorization codes once
- **AND** adapter SHALL store only short-lived state/code/access-token bridge records
- **AND** adapter SHALL return userinfo with a stable `sub` derived from WeChat `unionid` when available, otherwise from current application `openid`

#### Scenario: 微信首次登录即注册
- **WHEN** 未来用户首次通过微信 OAuth 完成授权
- **THEN** 系统 SHALL 由 Supabase Auth 创建新的用户 uid
- **AND** 新用户业务数据 SHALL 绑定该 Supabase uid

#### Scenario: 微信再次登录恢复同一用户
- **WHEN** 未来用户再次使用同一微信身份完成授权
- **THEN** 系统 SHALL 恢复同一个 Supabase 用户 uid
- **AND** 系统 SHALL 读取该 uid 绑定的原有业务数据

#### Scenario: 微信 OAuth 失败
- **WHEN** 未来微信授权取消、回调错误、provider 配置错误或 code exchange 失败
- **THEN** 系统 SHALL 显示可读失败反馈
- **AND** 系统 SHALL 提供回到登录入口的路径
- **AND** 系统 SHALL NOT 暴露 OAuth code、token、AppSecret 或后端原始敏感错误

### Requirement: 多身份数据隔离
系统 SHALL 将邮箱、Google、匿名会话和未来微信会话都收敛到 Supabase `user.id`，并以当前 session 的 `auth.uid()` 隔离业务数据；手机与微信身份在占位阶段 SHALL NOT 创建。

#### Scenario: 登录成功后使用当前 uid
- **WHEN** 任意认证方式成功得到 Supabase session
- **THEN** 系统 SHALL 使用当前 session 的 Supabase `user.id` 作为唯一用户标识
- **AND** 新建业务数据 SHALL 绑定当前 `auth.uid()`

#### Scenario: 不自动合并不同身份
- **WHEN** 同一自然人分别使用邮箱、Google 或未来微信登录但尚未完成显式账号绑定
- **THEN** 系统 SHALL NOT 自动合并这些 Supabase 用户
- **AND** 系统 SHALL NOT 把一个 uid 下的数据展示给另一个 uid

#### Scenario: 家庭成员身份不串号
- **WHEN** 同一设备上不同家庭成员使用不同认证身份进入系统
- **THEN** 系统 SHALL 只展示当前 Supabase uid 绑定的数据
- **AND** 系统 SHALL NOT 因浏览器历史 session 或前端缓存读取其他家庭成员的数据

### Requirement: 公开 Demo 不需要认证
系统 SHALL 允许用户在未登录状态访问公开 Demo 路由，同时保持真实工作区、真实病历和真实统计路由的认证保护。

#### Scenario: 登录页提供 Demo 入口
- **WHEN** 未登录用户访问 `/login`
- **THEN** 页面 SHALL 提供可见的 Demo 入口
- **AND** Demo 入口 SHALL 直接导航到 `/demo/record`
- **AND** Demo 入口 SHALL NOT 打开登录弹层或创建 Supabase session

#### Scenario: 未登录访问 Demo
- **WHEN** 未登录用户访问 `/demo`、`/demo/record` 或 `/demo/analytics`
- **THEN** 系统 SHALL 渲染 Demo 模式
- **AND** 系统 SHALL NOT 跳转到 `/login`

#### Scenario: 未登录访问真实工作区
- **WHEN** 未登录用户访问 `/app`
- **THEN** 系统 SHALL 跳转到 `/login`

#### Scenario: 未登录访问真实病历
- **WHEN** 未登录用户访问非 Demo 的 `/record/:id`
- **THEN** 系统 SHALL 跳转到 `/login`

#### Scenario: 未登录访问真实统计
- **WHEN** 未登录用户访问非 Demo 的 `/analytics/:id`
- **THEN** 系统 SHALL 跳转到 `/login`

#### Scenario: 分享授权码路由保持公开
- **WHEN** 未登录用户访问 `/share/:code`
- **THEN** 系统 SHALL 继续通过授权码边界加载只读分享页
- **AND** 此行为 SHALL 独立于公开 Demo 路由
