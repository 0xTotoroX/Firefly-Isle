## 1. OpenSpec 合同

- [x] 1.1 完成 proposal、design、tasks、record-sharing 与 supabase-schema delta spec。
- [x] 1.2 运行 `openspec validate --all`。

## 2. 数据模型与权限

- [x] 2.1 新增 `record_shares` 迁移、索引和 RLS policy。
- [x] 2.2 新增分享创建、撤销、读取的 lib 边界和 hash/code 工具。
- [x] 2.3 增加测试覆盖 owner、非 owner、错误码、撤销、过期。

## 3. 前端体验

- [x] 3.1 在真实 `/record/:id` 增加分享入口、状态、复制链接和撤销动作。
- [x] 3.2 新增只读分享访问路由，复用 record 展示但禁用编辑。
- [x] 3.3 增加过期、撤销、错误授权码的可读状态。

## 4. 验证与文档

- [x] 4.1 更新 架构说明 与 `docs/products` 状态。
- [x] 4.2 运行相关测试、`npm run type-check`、`openspec validate --all`。
