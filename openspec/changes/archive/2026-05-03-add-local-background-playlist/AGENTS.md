# add-local-background-playlist/
> L2 | 父级: [AGENTS.md](../../AGENTS.md)

成员清单
.openspec.yaml: OpenSpec change 元数据，声明 spec-driven schema 与创建日期
proposal.md: 本地授权背景歌单 change 提案，界定为什么从单曲开关升级为简洁歌单
design.md: 本地授权背景歌单技术设计，固定 manifest、控制器状态、结束前进与简洁 UI 决策
tasks.md: 实施清单，按测试、控制器、简洁 UI、文档验证拆分可追踪任务
specs/: 本地歌单与 app-shell delta specs，约束曲目清单、选择持久化、切歌行为与紧凑控件

法则: 此 change 只处理本地授权歌单，不处理 Apple Music 下载、DRM 绕过或完整播放器扩展。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
