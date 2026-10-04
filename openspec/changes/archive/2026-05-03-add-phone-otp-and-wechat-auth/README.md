# add-phone-otp-and-wechat-auth

扩展认证入口：手机登录先显示“敬请期待”，微信作为中国区优先认证入口接入 Supabase custom OAuth provider。

阅读顺序:

1. `proposal.md` - 为什么要扩展认证入口，以及哪些能力会改变
2. `design.md` - 账号模型、UI 状态机、Supabase 边界与外部配置决策
3. `specs/auth/spec.md` - auth capability 的用户可观察行为增量
4. `tasks.md` - 实施与验证清单

[PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
