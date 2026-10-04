# mobile/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

已有的 Capacitor 原生壳集中在这里，当前开发主线仍是 Web。移动壳复用根目录 `dist/`，不维护另一套页面、业务状态或患者数据。

成员清单
ios/: iOS Xcode 工程、原生启动代码、显示名与资源；[地图](ios/AGENTS.md)。
android/: Android Gradle 工程、原生启动代码、显示名与资源；[地图](android/AGENTS.md)。
capacitor.test.ts: 原生目录、依赖路径、稳定应用标识、显示名、脚本与签名隔离合同。

入口与边界
- 根 `capacitor.config.ts` 是 CLI 入口，通过 `ios.path` / `android.path` 指向本目录；Web 构建仍在根 `dist/`。
- 在项目根执行 `npm run mobile:sync`、`npm run mobile:open:ios` 或 `npm run mobile:open:android`，详见 [运行手册](../docs/operations/capacitor-mobile-shell.md)。
- 原生缓存和同步资源由各平台 `.gitignore` 保持忽略；整理目录不等于签名、真机验证或发布。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
