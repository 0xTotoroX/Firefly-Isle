# 2754acd 开发分支 CI

对应提交：`2754acd ci: validate codex development branches`。

CI 现在响应 `main` 和 `codex/**` 的 push、面向 main 的 PR 及手动运行。整合后的开发分支可以先完成数据库、类型、测试与构建检查，再接受合并审查。

发布工作流仍由版本 tag 或手动操作触发，并检查部署提交属于 main。开发分支同步只触发检查；没有部署网站、函数或数据库。

已核对 GitHub 官方的分支过滤与手动事件说明、工作流结构和独立 CD 触发条件。该提交的远端运行结果需按交付分支实际 SHA 查看，旧 main 的 CI 成功不作为本轮证据。
