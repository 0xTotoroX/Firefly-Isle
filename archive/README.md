# 项目归档

本目录集中保存 2026-10-04 收回的两批资料及原桌面旧项目，便于在项目内查找。应用源码、数据库迁移和运行资源始终留在原目录；OpenSpec 本轮没有移动。

| 分类 | 项目内位置 | 内容 |
| --- | --- | --- |
| 可直接浏览的设计资料 | [设计入口](design-kit/DESIGN.md) | 原 DESIGN.md、docs/design/，包括新 A 方案、历史 V1–V4、Stitch 原型与截图；另含旧设计系统和页面映射。 |
| 完整设计备份 | [设计归档包](backups/project-materials-20261004-192752.tar.gz) | 外置时的 141 个文件及原清单，包括当时的历史地图文件。 |
| 完整清理备份 | [清理归档包](backups/project-cleanup-20261004-194124.tar.gz) | 1451 个已备份条目，含验收证据、浏览器截图/日志、删除前的兼容指令和当时 work 内的历史产物。 |
| 原桌面旧副本 | [完整旧项目](legacy-projects/Firefly-Isle-desktop-20261004-195835/) | 原 Desktop/Firefly-Isle，保留分支 codex/login-liquid-refraction、Git 历史、原文件和 27 个未跟踪项；只供恢复。 |
| 校验索引 | [manifest.json](manifest.json) | 两个归档包的 SHA-256 及可浏览设计资料的逐文件校验值。 |

## 设计资料入口

- [A 方案设计规范](design-kit/docs/design/saas-review/DESIGN-SYSTEM.md)
- [A 方案交互评审板](design-kit/docs/design/saas-review/index.html)
- [图像模型候选页面](design-kit/docs/design/saas-review/concepts/index.html)
- [旧设计系统](design-kit/docs/products/archive/design-system.md)
- [旧 Stitch 页面映射](design-kit/docs/products/archive/stitch-screen-mapping.md)

A/B 选择仍待用户确认。另一 session 的 B 方案和对比 Demo，以及 Open Design 本地应用，原本在项目外，本轮未迁移或修改。

## 桌面旧副本归档

2026-10-04 将桌面直下的旧 Firefly-Isle 同盘原子移动到上述 legacy-projects 目录。移动后逐项核对 inode、设备、权限、大小、修改时间与符号链接目标，并确认 Git HEAD、分支、refs 与状态保持一致；原桌面目录已不存在。

旧项目的 95 个历史指令入口改名为 .snapshot，内容保留，不自动加载。完整位置、原 Git 状态与恢复名称映射见[迁移清单](legacy-projects/Firefly-Isle-desktop-20261004-195835.manifest.json)。需要恢复原 checkout 时，在独立恢复目录还原这些名称；不要把旧目录当作当前开发入口。当前开发始终使用本 archive/ 的父目录。

## 保留与恢复

归档包和可浏览的设计副本保存在本机项目内，默认被 Git 忽略；本页、地图和校验索引可随 Git 保存。原 Documents 备份继续作为额外恢复副本，日常查阅直接使用此目录。

归档包保存完整备份内容，历史指令文件在包内保持原名，可浏览副本不安装这些指令。恢复时先按 manifest 核对校验值，再解包到独立临时目录，只取需要的资料；不要将旧构建、虚拟环境或旧指令整体覆盖回工作目录。构建输出、覆盖率和空 Wrangler 缓存已清理，不恢复到活动目录。

原清理备份已排除潜在凭据；本轮没有收回或移动该凭据文件，也没有读取其正文。归档未上传、推送或发布。
