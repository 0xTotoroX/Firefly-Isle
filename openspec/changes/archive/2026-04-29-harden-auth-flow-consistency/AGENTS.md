# harden-auth-flow-consistency/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
README.md: change 入口，说明阅读顺序与认证一致性收口目标
proposal.md: 说明为什么保留 Supabase Auth 并修正登录、注册、匿名、密码重置与 Google OAuth 的一致性边界
design.md: 记录认证内核不替换、假入口删除、真实 Supabase Auth 能力接通与状态机统一的设计决策
tasks.md: 执行清单，按规格决策、测试、UI 一致性、Auth 逻辑、验证拆分
specs/: auth delta spec，约束认证入口与 Supabase Auth 能力的用户可观察行为

.openspec.yaml: OpenSpec 变更元数据，声明 schema 与创建日期。

法则: 页面上出现的每个认证入口都必须是真的；假的选择消失，真实能力接通。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
