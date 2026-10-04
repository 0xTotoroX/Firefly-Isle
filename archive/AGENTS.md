# archive/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
README.md: 本地恢复备份与旧项目索引，链接本轮设计资料分类后的入口。
manifest.json: 两批归档包与原恢复记录的路径/校验值，另指向本轮视觉资料迁移清单；不把历史恢复哈希当作当前入口内容。
backups/: 两批完整本地恢复备份；保留原文件和来源清单，旧工具指令仅在包内作为历史证据。
legacy-projects/: 原桌面旧项目及迁移清单，保留 Git 与未跟踪资源；历史指令改为 .snapshot，旧源码不作为活动开发入口。

法则: 当前输入在 docs/design/current/，历史视觉在 docs/design/archive/，均由根 DESIGN.md 导航。本目录保存恢复备份，载荷保留本机并由 .gitignore 排除；恢复先核对清单，按具体范围取文件，不覆盖当前源码或凭据。legacy-projects 历史代码排除 lint/测试。

[PROTOCOL]: 归档分类、索引或恢复边界变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
