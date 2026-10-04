# V1/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
brief.md: 本批次 Image2 重构目标、输入截图、输出命名与执行边界
qa-checklist.md: 本批次视觉验收清单，覆盖结构保真、双主题统一、中文可读性与失败回退条件
run-cli.md: 在内置 Image2 工具不可用时，通过 imagegen CLI fallback 续跑的命令说明
prompts/: 7 张重构稿的一图一 prompt 输入包，按输出序号命名
01-login-dark.png: 已生成，/login dark 视觉重构稿，来源 login-dark-full.png，经内置图像工具输出后复制入库
02-login-light.png: 已生成，/login light 视觉重构稿，来源 login-light-full.png，经内置图像工具输出后复制入库
03-app-dark.png: 已生成，/app dark 视觉重构稿，来源 app-dark-full.png，经内置图像工具输出后复制入库
04-app-light.png: 已生成，/app light 视觉重构稿，来源 app-light-full.png，经内置图像工具输出后复制入库
05-record-dark.png: 已生成，/record/demo dark 视觉重构稿，来源 record-dark-full.png，经内置图像工具输出后复制入库
06-record-light.png: 已生成，/record/demo light 视觉重构稿，来源 record-light-full.png，经内置图像工具输出后复制入库
07-component-strip.png: 已生成，双主题组件陈列条，来源 6 张 runtime screenshots，经内置图像工具输出后复制入库

法则: 生成稿是设计参考，不是可编辑 UI；任何落地实现必须回到 src 与 design-system token。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
