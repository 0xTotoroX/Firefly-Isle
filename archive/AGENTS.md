# archive/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
README.md: 本地恢复备份与旧项目索引，链接已经恢复原目录的设计资料。
manifest.json: 两批归档包的 SHA-256、121 份已恢复设计文件的路径与校验值，以及恢复的 AGENTS 地图。
backups/: 两批完整本地恢复备份；保留原文件和来源清单，旧工具指令仅在包内作为历史证据。
legacy-projects/: 原桌面旧项目及迁移清单，保留 Git 与未跟踪资源；历史指令改为 .snapshot，旧源码不作为活动开发入口。

法则: 当前设计入口为根 DESIGN.md，正文恢复到 docs/design/ 与 docs/products/archive/；本目录只保存恢复备份，保留本机并由 .gitignore 排除载荷。恢复先核对 manifest，按具体范围取文件；不覆盖当前源码、凭据或重新安装 CLAUDE.md。legacy-projects 的历史代码排除 lint/测试。

[PROTOCOL]: 归档分类、索引或恢复边界变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
