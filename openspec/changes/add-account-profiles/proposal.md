# Why

产品要走向专业 SaaS，但当前身份体系只有 Supabase `auth.users` 的裸会话：没有任何用户可见的账户层。用户无法设置显示名称，无法声明自己的界面语言与外观主题偏好；后续的配额、订阅、数据导出/删除也都缺一个账户归属的落点。

同时 SaaS 化需要「账户设置」这个标准入口承载隐私合规动作（导出、删除），这些动作需要 profiles 作为账户元数据真相源。

# What Changes

- 新增 Supabase 迁移 `007_profiles.sql`：`profiles` 表（user_id 主键 FK → `auth.users` on delete cascade）、`display_name`（≤60 字符）、`locale`（zh/en CHECK）、`theme`（dark/light CHECK）、updated_at trigger、owner RLS（select/insert/update，无 delete policy，无 service_role 旁路）。
- 新增 `security definer` 触发器 `on_auth_user_created`：每个新注册用户自动建档（`on conflict do nothing`），不引入 service role key。
- 新增 `src/lib/profile-settings.ts` 客户端仓库层：`getUserProfile` / `saveUserProfile`；`007` 迁移未应用时读取降级为「无档案」不阻塞页面；错误经 OnlineRequiredError 归一。
- 新增 `/settings` 账户设置页（登录守卫）：账户身份展示（邮箱 / 匿名会话）、显示名称、界面语言偏好、外观主题偏好；偏好变更即时生效（LocaleProvider / ThemeProvider）并持久化到 profiles，档案服务不可用时降级为仅本机生效并明示。
- 侧栏新增固定「设置」入口（Material `settings` 图标），`public/_redirects` 增加 `/settings` SPA 重写。
- 顶栏「设置占位」合同测试范围收窄到 topbar 源码：产品现在有真实设置入口，全局 markup 不再禁止 `settings` 字样。

# Capabilities

## New Capabilities

- `account-profiles`: 用户账户档案能力，包括 profiles schema 合同（FK cascade、locale/theme CHECK、owner RLS、自动建档触发器）、客户端读写协议、缺表降级边界与 `/settings` 页面行为（身份展示、显示名称保存、偏好即时应用与持久化、降级提示）。

## Modified Capabilities

- `app-shell`: ArchiveSideNav SHALL 提供固定 `/settings` 导航入口；`/settings` SHALL 加入认证路由与 Cloudflare Pages SPA 重写。
