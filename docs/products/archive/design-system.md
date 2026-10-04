# Firefly-Isle 设计系统

## 1. 文档目的

这份文档是当前前端主题系统的语义真相镜像，用来说明：

- 设计证据来自哪里
- token contract 是什么
- component contract 是什么
- dark / light 为什么必须保持结构同构

本文件不是设计稿替代品，而是把 `docs/design/Image-2/V3/DESIGN.md` 与当前实现折叠成可持续维护的系统规则。

---

## 2. 上游设计证据源

当前主题系统的上游设计证据源为：

- `docs/design/Image-2/V3/DESIGN.md`
- `docs/design/Image-2/V3/01-login-dark.png`
- `docs/design/Image-2/V3/02-login-light.png`
- `docs/design/Image-2/V3/03-app-dark-new.png`
- `docs/design/Image-2/V3/04-app-light.png`
- `docs/design/Image-2/V3/05-record-dark.png`
- `docs/design/Image-2/V3/06-record-light.png`
- `docs/design/Image-2/V3/07-component-strip.png`

使用原则：

1. 页面稿是视觉证据，不是运行时设计系统
2. 运行时实现必须先把页面证据提炼成 token 和系统组件，再由页面消费
3. 不允许页面直接依据截图继续散写颜色或结构语义
4. 旧 `docs/design/dark/*`、`docs/design/light/*` 与 Stitch 来源仅作为历史证据，不覆盖 V3

---

## 3. Theme Geometry Contract

dark / light 必须共享同一套空间角色。主题切换改变的是材质与排版语气，不是布局身份。

### 3.1 必须保持不变的结构合同

- 侧栏桌面默认展开宽度：`148px`，默认即为干净的 icon-only 窄栏；移动端默认收起为左侧浮标；最窄图标宽度 `72px`，`148px` 及以下隐藏标签，仅保留图标；最大拖拽宽度 `296px`；点击右边界胶囊在全量显示、仅图标显示、隐藏显示之间循环；拖拽右边界胶囊时连续缩放，低于图标宽度后继续左拖，越过隐藏浮标宽度即完全隐藏；隐藏后保留窄浮标点击恢复，并支持从左边缘向右渐进拉出菜单
- 顶部区域共享同一空间角色
- 主内容起始线保持一致
- 主区默认使用 `shellContentWidthClass` 保持全宽响应；需要档案级宽幅版心时使用 `shellWideContentClass`
- 报告容器的主对齐关系保持一致

### 3.2 响应式 / 固定宽度边界

- `/app`：响应式工作台，外层吃满 shell 可用宽度；输入区与报告预览只在内部使用 grid 比例分栏
- `/record/:id`：响应式宽幅档案，外层使用 `shellWideContentClass`，不允许整页回退到 `980px` 这类固定窄画布；证据卡列按断点从下方堆叠变为右侧证据栏
- `/login`：响应式全视口入口，外层使用全屏 grid；右侧认证面板可以有控制宽度，但不得让整页停留在旧固定 canvas
- `/privacy`：文档阅读页，允许保留 `max-w-[1180px]` 这种阅读宽度；这是文本可读性边界，不是 app shell 边界
- `PrivacyGate`：阻塞弹层，允许 `max-w-3xl`，因为它是 modal 而非页面画布

固定宽度只允许出现在按钮、徽标、弹层、登录卡、短元数据块等局部组件。页面级容器默认响应式，除非 DESIGN.md 明确把它定义为阅读文档。

### 3.3 禁止事项

- 一侧主题使用比例宽度，另一侧使用固定宽度
- 主题切换时改变顶部是否属于主结构
- 主题切换时让主区重新定义信息架构
- 为了“稳定观感”给 app 页面整页套窄 `max-width`

---

## 4. Dark Surface Contract

Dark 主题只能使用有限且具名的 surface 层级：

- `surface.base`
- `surface.shell`
- `surface.sidebar`
- `surface.panel`
- `surface.inset`
- `surface.soft`
- `surface.accent`
- `surface.warning`

分隔线与边框只能来自：

- `border.default`
- `border.muted`
- `border.strong`

强调色只能来自：

- `accent.primary`
- `accent.strong`
- `accent.soft`
- `accent.success`
- `accent.warning`

规则：

1. 不允许页面新增未命名 dark 黑色
2. sidebar 不再被视为独立纯黑宇宙，而是属于同一 dark contract
3. 若现有 token 无法表达语义，必须先修改 token contract，再改页面
4. 橙色是唯一主要行动/焦点/风险色，绿色只表达健康、完成或通过

---

## 5. Token Contract

当前 token 真相源：

- `src/lib/theme/tokens.ts`
- `src/index.css`

### 5.1 几何合同

- `sidebarWidthClass`
- `sidebarOffsetClass`
- `sidebarDefaultWidth / sidebarMinWidth / sidebarMaxWidth / sidebarLabelHideWidth`
- `shellViewportOffsetClass`
- `shellContentWidthClass / shellWideContentClass`
- `topBarHeightClass`
- `topBarOffsetClass`
- `themeTransitionClass`

### 5.2 颜色与表面合同

- `accent.*`
- `border.*`
- `surface.*`
- `text.*`

### 5.3 规则

- 页面组件不得直接发明 hex
- 页面组件不得直接定义新的 surface 语义
- 全局 CSS 中的 literal color 只允许出现在 token 变量定义处
- 全局 CSS 不得恢复 `border-radius: 0 !important`

---

## 6. Component Contract

当前设计系统层分为三层：

```text
src/
├── components/
│   ├── system/
│   ├── ui/
│   └── ...
├── lib/
│   ├── theme/
│   └── ...
└── index.css
```

### 6.1 system 组件

位于：`src/components/system/`

职责：

- `surfaces.tsx`：Sidebar / TopBar / Main / Panel / Section / Action surface 基元
- `topbar.tsx`：dark/light 共享顶部状态条
- `masthead.tsx`：LightMasthead 兼容导出，实际复用共享顶部状态条
- `sidebar-nav.tsx`：默认展开、边线胶囊三态点击、可拖拽缩放到隐藏的响应式侧栏；低于阈值自动 icon-only，隐藏后可点击或左缘渐进拉出，承载 mark、图标导航、主题/语言、隐私/匿名与退出入口

### 6.2 ui 组件

位于：`src/components/ui/`

职责：

- 提供 shadcn 原子组件
- 不承担项目级壳层语义

### 6.3 页面组件

页面只能：

- 组合 system 组件
- 消费 token

页面不能：

- 发明新的壳层结构
- 发明新的主题色
- 绕过 design-system 直接拼接一套视觉规则

### 6.4 登录页边界

`/login` 是未认证入口页，不是工作区壳层。

- 登录页主题切换是页面级 utility，不能塞进认证卡片标题行
- Light `/login` 主背景使用纯色 `surface.base`，不得使用点阵或重复网格纹理
- Light `/login` 不使用右侧竖排水印，避免入口页产生无意义装饰噪声
- 工作区导航只属于 `/app` 与 `/record/:id`，不属于 `/login`

---

## 7. 迁移盘点结论

本轮统一前，散写主题值与结构语义主要集中在：

- `src/components/app-shell.tsx`
- `src/components/login-page-view.tsx`
- `src/routes/workspace-page.tsx`
- `src/routes/record-page.tsx`
- `src/components/timeline/TimelineTable.tsx`
- `src/components/privacy-gate.tsx`
- `src/routes/privacy-page.tsx`
- `src/App.tsx`

本轮已经把这些核心入口迁到 V3 token / system shell 体系。

---

## 8. 协作法则

1. 改设计，先改 token / system contract
2. 改页面，不得跳过 design-system 层
3. 增加新颜色，先问“是不是已有 token 就能表达”
4. 增加新壳层结构，先问“是不是已有 system component 就能承担”
5. 主题切换若产生结构跳变，视为回归

---

## 9. 当前边界

本轮完成的是：

- 主题 token 真相源
- 壳层 system 组件
- 核心页面与关键入口页迁移

后续若继续优化，最值得做的是：

- 继续拆分 `workspace-page.tsx` 与 `record-page.tsx` 的重复 section block
- 把更多页面级结构抽成更小的 system / feature 组件
- 持续减少页面中 `theme === 'dark' ? ... : ...` 的布局分支
