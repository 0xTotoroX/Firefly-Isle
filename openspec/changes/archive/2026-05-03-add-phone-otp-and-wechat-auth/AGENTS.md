# add-phone-otp-and-wechat-auth/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
README.md: change 入口，说明手机/微信占位与认证边界的阅读顺序
proposal.md: 说明为什么暂缓短信手机登录并将微信登录降级为敬请期待占位
design.md: 记录手机/微信敬请期待占位、微信 adapter 预研资产、账号隔离、UI 状态机与外部配置边界
tasks.md: 执行清单，按配置确认、测试、UI、Auth 逻辑、数据隔离和验证拆分
specs/: auth delta spec，约束手机/微信占位、可用认证入口、会话恢复和数据绑定行为
.openspec.yaml: OpenSpec schema 元数据，声明本 change 使用 spec-driven workflow

法则: 认证入口必须由真实 Supabase Auth 能力支撑；未接通的 provider 不得伪造 session。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
