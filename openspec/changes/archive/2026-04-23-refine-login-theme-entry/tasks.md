## 1. Spec and regression guard

- [x] 1.1 创建 change proposal，收束三个浏览器评论为同一个登录页主题入口调整
- [x] 1.2 添加登录页渲染回归测试，先确认当前实现不满足新期望

## 2. Login page shell refinement

- [x] 2.1 从 dark 登录页移除工作区侧栏与侧栏 offset
- [x] 2.2 保留 dark 登录页右下角主题切换能力，并确认不被 footer 遮挡
- [x] 2.3 将 light 登录页主题切换从认证卡片 header 移至右下角悬浮控制
- [x] 2.4 从 light 登录页移除点阵背景，改为纯色 surface
- [x] 2.5 移除 light 登录页右侧竖排水印

## 3. Documentation and verification

- [x] 3.1 同步受影响的模块说明与文件契约
- [x] 3.2 运行 `npm run test`
- [x] 3.3 运行 `npm run lint`
- [x] 3.4 运行 `npm run build`
- [x] 3.5 使用浏览器截图验证 `/login` dark / light 的实际效果
