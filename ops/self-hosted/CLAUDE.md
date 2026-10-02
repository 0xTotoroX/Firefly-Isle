# ops/self-hosted/

- docker-compose.yml: 基于固定上游版本的容器、网络和挂载配置。
- .env.example: 容器环境变量占位模板，实际 .env 不提交。
- functions.env.example: 当前 LLM/OCR 的环境模板，迁移密文时保留原加密密钥。
- frontend.env.example: 显式自建预览的公开 Vite 变量模板。
- egress.example.yml: 内部 HTTP 出口到既有 SOCKS5 上游的无凭据示例。
- backup.sh: 私有数据库、角色和 runtime 备份及完成集保留规则。
- check-restore.sh: 在本轮创建的临时数据库内验证 archive 恢复。
- firefly-backup.service: root 权限的备份单次任务。
- firefly-backup.timer: 每日备份与错过补跑。
- freeze-source.sql: 正式切换窗口内对旧库安装事务化阻写 trigger。

部署与恢复步骤统一见 ../../docs/operations/supabase-self-hosted.md。禁止提交实际配置、数据卷或备份。
