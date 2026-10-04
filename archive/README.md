# 项目恢复备份

2026-10-04 按用户要求，将 121 份迁出的设计和参考资料恢复到原目录，并恢复 10 份 AGENTS.md 地图。当前项目保留既有目录架构、功能与依赖；恢复不代表 A/B 选型或前端视觉上线。

## 已恢复的设计资料

- [设计入口](../DESIGN.md)
- [A 方案设计规范](../docs/design/saas-review/DESIGN-SYSTEM.md)
- [A 方案交互评审板](../docs/design/saas-review/index.html)
- [图像模型候选页面](../docs/design/saas-review/concepts/index.html)
- [历史设计系统](../docs/products/archive/design-system.md)
- [历史 Stitch 页面映射](../docs/products/archive/stitch-screen-mapping.md)

正文与截图恢复 docs/design/，历史产品参考恢复 docs/products/archive/。25 份原本未跟踪的 .qa 图片也已恢复本地并保持 Git 忽略。所有 121 份资料内容均按归档清单核对 SHA-256；旧 CLAUDE.md 不恢复为活动指令，继续使用 AGENTS.md。另一 session 的 B 方案和 A/B 对比 Demo 保持原位置，Open Design 仍为本地独立工具。

## 保留的本地恢复备份

| 分类 | 位置 | 内容 |
| --- | --- | --- |
| 完整设计备份 | [设计归档包](backups/project-materials-20261004-192752.tar.gz) | 外置时的 141 份文件及来源清单，含历史地图。 |
| 完整清理备份 | [清理归档包](backups/project-cleanup-20261004-194124.tar.gz) | 1451 个已备份条目，含旧验收产物、截图、日志及旧工具指令。 |
| 原桌面旧副本 | [旧项目](legacy-projects/Firefly-Isle-desktop-20261004-195835/) | 原 Desktop/Firefly-Isle 的 Git、资源及未跟踪文件，供恢复查阅。 |
| 校验索引 | [manifest.json](manifest.json) | 备份包及已恢复设计资料的校验值、原归档位置与恢复日期。 |

旧副本的 95 份历史指令保持 .snapshot 名称，恢复映射见[迁移清单](legacy-projects/Firefly-Isle-desktop-20261004-195835.manifest.json)。当前开发入口为本目录父级的 main，项目位于文稿 Projects；旧副本不覆盖当前源码，构建产物和缓存不安装回活动目录。

备份载荷保持本地且被 Git 忽略，索引和维护地图可随 Git 保存。原 Documents 的额外备份继续保留。清理备份已排除潜在凭据，凭据文件未读取、复制或修改。
