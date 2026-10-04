<!--
 * [INPUT]: 依赖 V2 视觉稿、v3-detail-brief.md、用户对菜单收起与滚动节奏的修正意见
 * [OUTPUT]: 对外提供 v3 图像批次说明、输出清单、设计取向与落地注意事项
 * [POS]: Image-2/V3 的批次说明，约束 01-07 图像作为视觉参考而非源码真相源
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# 2026-04-25 v3 Brief

## 定位

v3 不是推翻 v2 的新风格，而是 v2 的细节修正版：

- 产品名统一为 `一页萤屿`。
- 03-06 最初强调左侧菜单收起态；最新接受方向是侧栏默认展开，并用右边界中部的无文字胶囊柄支持单击 icon-only、二次单击隐藏、拖拽调整宽度、窄到阈值后自动 icon-only。
- 菜单隐藏或缩窄后主内容自然变宽，页面仍按从上到下的滚轮阅读流转。
- 05/06 保留 v2 病历档案长卷节奏，避免把治疗线压成一屏密集控制台。

## 输出清单

- `01-login-dark.png`: `/login` dark，品牌入口与身份访问面板。
- `02-login-light.png`: `/login` light，与 01 保持入口骨架一致。
- `03-app-dark.png`: `/app` dark，侧栏收起态提取工作台。
- `03-app-dark-new.png`: `/app` dark 新版预览，使用新的橙黑 mark，并删除“当前提取参数”区块，让病史输入后直接进入治疗时间线表格。
- `04-app-light.png`: `/app` light，侧栏收起态提取工作台。
- `05-record-dark.png`: `/record/:id` dark，侧栏收起态长卷病历档案。
- `06-record-light.png`: `/record/:id` light，侧栏收起态长卷病历档案。
- `07-component-strip.png`: 双主题组件 strip，沉淀按钮、输入、状态、时间线与告警组件语言。

## 设计约束

- 侧栏默认展开宽度按 148px 理解；最窄约 72px，只保留 logo mark、图标、状态点与边界胶囊柄；最大拖拽宽度约 296px。
- 侧栏收起/隐藏不是额外展示态拼贴；它是实际 shell 响应状态，内容区随宽度或隐藏状态重排。
- 03/04 仍以病史输入、提取动作、参数、报告预览为主线。
- 05/06 仍以顶部概要、纵向治疗线、右侧检查/疗效卡片、底部审计为主线。
- v3 图像只提供实现方向；落地时以 `src/`、产品规格与设计 token 为真相源。

## 来源映射

- `01-login-dark.png` <- generated image `ig_040de6d24e166e650169ec7cd24f58819193c5a44db8649599.png`
- `02-login-light.png` <- generated image `ig_040de6d24e166e650169ec7d3bc09c8191b0157b440634c99a.png`
- `03-app-dark.png` <- generated image `ig_0bfe5a9d0afe43ab0169ec8c562be48191aeb812b98be836fe.png`
- `03-app-dark-new.png` <- local image surgery from `03-app-dark.png`，按用户 2026-04-25 反馈替换 mark 并移除“当前提取参数”区块
- `04-app-light.png` <- generated image `ig_0bfe5a9d0afe43ab0169ec8cc8fcb881919c43f160a37f9491.png`
- `05-record-dark.png` <- generated image `ig_0bfe5a9d0afe43ab0169ec8d49905881918979a0eca0fd1698.png`
- `06-record-light.png` <- generated image `ig_0bfe5a9d0afe43ab0169ec8dfdbdbc8191856b316e6fa7c8ce.png`
- `07-component-strip.png` <- generated image `ig_0bfe5a9d0afe43ab0169ec89cc156881919f5347c5bfb10ac9.png`
