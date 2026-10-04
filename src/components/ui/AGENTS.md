# src/components/ui/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
liquid-effect-animation.tsx: WebGL 液体背景基元，动态导入 threejs-components liquid1，renderer 只随启停创建/销毁，图片与材质在同一实例上串行热同步，并在不可用时静默回退静态背景

法则: 基础 UI 保持薄层，不把业务语义塞进通用组件。

来源: 根 components.json 使用 shadcn radix-nova、Lucide、CSS variables 与本地 aliases，registries 为空。旧 Button 未被产品使用，已移除；liquid-effect-animation.tsx 来自现有 Three/WebGL 集成，不是 shadcn 控件。此处配置不代表新设计系统的完整组件选型已确定。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
