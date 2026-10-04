# src/lib/workspace/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

工作台状态与动作。页面只组合现有组件；服务端事务和模型/OCR 协议继续复用原有客户端。

| 文件 | 职责 |
| --- | --- |
| state.ts | 状态与动作上下文类型、初始状态、追问/失败补丁和 OCR 文本归一纯函数 |
| use-workspace-controller.ts | 当前账号/患者生命周期、初次恢复、持久化接线、化验读回和重试分派 |
| extraction-actions.ts | 新建提取、追问、幂等创建 ID 和失败后仅重试保存 |
| editing-actions.ts | 自然语言字段修改、串行字段保存及失败回滚 |
| ocr-actions.ts | 文档识别、确认或丢弃文字；与模型和保存动作共享互斥令牌 |

主题、语言与同账号会话刷新不能重建草稿或字段队列；账号/患者切换使旧请求失效。OCR 结果需确认才提取；演示使用虚构固定示例。相关生命周期回归位于 src/routes/workspace-state.test.tsx。

[PROTOCOL]: 文件职责/接口变化时同步本图与 L3；仅父级条目受影响时更新父图。
