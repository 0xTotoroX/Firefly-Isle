<!--
 * [INPUT]: 依赖 V3 生产视觉系统、/login 与公开 Demo 运行时审计、refresh-product-visual-system-v4 OpenSpec 合同及 Emil Kowalski 式设计工程原则
 * [OUTPUT]: 对外提供 V4 候选设计系统的注意力层级、语义 token、排版、材质、组件、动效、响应式与迁移边界
 * [POS]: Image-2/V4 的评估真源；在产品负责人选定方向前只约束 /design-preview，不替换 V3 生产实现
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# 一页萤屿 V4 Evaluation Design System

## Status

- **阶段**：候选评估，不是生产迁移。
- **评估真源**：本文件 + `/design-preview` 的真实浏览器渲染。
- **生产真源**：方向被明确选定前仍是 `docs/design/Image-2/V3/DESIGN.md` 与现有 `src/` token/组件。
- **默认推荐**：A · Clinical Calm / 临床静观；推荐不等于最终选择。
- **选择原则**：比较同一内容和同一结构的材料、层级、排版与品牌语气，不比较不同功能。

## Design Thesis

V4 不再把“设计感”理解为更多边框、更多字体变化或更多装饰。它只做四件事：

1. **先回答临床问题**：患者是谁、当前正在发生什么、哪些信息需要注意。
2. **让角色决定视觉**：品牌、动作、信息、异常、数字和注释各自使用稳定语义。
3. **让层级来自材料与留白**：边框只在分隔、焦点、选择和安全边界出现。
4. **让动效解释状态**：不延迟高频阅读，不把页面切换做成表演。

## Runtime Audit

| Before | After | Why |
| --- | --- | --- |
| 大量嵌套 `1px` 边框，每块内容都像同等重要的盒子 | 用 `base → canvas → surface → raised` 四级材料、间距和少量关键分隔建立主次 | 让注意力先落在患者、当前治疗和异常指标，而不是容器轮廓 |
| Serif 同时用于标题、导航、数据和普通控件 | Serif 只保留品牌与少数编辑型标题；正文和控件用 UI sans；日期、标识符、测量值用 mono/tabular | 字体表达信息角色，而不是成为全页装饰 |
| 橙色同时承担品牌、按钮、选中、警告和大数字 | 橙色只负责品牌焦点与主要动作；信息、成功、注意、危急使用独立语义色并配文字/图标 | 所有内容不再争抢同一注意力资源 |
| Dark 页面由多个近似黑色面板叠加 | 收敛为四级深色材料，并限制 raised 层数量 | 避免“黑盒套黑盒”，让空间关系可读 |
| Light 主题像 Dark 的简单浅色反转 | Light 使用温暖纸张/陶瓷材料；Dark 使用低反射深色材料，但结构、动作与语义同构 | 主题切换是材料变化，不是重新学习界面 |
| 指标首屏同时出现 Demo、状态开关、统计卡、分类、列表和图表 | 固定任务顺序：患者与当前治疗 → 异常摘要 → 指标浏览 → 当前指标详情 | 降低首屏认知负担 |
| 分享区在记录页首屏抢占主舞台 | 分享、导出和审计降级到辅助 action rail | 病历页首屏先回答“现在发生了什么” |
| 路由切换初始帧短暂模糊或隐藏 | 仅保留 `opacity + 4px` 的短进入反馈；常用数据浏览不动画 | 动效不能延迟信息出现 |

## Shared Information Architecture

三个候选必须复用以下顺序和 DOM 结构：

1. **Evaluation bar**：候选、Light/Dark、评估说明。
2. **Product shell**：品牌、主导航、搜索/通知/账户辅助动作。
3. **Patient state**：姓名、诊断、当前治疗、下次复查。
4. **Attention summary**：三条需要优先处理的信息，始终使用文字与图标。
5. **Lab browser**：指标分类与当前指标列表。
6. **Metric detail**：当前指标、趋势、参考范围、变化说明。
7. **Treatment timeline**：只展示支持当前判断所需的最近治疗节点。
8. **Secondary actions**：分享、导出、审计，不抢占主层级。

候选不得通过删除复杂信息、移动主要动作或改变数据来显得更“干净”。

## Token Architecture

V4 使用三层 token：

```text
reference token  ->  system role token  ->  component token
具体颜色/尺寸        surface/action/state     patient-card/chart/button
```

候选只替换 reference 映射。组件只能消费 system/component role：

```css
--ff-v4-bg-base
--ff-v4-bg-canvas
--ff-v4-bg-surface
--ff-v4-bg-raised
--ff-v4-text-primary
--ff-v4-text-secondary
--ff-v4-text-muted
--ff-v4-line
--ff-v4-action
--ff-v4-info
--ff-v4-success
--ff-v4-attention
--ff-v4-critical
--ff-v4-focus
```

禁止 `--record-card-orange`、`--analytics-blue-panel` 这类页面/外观耦合命名。

## Candidate A · Clinical Calm / 临床静观

### Intent

温暖中性色、清晰的临床任务顺序、极少边框和柔和层级。目标是长时间阅读不疲劳，同时保留“一页萤屿”的橙色行动焦点。

### Light Palette

| Role | Value | Use |
| --- | --- | --- |
| Base | `#EEECE6` | 浏览器外缘与壳层背景 |
| Canvas | `#F6F5F1` | 主工作区 |
| Surface | `#FFFFFF` | 关键内容面 |
| Raised | `#FCFCF9` | 浮起工具/摘要面 |
| Text primary | `#17211F` | 主正文与标题 |
| Text secondary | `#56625D` | 说明正文 |
| Text muted | `#7B8580` | 元信息 |
| Line | `#DCE2DD` | 必要分隔 |
| Action | `#D85E32` | 主动作与品牌焦点 |
| Info | `#3E6F7A` | 临床信息 |
| Success | `#387A5A` | 已完成/稳定 |
| Attention | `#B87924` | 待关注 |
| Critical | `#B84B4B` | 明确危急/异常 |

### Dark Palette

| Role | Value |
| --- | --- |
| Base | `#0E1211` |
| Canvas | `#141917` |
| Surface | `#1A211E` |
| Raised | `#222A27` |
| Text primary | `#F3F1EA` |
| Text secondary | `#BDC4BF` |
| Text muted | `#8F9993` |
| Line | `#303A36` |
| Action | `#F07A48` |
| Info | `#7CB3BE` |
| Success | `#72B58D` |
| Attention | `#DCA75B` |
| Critical | `#EA8078` |

### Material

- 圆角：面板 `18px`，控件 `10–12px`，状态胶囊 `999px`。
- 阴影：只用于 raised，Light `0 18px 55px rgba(32,45,39,.08)`；Dark 主要用 tonal contrast。
- 边框：卡片默认无边框；列表分隔、focus 与 selected 使用 line。
- 品牌：橙色面积小于可视面积的约 5%，避免全页变成行动警报。

### Best Fit / Risk

- **适合**：长期全站基线、高密度临床信息、跨 light/dark。
- **风险**：若过度收敛，会接近通用 SaaS；需要在 mark、语言和少量材质细节保留品牌。

## Candidate B · Firefly Glass / 萤光舷窗

### Intent

以深海舷窗和萤火为品牌隐喻：深海蓝黑、低透明玻璃、克制的琥珀发光与冷青临床信息。品牌感最强，但玻璃层必须严格限量。

### Light Palette

| Role | Value |
| --- | --- |
| Base | `#E6EFEC` |
| Canvas | `#EEF5F2` |
| Surface | `rgba(255,255,255,.72)` |
| Raised | `rgba(255,255,255,.88)` |
| Text primary | `#10201E` |
| Text secondary | `#4C6460` |
| Text muted | `#6E827E` |
| Line | `rgba(32,72,67,.16)` |
| Action | `#E9662F` |
| Info | `#1E7180` |
| Success | `#2F7C62` |
| Attention | `#B77A22` |
| Critical | `#B94747` |

### Dark Palette

| Role | Value |
| --- | --- |
| Base | `#050D0C` |
| Canvas | `#071513` |
| Surface | `rgba(12,31,29,.76)` |
| Raised | `rgba(21,45,42,.88)` |
| Text primary | `#F1F7F3` |
| Text secondary | `#B6CBC6` |
| Text muted | `#78948E` |
| Line | `rgba(143,207,197,.16)` |
| Action | `#FF7A38` |
| Info | `#64C7D0` |
| Success | `#66C497` |
| Attention | `#E2AD55` |
| Critical | `#F07B74` |

### Material

- 只允许 shell 和 raised detail 两级使用 `backdrop-filter: blur(18px)`；普通列表不得逐卡玻璃化。
- 背景只允许一个低对比径向 glow 和一组细网格/海岸纹理，不堆叠光球。
- 边缘亮线只服务 focus/selection，不作为每张卡装饰。
- 移动设备与不支持 blur 的环境回退到对应不透明 surface。

### Best Fit / Risk

- **适合**：品牌发布、暗色主体验、希望与传统医疗 SaaS 拉开距离。
- **风险**：透明材质与 glow 很容易牺牲对比度、性能和严肃感；必须保持两层上限。

## Candidate C · Living Archive / 活档案

### Intent

把病历理解为持续生长的长期档案：温暖纸张、现代编辑排版、索引和注释语法。它不是旧式报纸风，而是安静、有时间性的记录系统。

### Light Palette

| Role | Value |
| --- | --- |
| Base | `#EAE4D8` |
| Canvas | `#F4EFE4` |
| Surface | `#FFFDF7` |
| Raised | `#F7EFDF` |
| Text primary | `#28231D` |
| Text secondary | `#625B50` |
| Text muted | `#82786A` |
| Line | `#D6CAB8` |
| Action | `#B64A32` |
| Info | `#3D6670` |
| Success | `#4F7458` |
| Attention | `#9D6B25` |
| Critical | `#A83E3E` |

### Dark Palette

| Role | Value |
| --- | --- |
| Base | `#16130F` |
| Canvas | `#1E1A15` |
| Surface | `#27221C` |
| Raised | `#302A22` |
| Text primary | `#F2E9D9` |
| Text secondary | `#C8BCA9` |
| Text muted | `#998D7B` |
| Line | `#453C31` |
| Action | `#E16C4F` |
| Info | `#8EB3B9` |
| Success | `#8FB096` |
| Attention | `#D0A466` |
| Critical | `#DF7870` |

### Material

- Display serif 只用于患者名、章节名和少量大标题；控件、导航、正文仍为 UI sans。
- 索引号、日期、页码、检验单位使用 mono，形成档案语法而非装饰线。
- 纸张纹理必须低于 `3%` 视觉对比；不使用粗重双线、drop cap 或全页竖排文字。
- 分隔可使用单条 hairline 与节奏性大留白，不把每个章节框成报纸栏目。

### Best Fit / Risk

- **适合**：病历详情、隐私文本、长期时间线与叙事阅读。
- **风险**：若 serif、规则线和纸张纹理过多，会回到旧式报刊视觉；分析工作台需要严控密度。

## Typography Roles

| Role | Font | Weight | Size / Leading | Use |
| --- | --- | --- | --- | --- |
| Brand | localized display serif | 600–700 | responsive | 品牌字标，不进入普通控件 |
| Page title | UI sans; Archive 可用 display serif | 600–700 | `clamp(28px, 4vw, 48px)` / 1.05 | 患者名、页面主任务 |
| Section title | UI sans | 600–650 | 16–20px / 1.25 | 内容分组 |
| Body | Geist/Inter-compatible UI sans | 400–500 | 14–16px / 1.55 | 正文与说明 |
| Control | UI sans | 550–650 | 13–14px / 1 | 按钮、tab、导航 |
| Data | IBM Plex Mono | 500–600 | 12–32px, tabular | 日期、测量、ID、趋势值 |
| Eyebrow | IBM Plex Mono | 500–600 | 10–11px / 1.2 | 极少量类别/索引，不全大写中文 |

规则：中文不使用人为超宽 tracking；长正文不使用全粗体；数字列启用 `font-variant-numeric: tabular-nums`。

## Spacing & Density

基础单位为 `4px`，只允许以下主要间距：

- `4`：图标内部与紧密数据单位。
- `8`：控件内部、紧凑行内组。
- `12`：列表行与小卡片。
- `16`：标准控件、移动面板。
- `24`：内容组间距。
- `32`：面板内章节。
- `48`：桌面主要区块。
- `64`：叙事章节或大屏页面节奏。

高密度不等于压缩所有留白。先压缩重复标题和容器，再保留数据行可扫描空间。

## Surface & Elevation

| Level | Meaning | Border | Shadow / Blur |
| --- | --- | --- | --- |
| Base | 浏览器/壳层外缘 | none | none |
| Canvas | 主工作区 | none | none |
| Surface | 普通内容组 | separator only when needed | none |
| Raised | 当前详情、浮层、评估控制 | focus/selection only | one restrained shadow or allowed glass blur |

禁止第五、第六种近似材料。若新组件无法映射四级材料，先检查它是否真的需要独立容器。

## Semantic Emphasis

- **Action**：唯一主要动作、selected focus、品牌微光。
- **Info**：当前治疗、一般临床提示、图表主线。
- **Success**：已完成、稳定、在参考范围。
- **Attention**：需要复查或补充，不等于危险。
- **Critical**：明确异常或需要立即阅读的信息。
- **Muted**：辅助元数据，不用于关键结论。

任何异常状态都必须同时提供图标、标签或完整句子，不能只改颜色。

## Component Contracts

### Evaluation Bar

- 是预览工具，不是生产顶栏。
- 方向与材质均使用原生 `button`，暴露 `aria-pressed`。
- 控件允许换行；390px 不产生水平滚动。

### Product Shell

- 导航使用图标 + 短标签，不使用大 serif。
- 当前项使用 surface/line/action 的组合，不使用整块高饱和填充。
- 搜索、通知与账户是辅助动作，不与“新建/提取”争抢主 CTA。

### Patient State

- 患者名、诊断、当前治疗和复查日期构成首屏最高层级。
- 身高体重等次级信息进入 compact facts，不与治疗状态同权。
- Demo/preview 标识必须清楚但不成为最大视觉元素。

### Attention Summary

- 每条包含严重度、短结论和可执行下一步。
- Critical / Attention / Info 分开，不把所有提示都做成橙色警告卡。
- 桌面可横排，移动端必须单列。

### Metric Browser & Detail

- 左侧浏览只回答“看哪个指标”，右侧详情回答“趋势如何、是否异常、下一步是什么”。
- 数值用 mono/tabular；图表主线使用 Info，异常点使用 Critical。
- 图表必须有文字化范围和变化说明，不能只依赖曲线。

### Timeline

- 纵向时间线只呈现支持当前临床判断的节点。
- 状态点、日期与标题对齐；不为每一行创建完整卡片边框。
- 当前治疗使用 Action/Info 组合，其余节点回到中性层级。

### Secondary Actions

- 分享、导出、审计放在辅助 rail 或页面尾部。
- 默认使用 secondary/quiet 样式；只有用户进入对应任务后才提升层级。

## Motion Contract

| Interaction | Motion | Duration | Easing |
| --- | --- | --- | --- |
| Route first reveal | opacity `0 → 1`, y `4px → 0` | 180ms | `cubic-bezier(.2,.8,.2,1)` |
| Candidate/material change | content opacity `0.96 → 1` | 160ms | ease-out |
| Button press | scale `1 → .98` | 80ms | ease-out |
| Hover | exact color/border properties only | 120ms | ease-out |
| Focus | no entrance motion; visible ring immediately | 0ms | — |
| Table/list navigation | none | 0ms | — |

禁止 `transition: all`、大面积 blur 入场、长 stagger、滚动劫持和数据数字无意义滚动。

`prefers-reduced-motion: reduce` 下动画和非必要过渡接近 `0.01ms`，内容不得隐藏。

## Responsive Contract

### Desktop `>= 1180px`

- 壳层为 `220px + minmax(0, 1fr)`。
- 内容区上限约 `1500px`，主要详情与指标浏览为 `minmax(240px, .72fr) + minmax(0, 1.6fr)`。
- Patient state 与 attention summary 在首屏内建立完整阅读顺序。

### Tablet `760–1179px`

- 侧栏缩为水平/紧凑头部；详情布局不强行保留三栏。
- Attention summary 可两列；metric browser 和 detail 纵向排列。

### Mobile `< 760px`

- 全部布局单列。
- 最小点击目标 `44px`。
- evaluation controls、状态 chip 与次级 action 可换行。
- 图表不得通过固定宽度制造页面级水平滚动。
- 辅助导航可隐藏标签，但核心状态和异常文字不可省略。

## Accessibility

- 正文与背景目标对比度至少 WCAG AA；关键小字不使用低对比透明度逃避。
- `:focus-visible` 使用 `2px` focus ring + offset，三方向都必须可见。
- 选中态同时使用 `aria-pressed` 与视觉状态。
- 图标按钮必须有可读标签。
- 异常不能只靠颜色；图表必须有范围/变化文字。
- 不允许 hover 才能发现关键操作。

## Selection & Migration Boundary

1. 本阶段只交付 V4 合同、三候选 `/design-preview` 与验证证据。
2. 产品负责人明确选择 A/B/C 或命名混合方案后，创建新的 OpenSpec 迁移变更。
3. 新变更先把选中方向提升为 production reference/system/component token，再按页面迁移。
4. 建议迁移顺序：shared shell → workspace → record → analytics → privacy/share → login integration。
5. 每页迁移必须保持业务、Auth、Supabase、Demo 与导出边界不变，并有独立浏览器回归证据。

## Recommendation

**默认推荐 A · Clinical Calm**：它最容易形成长期稳定的全站系统，对病历和指标密度最友好，也能让 Light/Dark 保持同构。若用户希望更强品牌感，优先从 B 借用“深海背景 + 极少萤火 glow”，而不是整套玻璃组件；若希望病历更有人文与时间感，优先从 C 借用标题和索引语法，而不是把整个分析工作台纸张化。

## Do / Don't

- Do 先删除不必要容器，再调整卡片样式。
- Do 让患者、当前治疗、异常摘要先于分享与导出。
- Do 让橙色稀缺、可预测。
- Do 用同一语义角色映射 Light/Dark。
- Do 在真正浏览器中比较 1440、1280、390 和 reduced-motion。
- Don't 为每个 section 发明新 surface、圆角或黑色。
- Don't 让 serif 进入普通导航、按钮和高密度数据。
- Don't 用玻璃、纹理或 glow 修饰每张卡。
- Don't 在选择前修改正式产品路由。
- Don't 把 OpenSpec validation 或静态截图当作最终产品验收。
