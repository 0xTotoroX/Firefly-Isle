# add-scroll-story-landing/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
.openspec.yaml: OpenSpec change 元数据，标记 spec-driven 工作流
README.md: change 标题与短描述，说明 /login 从单屏介绍页改为纵向滚动叙事落地页
proposal.md: 变更动机与范围，锁定滚动叙事替代单屏介绍、移除登录页 Demo CTA、保留 /demo 路由与单一 /login 路由边界
design.md: 技术设计，记录 2026-10-05 自有原生控制器替代决策并保留早期参考实现取证结论（GSAP+ScrollTrigger、零 pin、CSS sticky+高 spacer、scrub 分档、视口内 start/end）、八章叙事序列、参数映射表与 SSR/生命周期/WebGL/reduced-motion 边界
tasks.md: 执行清单，按取证决策、依赖基建、叙事结构、滚动编排、文档同步和验证六组拆分任务
specs/: delta 规格目录，定义 scroll-story-landing 新能力及 app-shell / demo-mode / theme-system 边界变更

法则: 叙事顺序承载信息，动画只承载节奏；reduced-motion 降级后内容必须完整可读。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
