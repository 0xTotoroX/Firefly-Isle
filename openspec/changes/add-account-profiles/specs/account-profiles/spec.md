# account-profiles Delta

## ADDED Requirements

### Requirement: Profiles 数据库事实

系统 SHALL 提供 `public.profiles` 表作为账户元数据真相源，并以 RLS 限制访问。

- `profiles.user_id` SHALL 为 `auth.users(id)` 的外键并 `on delete cascade`。
- `profiles.locale` SHALL 只接受 `zh` / `en`；`profiles.theme` SHALL 只接受 `dark` / `light`。
- `profiles.display_name` SHALL 允许 NULL 且长度 ≤ 60 字符。
- 表 SHALL 启用 RLS，且只提供 owner（`user_id = auth.uid()`）的 select / insert / update policy；SHALL NOT 提供 delete policy 或 service_role 旁路。

#### Scenario: 新用户自动建档

- **WHEN** 一个新的 `auth.users` 行被创建
- **THEN** `security definer` 触发器 SHALL 自动插入对应 `profiles` 行（冲突时忽略）

#### Scenario: 未迁移项目降级

- **WHEN** `007_profiles.sql` 尚未应用到当前 Supabase 项目（PGRST205）
- **THEN** 客户端读取 SHALL 返回「无档案」而不抛错，设置页 SHALL 明示偏好仅保存在本机

### Requirement: 账户设置页

系统 SHALL 在 `/settings` 提供登录后可访问的账户设置页。

- 页面 SHALL 展示当前身份（登录邮箱或匿名会话标记）。
- 页面 SHALL 允许读取与保存显示名称、界面语言、外观主题，偏好变更 SHALL 即时生效并持久化到 profiles。
- 侧栏 SHALL 提供固定 `/settings` 入口。

#### Scenario: 保存显示名称

- **WHEN** 用户修改显示名称并提交
- **THEN** 系统 SHALL 将 `displayName` 连同当前 `locale` / `theme` 一起写入 profiles，并给出成功反馈

#### Scenario: 偏好即时生效

- **WHEN** 用户切换界面语言或外观主题
- **THEN** 对应 Provider SHALL 立即更新，且变更 SHALL 异步持久化（失败不打断界面）
