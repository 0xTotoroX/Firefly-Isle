# ios/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
App/App.xcodeproj/: Capacitor 生成的 iOS Xcode 工程，承载 `App` target、bundle id 与 build setting，不保存签名秘密
App/App/: iOS 原生壳源码与 Info.plist，负责启动 Capacitor WebView 并加载同步后的 Web bundle
App/CapApp-SPM/: Capacitor iOS Swift Package Manager 依赖入口，由 Capacitor 维护
debug.xcconfig: Capacitor iOS debug 配置入口，不应写入 Apple Team、证书或私有 signing 值
.gitignore: iOS 派生产物、同步 public 资源、Pods、DerivedData 与 signing 文件的忽略边界

法则: iOS 目录是现有 Web app 的原生外壳，不是第二套医疗业务实现；业务路由、认证和患者数据真相仍回到 React/Supabase。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
