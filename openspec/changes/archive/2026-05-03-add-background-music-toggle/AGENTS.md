# add-background-music-toggle/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
proposal.md: 说明为什么将 P2 背景音乐想法收敛为全局可控、可恢复、可测试的应用能力
design.md: 记录单一 audio provider、自动播放拦截状态、偏好持久化、共享音乐控制与本地资产边界
tasks.md: 执行清单，按上下文与资产边界、测试先行、核心实现、文档验证拆分
specs/: background-audio 新能力与 app-shell delta spec，约束全局音乐状态、关闭恢复、自动播放拦截和壳层控制位置
.openspec.yaml: OpenSpec schema 元数据，声明本 change 使用 spec-driven workflow

法则: 音乐是全局状态；关闭必须被尊重；浏览器拒绝自动播放不是异常，是现实。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
