# Codex Cloud 开发环境

本手册针对新版 Codex Cloud。它运行开发与检查，不负责发布产品网站或切换生产数据库。最后核查官方文档：2026-10-02。

## 代码与工具

- 仓库：`0xTotoroX/Firefly-Isle`。环境初始基线来自已经整合的 `main`，任务从明确的 Git 分支/提交开始；任务报告记录 `git rev-parse HEAD`、分支和工作树状态。
- Runtime：Node.js 22、npm lockfile；安装 `npm ci`。原生 iOS/Android 构建留在具有对应 SDK 的独立环境，Web 检查不要求安装 Xcode。
- 仓库根 `AGENTS.md -> CLAUDE.md` 是相对链接，随 Git 同步；本机全局指令与个人 Skills 不会自动同步。云端任务按仓库文档执行，不依赖 `/Users/Totoro/` 路径。
- Grok CLI 是本机可选研究工具，不是构建依赖；不要复制本机登录凭据到环境镜像。云端可使用已授权的联网检索和 GitHub 原始来源替代，并记录来源。
- 无需新增 Superpowers 执行层；保留 OpenSpec 的产品合同与任务清单。编写代码、检查及审查按明确任务拆分，避免让多个任务同时往同一分支推送。

## 创建与发布环境

在 Settings → Codex Cloud → Environments 创建环境，只选择本仓库。保持私有；使用已有 GitHub 授权，不添加生产数据库、真实病历、用户 Key 或支付密钥。

安装阶段需要 npm registry、GitHub；数据库检查还需 Docker 守护进程和 `postgres:18-alpine`。安装镜像后，数据库测试以 `--network none` 启动临时容器，避免访问远端数据库。网络 allowlist 应按实际失败的主机补充，不能用“已允许网络”代替服务鉴权验证。

建议给环境设置助手的指令：

> 使用仓库锁文件安装 Node.js 22 和 npm 依赖，配置开发服务器启动命令 `npm run dev -- --host 0.0.0.0`。验证 lint、完整类型检查、单元测试和生产构建。检查 Docker 是否可用，若可用则下载 postgres:18-alpine 并运行 npm run test:database；若不可用，准确记录限制并由 GitHub CI 补验，不能把它记成通过。不要连接生产数据库或索取生产密钥，不修改产品代码，不提交或部署。报告 Git SHA、运行命令、结果和产物路径，并保存经验证的 install script 与 start skill。

构建和公开静态 Demo 不需要私钥。需要验证 API 时只使用独立测试后端和合成资料；前端公开配置与函数端密钥分别配置。`VITE_` 变量会进入浏览器，不得放 service-role、模型或 Stripe 私钥。

保存配置后 Publish。官方文档说明保存与发布不同：发布捕获供新任务使用的准备状态，现有任务仍保留自己的文件状态；后续修改环境后 Republish，并开新任务复验。

## 独立任务验收

环境发布成功只是中间状态。必须在新的云任务里核对仓库/分支/SHA，然后执行：

```bash
npm ci
npm run lint
npm run type-check
npm run test
npm run build
npm run test:database
```

最后一项要求已准备 Docker 与测试镜像；不可用时明确记录失败原因。确认 `dist/index.html`、打包资源、PWA 文件实际存在，附各项退出状态。报告必须来自运行输出，不能照抄环境说明。

## 云端成果回到主线

1. 新工作从当前已验收 main 创建 `codex/<范围>` 分支，先读取相关 OpenSpec、目录说明和未提交变更。
2. 云任务完成适用检查并产生范围明确的 commit；推送该分支后核对远端 SHA，再进入 PR/审核流程。
3. CI 是完整迁移、RLS、类型、单测与构建的共同门禁；`main` 和 `codex/**` 的 push、面向 main 的 PR 及手动运行均可触发。开发分支同步就能检查，不依赖先合并 main。本地拉取同一 commit 做浏览器与导出验收，不在另一份长期副本继续开发。
4. 合并前核对用户需要的交付范围；发布网站、后端函数与数据库按各自发布手册执行，不能随 main push 自动宣称上线。
5. 不自动启用周期任务或额外付费服务。Cloud 的任务、环境发布、GitHub CI、产品部署分别记录证据。

## 当前记录

- 账户已实见新版 Codex Cloud，既有 `soota` 与 `codex-buddy` 环境；GitHub 连接已能列出本仓库。
- 环境 `Firefly-Isle` 已于 2026-10-02 发布，界面确认“环境已发布”，访问范围为“仅限我自己”；没有添加生产凭据。配置任务为 `Set up Firefly-Isle`，ID `01a0fd2a-6122-7607-807f-dfd992a7702f`。
- 云端实际基线 `2f1e42ef3cd716ef032794f03982ad6739450722`，Node.js 22.23.3。`npm ci`、lint、完整类型检查、86 文件/531 项测试、隔离数据库检查和 build 全部退出 0；安装脚本复跑、开发服务重启通过。`dist/index.html` 存在，产物共 91 文件、约 30 MB，构建有既有大分包警告。
- install script 和 start skill 已保存并纳入私有环境。尚待独立新任务验证快照恢复，以及本轮后续新代码同步后的复验。
- 本轮产品提交为 `5eb85a7`、`a4b3191`，开发分支 CI 配置为 `2754acd`，统一交付在 `codex/saas-product-completion`。新云任务须先读取该分支最新 SHA，并执行上述检查；已发布环境中的旧基线结果不能替代本轮验收。
- 当前独立任务入口仍有阻碍：网页新建入口只列出 ChatGPT Work 项目，桌面工具未暴露选择新版 Cloud 环境的参数；本机 Codex CLI 0.159.3 使用已核实的环境 ID 执行 `cloud exec` 返回 `no cloud environments are available for this workspace`。不能据此认为新版环境未发布，也不能把旧 CLI 或普通 Work 任务当作本环境验收。待客户端提供可绑定该环境的新任务入口后补验。
- 官方配置元数据：环境 ID `6ea1a5db-45a5-466a-9fbb-8eed20c0226d~cecfg_6abfc94d0f68819caf981d2b6b37b144`；已发布版本 ID `6ea1a5db-45a5-466a-9fbb-8eed20c0226d~cecfgver_6abfcbbc3e6c819c8ab32ad51cdfaad6`。配置助手通过官方工具核对版本与运行状态一致，无待保存草稿。
- 新版官方限制仍包含电脑/浏览器操作不受支持；云端检查不能代替本地浏览器布局、交互、文件导出与真机验收。

来源：[Codex Cloud](https://learn.chatgpt.com/docs/cloud)、[环境设置、发布状态和限制](https://learn.chatgpt.com/docs/environments/cloud-environments)、[运行位置与隔离](https://learn.chatgpt.com/docs/environments/modes)。

CI 分支与手动触发依据：[GitHub workflow 事件和分支过滤](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)。此工作流只检查和构建；产品发布仍由独立 CD 的 tag/手动流程负责。
