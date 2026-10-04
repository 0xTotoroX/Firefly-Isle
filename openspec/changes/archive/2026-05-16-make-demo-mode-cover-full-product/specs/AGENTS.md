# specs/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
app-shell/spec.md: 壳层 delta 规格，约束无真实记录时进入公开 Demo、真实记录存在时进入用户自有记录、Demo 模式内不跳回受保护 fallback
auth/spec.md: 认证 delta 规格，约束登录页 Demo CTA、/demo、/demo/record、/demo/analytics 公开访问且真实 /app、/record/:id、/analytics/:id 仍受保护
demo-mode/spec.md: 新增 Demo 模式规格，约束完整产品演示、页级 Demo 提醒、统一 demo patient/labResults、可选 Supabase 公开分享码读取、fixture 降级、静态 AI 预览、分享预览、不写真实数据与模式内导航

法则: delta spec 只描述本 change 的新增/变更要求；baseline 等归档后再合并。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
