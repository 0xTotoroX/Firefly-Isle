# 426c97c refactor(core): harden record workflows and retire obsolete previews

## 基本信息

- Commit: `426c97c095e1f79dd3d9729d3dffbf8c1ceadcc3`
- 时间：2026-10-02 19:51（北京时间）；本目录顺序 0024，不表示补齐了中间所有历史提交。
- 分支：`refactor/saas-professionalization`；本地提交，未推送或部署。
- 对应变更：`openspec/changes/archive/2026-10-02-harden-record-integrity-and-simplify/`。

## 完成过程

1. 从干净工作区和既有审查发现出发，保留领域计算与现有 React/Supabase 技术栈，先写本次行为合同。
2. 将病历和报告写入改成 PostgreSQL 事务，保留治疗线/读数身份，校验子记录归属；分享从“验证后按患者 ID 读取”改为授权码 RPC 返回白名单字段。
3. 将工作台深浅主题入口合并为同一状态实例；病历字段按顺序保存。真实 React 延迟请求复核又发现语言切换销毁队列、旧账号 AI 结果写入新账号、追问并发覆盖，随后加入稳定账号生命周期、数据库 expected_owner_id 和互斥提交。
4. 配额改为数据库双窗口原子消费，免费套餐与短时限制同时生效；删除进程计数和查询后记账，CI 加入真实 PostgreSQL 检查。
5. 删除旧 V4/品牌预览及统计页无法落库的编辑。旧 V4 作为废弃方案归档，不把其候选规范应用到生产。
6. 独立制作六部分深色 SaaS 设计文档板，保存规范、变量和截图；核验全新名称候选的注册商结果。用户尚未批准新视觉或正式名称，因此未替换产品外观、品牌和原生 app id。
7. 完成自动检查、Chrome 公共 Demo 与设计板验证，更新产品范围/部署边界，归档 OpenSpec 后提交。

## 验证与问题

已证实命令：`npm test`、`npm run lint`、`npm run type-check`、`npm run test:database`、`npm run build`、`openspec validate record-integrity --type spec --strict`、`git diff --check`。

结果：83 个文件、513 项测试通过。数据库测试覆盖真实角色/RLS、保存回滚、治疗线关联、批次替换、分享授权/过期/撤销以及两条连接争抢最后一次额度。Chrome 验证公开 Demo 连续修改两个字段、统计筛选和无临时编辑入口；设计板验证六部分、390px 布局、表单错误/重试及弹窗焦点。

数据库验收开始时本地 Docker 未启动，启动后在无网络、内存数据的一次性容器中完成；自动唤醒的既有 Linux 虚拟机恢复停止。测试中修正了合成 SQL 字段名和变量歧义，以及测试 helper/归一化预期；完整检查最终通过。构建保留既有 `liquid1.min` 512.51 kB 分包提示。

按用户要求尝试本地 Grok CLI 调研；未拿到可引用的 X 原帖结果，采用官方文档、GitHub 原页与注册商实时结果补充，不宣称 X 调研已成功。

## 证据与边界

- `git show --stat 426c97c`：90 个文件，新增 2011 行、删除 4975 行，包含文档/测试/设计评审稿。
- `docs/design/saas-review/`：交互设计板、规范、变量与浏览器截图。
- `docs/products/core-scope.md` 与 `product-naming.md`：范围、工作流选择、命名依据及域名核验时间。
- `docs/operations/record-integrity-release.md`：部署顺序与兼容边界。

未运行远端迁移、真实模型/支付或原生真机验收。新的保存/分享/配额需协调数据库、Functions 和客户端发布；本地通过不能写成线上已生效。

置信度：高。实现、测试和本地提交有本次直接执行证据；域名状态只对核验时刻有效，商标与微信名称未核验。
