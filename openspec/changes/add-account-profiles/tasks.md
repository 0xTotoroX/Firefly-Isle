# Tasks

## 1. 数据库事实

- [x] 1.1 编写 `supabase/migrations/007_profiles.sql`（profiles 表、CHECK 约束、updated_at trigger、owner RLS、handle_new_user security definer 自动建档）
- [x] 1.2 编写 `supabase/migrations/profiles.test.ts` SQL 合同测试（约束、RLS、无 service_role、自动建档触发器）

## 2. 客户端仓库层

- [x] 2.1 编写 `src/lib/profile-settings.ts`（getUserProfile / saveUserProfile、缺表降级、在线依赖错误归一）
- [x] 2.2 处理 TS 6 推断类型谓词把 PostgrestError 收窄为 never 的边界（先取 message 再走守卫）

## 3. 设置页面

- [x] 3.1 新增 `/settings` 路由（认证守卫 + lazy 加载）与 `public/_redirects` 重写
- [x] 3.2 实现账户身份展示、显示名称、界面语言、外观主题的读写与即时生效
- [x] 3.3 实现档案服务缺失降级提示（偏好仅本机生效）
- [x] 3.4 侧栏新增固定设置入口并同步头部注释
- [x] 3.5 编写 `settings-page.dom.test.tsx` 行为回归测试

## 4. 验证

- [x] 4.1 `npm run test` / `npm run lint` / `npm run type-check` / `npm run build` 全绿（400 tests）
- [ ] 4.2 真实 Supabase 项目应用 `007_profiles.sql` 并人工验收设置页读写（需项目 owner 执行，见 runbook）
