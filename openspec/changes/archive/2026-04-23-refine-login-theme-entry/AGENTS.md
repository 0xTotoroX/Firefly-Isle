# refine-login-theme-entry/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明本 change 的问题来源、用户评论收束、影响范围与不触碰 Auth/Supabase/路由行为的边界
design.md: 记录登录页不承载工作区导航、主题切换属于页面级 utility、light 背景回归纯色 surface 的设计决策
tasks.md: 执行清单，只反映 OpenSpec、红灯测试、实现、验证的真实完成状态，不提前勾选未验证步骤
specs/: app-shell 与 theme-system 的 delta specs，定义 /login 入口壳层和主题合同变化

.openspec.yaml: OpenSpec 变更元数据，声明 schema 与创建日期。

法则: 登录页是入口，不是工作区；文档只记录已经发生或被 spec 接受的事实。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
