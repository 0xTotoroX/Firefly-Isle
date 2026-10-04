# android/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
app/: Capacitor 生成的 Android app module，承载 namespace、applicationId、MainActivity、manifest 与资源名
capacitor-cordova-android-plugins/: Capacitor Cordova 兼容插件占位 module，由 Capacitor sync 维护
gradle/: Gradle wrapper 运行时文件，保证 Android 工程可重复执行基础任务
build.gradle / settings.gradle / capacitor.settings.gradle: Android 顶层 Gradle 与 Capacitor module 连接配置
variables.gradle / gradle.properties: Android SDK、AndroidX 与构建参数集中入口，不保存 keystore 密码
.gitignore: Android build 输出、local.properties、同步 assets、generated config 与 keystore 文件的忽略边界

gradlew: Gradle wrapper 的 Unix 启动脚本，由原生工程维护，不增加业务逻辑。
gradlew.bat: Gradle wrapper 的 Windows 启动脚本，与 gradle/wrapper 配套。

法则: Android 目录只包装 `dist` 产物；不要在原生侧复制患者记录模型、LLM/OCR 调用或 Supabase 权限规则。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
