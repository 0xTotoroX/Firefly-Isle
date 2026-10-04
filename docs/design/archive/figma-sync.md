# Firefly-Isle Figma 同步方案

> 2026-10-02 状态：本文件保留旧 Figma 同步历史。新方案以 `saas-review/` 评审稿为入口，尚未同步云端。旧品牌/V4 预览路由已删除，不再按下列旧路由执行捕获。

## 历史目标

Figma 是设计真源，Git 是代码真源。

- Figma 负责设计版本、组件、视觉改稿与定稿。
- Git 负责 React/Tailwind/shadcn 实现、测试、回滚与发布。
- 同步通过 Figma MCP 完成；截图只做像素参考，不作为正式设计真源。

## 云端文件

- 文件名：`Firefly-Isle 1:1 Replica`
- URL：<https://www.figma.com/design/ONDnZ5meC4dvSL7IrjbjDY>
- fileKey：`ONDnZ5meC4dvSL7IrjbjDY`

## 页面结构

| Figma page | 用途 |
| --- | --- |
| `00 Current Code Snapshot` | 从当前本地代码生成的可编辑 DOM 基线，只代表当前实现快照。 |
| `01 Design System` | tokens、按钮、侧栏、topbar、输入区、病历卡片、时间线等组件入口。 |
| `02 Drafts` | 自由探索区，可做未验收改稿。 |
| `03 Accepted` | 准备拉回本地实现的定稿区。 |
| `99 Pixel References` | 像素截图和误捕获参考层，不作为主设计真源。 |

## 当前代码快照

`00 Current Code Snapshot` 当前包含这些可编辑 frame：

- `login-dark`
- `login-light`
- `app-dark`
- `app-light`
- `record-dark`
- `record-light`
- `privacy-light`
- `brand-lockup`

这些 frame 来自运行中的本地页面 DOM capture，不是最终截图导入。

## 同步方向

### 本地代码到 Figma

1. 启动本地页面，例如 `npm run dev`。
2. 用 Figma MCP `generate_figma_design` 捕获目标路由到同一个 fileKey。
3. 捕获完成后，把生成 frame 移入 `00 Current Code Snapshot`，按路由和主题命名。
4. 旧截图或失败捕获只保留到 `99 Pixel References`。

捕获脚本只在同步时临时注入，不长期写入 `index.html` 或产品运行时代码。

### 图标修正

`generate_figma_design` 会把 Material Symbols ligature 先转成文字节点。捕获后需要在 Figma 里把这些节点批量改成 `Material Icons / Regular`，并约束为 `24x24` 图标盒，否则会出现 `clinical_notes`、`light_mode`、`health_and_safety` 这类文字串撑开布局。

修正图标后必须做坐标核查：读取本地 DOM 的 `.material-symbols-outlined` bbox，并与 Figma frame 内同名图标的绝对 bbox 对比；超过 1px 的偏移要手动修回。注意只能用同一 capture viewport 对比，例如 `record-light` 当前是 `2048px` 宽 frame，不能直接拿 `1440px` 本地截图做坐标判断。

捕获前也要把侧栏状态固定为默认紧凑态：清掉或重置 `firefly-sidebar-expanded-width-v5`，确保 `SidebarShell` 是 `148px`，不是用户拖拽后的 `296px` 展开态。若误捕获到展开态，`RecordPage` / `MainShell` / `TopBarShell` 的左偏移也会一起变成 `296px`，需要同步修回 `148px`。

长期更稳的方向是把本地 Material Symbols 文本图标迁移为 SVG 图标组件，例如 lucide-react 或项目内专用 SVG。这样后续 DOM capture 会直接生成向量图层，不需要额外的 Figma 字体修正。

当前优先捕获范围：

- `/login`：dark / light
- `/app`：dark / light
- `/record/demo`：dark / light
- `/privacy`
- `/brand-lockup-preview`

### Figma 到本地代码

1. 在 Figma 里把确认要实现的 frame 放入 `03 Accepted`。
2. Codex 读取目标 frame：
   - `get_design_context`
   - `get_screenshot`
   - `get_variable_defs`
3. 将设计意图转译进现有 React/Tailwind/shadcn 结构。
4. 不直接粘贴 Figma 生成代码，不让 Figma 自动覆盖本地源码。
5. 本地实现完成后重新捕获页面，回灌到 `00 Current Code Snapshot`。

## 验证

本地实现从 Figma 拉回后至少执行：

```bash
npm run lint
npm run build
```

视觉验收以浏览器截图和 Figma frame 对比为准，重点看布局、间距、颜色、字体和主要组件状态。

## Code Connect 候选

后续可以逐步建立映射：

- Figma Button -> `src/components/ui/button.tsx`
- Sidebar -> `src/components/system/sidebar-nav.tsx`
- Topbar -> `src/components/system/topbar.tsx`
- Workspace panels -> `src/components/workspace/*`
- Timeline -> `src/components/timeline/TimelineTable.tsx`

Code Connect 只做设计到代码的定位提示，不改变 Git 仍是代码真源的边界。
