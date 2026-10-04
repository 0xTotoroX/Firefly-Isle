## 1. OpenSpec 合同

- [x] 1.1 完成 proposal、design、tasks 和 clinical-ai-analysis delta spec。
- [x] 1.2 运行 `openspec validate --all`。

## 2. 分析纯逻辑

- [x] 2.1 新增 AI 分析 prompt 构造，输入当前 PatientRecord 和可选 labResults。
- [x] 2.2 新增 JSON schema/解析/校验工具，拒绝空输出和越界诊断字段。
- [x] 2.3 增加单元测试，覆盖有 lab、无 lab、空记录、非法 JSON 和非诊断文案。

## 3. 档案页入口与 UI

- [x] 3.1 在 `/record/:id` 接入分析入口、加载态、失败态、重试和结果展示。
- [x] 3.2 demo route 禁止伪造真实分析，可展示静态说明或禁用态。
- [x] 3.3 UI 保持 V3 record 页面节奏，不破坏 dossier/Gantt/export。

## 4. 验证与文档

- [x] 4.1 更新 架构说明 与 `docs/products` 状态。
- [x] 4.2 运行相关测试、`npm run type-check`、`openspec validate --all`。
