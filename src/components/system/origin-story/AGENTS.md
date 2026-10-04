# origin-story/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
origin-story-content.ts: 创作初衷阅读弹层的唯一公开内容源，集中提供完整故事、正文末尾纯文本来源地址、拼接正文与页脚文案
origin-story-content.test.ts: 公开内容与正文末尾纯文本来源地址合同测试，阻止展示层重新引入非公开材料或独立链接控件
origin-story-paper.tsx: 顶栏生命故事图标触发的 V3 Clinical Archive Console 阅读弹层，使用项目 surface/text/border token、可见关闭按钮和单一 DOM 滚动层呈现公开正文，并负责 Esc、遮罩关闭、焦点约束、滚动锁定与焦点恢复
origin-story-paper.test.ts: 创作初衷阅读弹层结构合同测试，覆盖暗亮同构 token、普通字重尾段、正文末尾纯文本来源、可见关闭入口与无 Canvas/WebGL 边界

法则: 公开内容与阅读交互分离；弹层复用 V3 系统 token，不自建纸张材质、绘制管线或 WebGL 上下文。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
