<!--
 * [INPUT]: 依赖 package.json、capacitor.config.ts、ios/、android/、dist/ 与 OpenSpec add-capacitor-mobile-shell 合同。
 * [OUTPUT]: 对外提供 Capacitor iOS/Android 本地壳 build、sync、打开、检查与受限项记录。
 * [POS]: docs/operations 的移动壳运维 runbook，证明本仓库只包装现有 Web app，不声称已完成商店发布。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# Capacitor Mobile Shell

## Source Of Truth

- `capacitor.config.ts`
- `package.json`
- `ios/`
- `android/`
- `openspec/specs/capacitor-mobile-shell/spec.md`

## 固定边界

- app id: `com.ghibli1024.fireflyisle`
- app name: `一页萤屿`
- webDir: `dist`
- 同步顺序: `npm run build` -> `npx cap sync`
- 业务实现仍在 Vite/React/Supabase；iOS/Android 目录只承载原生壳和平台工程。
- 不提交 signing secrets：`*.p12`、`*.cer`、`*.mobileprovision`、`*.provisionprofile`、`*.jks`、`*.keystore`。

## 常用命令

```sh
# 在当前活动项目根目录执行
npm run mobile:sync
npm run mobile:open:ios
npm run mobile:open:android
```

单独检查原生工程：

```sh
# 在当前活动项目根目录执行
xcodebuild -list -project ios/App/App.xcodeproj
cd android && ./gradlew tasks
```

## 发布前验证矩阵

| 目标 | 命令 / 动作 | 当前要求 |
| --- | --- | --- |
| Web production bundle | `npm run build` | 必须通过 |
| Capacitor sync | `npx cap sync` | 必须同步 iOS 与 Android |
| iOS project metadata | `xcodebuild -list -project ios/App/App.xcodeproj` | 有 Xcode 时必须通过 |
| Android Gradle metadata | `cd android && ./gradlew tasks` | 有 JDK/Android 工具链时必须通过 |
| iOS Simulator | Xcode 运行 `App` target | 交付前记录通过或受限原因 |
| iOS 真机 | Xcode 选择真机运行 | 交付前记录通过或受限原因 |
| Android Emulator | Android Studio / Gradle 安装运行 | 交付前记录通过或受限原因 |
| Android 真机 | USB 调试安装运行 | 交付前记录通过或受限原因 |

## 当前本机检查记录

2026-05-17:

- `npm run build`: 通过；保留 Vite chunk-size warning。
- `npx cap sync`: 通过；已同步 Android 与 iOS。
- `xcodebuild -list -project ios/App/App.xcodeproj`: 受限；当前 active developer directory 是 `/Library/Developer/CommandLineTools`，本机未切到完整 Xcode。
- `cd android && ./gradlew tasks --no-daemon`: 受限；本机无法定位 Java Runtime。

## 产品流检查

移动壳不是第二套产品。每次真机或模拟器验证至少覆盖：

- 冷启动、隐私门控、登录恢复。
- 公开 `/demo`、`/demo/record`、`/demo/analytics`。
- `/app` 文件上传入口与 OCR 网络失败边界。
- `/record/:id` 档案 / 极简表格 / Gantt 切换。
- `/analytics/:id` 实验室趋势页。
- `/share/:code` 只读分享。
- AI/OCR 弱网失败态、PDF/PNG 导出、复制分享链接降级。

## 不要做

- 不在本 change 声称 App Store、TestFlight、Google Play 或生产签名发布完成。
- 不把原生本地缓存作为患者数据真相源。
- 不把 Supabase auth、RLS、Edge Function、LLM/OCR proxy 绕到原生侧。
- 不提交 `dist/`、`ios/App/App/public/`、`android/app/src/main/assets/public/` 这类同步产物。
