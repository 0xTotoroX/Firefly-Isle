<!--
 * [INPUT]: 依赖 V2 视觉稿、运行态截图与用户复盘意见的设计约束
 * [OUTPUT]: 对外提供 v3 细节生成 brief、token contract、页面收敛规则与验收标准
 * [POS]: Image-2/V2 的下一轮设计控制面，约束 01-07 重生成而不替代 src 实现真相源
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# Firefly-Isle v3 Detail Brief

## 核心判断

v2 的方向正确：它把 Firefly-Isle 拉回了临床工作台，而不是营销页或纯装饰稿。下一轮不要整体推翻，要做“统一骨架、收敛语气、提炼 token”的细节手术。

当前最大问题不是不够漂亮，而是 dark/light 仍像两个产品：

- dark 仍偏 cyber control room，终端感、印章感、发光边线偏多。
- light 仍偏 forensic newspaper，纸面、油墨、虚线、巨大标题偏多。
- 两套主题的组件结构、按钮排列、字体层级与边框重量还没有完全同构。
- 当前实现层已存在相同倾向：light/dark 在组件 JSX 中分叉较多，`src/index.css` 还有全局方角规则，和 6-8px 产品控件圆角目标冲突。

v3 的目标是把“好看的视觉稿”压缩成一个可实现的产品系统：Clinical Archive Console。

## 设计原则

1. 同一产品，两张皮肤。
   Dark 和 light 只能更换 token，不能更换页面结构、组件职责、信息顺序与交互语言。

2. 临床工作台优先。
   入口、提取、追问、报告、病历详情都应像医生每天会反复使用的工具，不像海报、报纸、档案封面或终端演示。

3. 信息密度可扫读。
   主输入、提取状态、结构化报告、导出动作必须在第一眼形成路径：输入病史 -> 提取 -> 补充缺失 -> 查看/导出报告。

4. 装饰退后，状态前进。
   firefly orange 只标识主动作、当前导航、缺失字段和关键焦点；clinical green 只标识成功、就绪、已验证。

## Token Contract

建议 v3 先锁定这些实现合同，再生成图：

| Token | Dark | Light | 用途 |
| --- | --- | --- | --- |
| `surface.shell` | `#0B0C0C` | `#FAF8F4` | 全局背景 |
| `surface.sidebar` | `#101111` | `#F3F1EA` | 侧栏 |
| `surface.panel` | `#151615` | `#FFFFFF` | 输入区、报告区、卡片 |
| `surface.inset` | `#0F1010` | `#F5F3EE` | textarea、表格内嵌区 |
| `border.default` | `#2A2D2A` | `#D8D3C8` | 默认 1px 边线 |
| `border.strong` | `#E65B2A` | `#E65B2A` | 焦点、主动作、缺失字段 |
| `text.primary` | `#F4F1EA` | `#1D1D1B` | 正文 |
| `text.secondary` | `#B8B3AA` | `#66645F` | 次级说明 |
| `accent.firefly` | `#E85D2A` | `#E85D2A` | 主强调 |
| `accent.success` | `#43A56B` | `#2F8A57` | 成功/就绪 |
| `accent.warning` | `#F06A3D` | `#C93D2D` | 缺失/错误 |
| `radius.control` | `8px` | `8px` | 按钮、输入、卡片 |
| `border.weight` | `1px` | `1px` | 所有默认组件 |

字体只保留两类：

- UI sans: `Noto Sans SC` / `Inter` fallback，用于全部中文 UI、按钮、标题、正文。
- Metadata mono: `JetBrains Mono`，只用于编号、版本、时间戳、模型名、计数器。

移除 v3 图中的 decorative serif、巨大报纸标题、终端全大写主文案、过量斜线、虚线框和印章装饰。

## Page Refinement

### v3.1 correction: keep v2 rhythm, fix shell behavior only

v3 不应把 v2 的档案气质改成另一套控制台风格。下一轮生成遵循“v2 气质保留 80%，只修结构问题 20%”：

- 03-06 的侧栏收起态是真实应用状态，不是设计稿拼贴：左侧只保留 64-72px 图标栏、logo mark、状态点与展开按钮，主内容自然变宽。
- 侧栏隐藏后页面仍是正常文档流：用户从上往下滚轮阅读，内容允许超过首屏，不把记录详情硬塞成一屏密集仪表盘。
- 05/06 以 v2 的长卷病历档案为基准：顶部身份与指标区、下方治疗线纵向卡片、右侧检查/疗效 side card，节奏舒展。
- 03/04 保留 v2 的输入区 -> 提取动作 -> 参数 -> 报告预览顺序，但降低每个区块高度压缩感，增加区块间呼吸。
- v3 的任务是统一菜单栏、品牌、token、半径、边框和可隐藏行为，不是重做视觉性格。

### 1. `/login` entry surface

保留登录/注册/匿名会话/语言/主题/隐私入口，但不要做成营销 hero。

结构建议：

- 左侧为产品说明面板，占 52%，显示品牌、短价值主张、4 个临床能力点、系统状态。
- 右侧为 auth panel，占 420-460px，登录、注册、第三方登录、匿名会话、隐私提示都在同一面板。
- dark/light 使用完全相同的格局，只换颜色。
- 标题从“把复杂治疗史整理成一页纸”收敛为产品型标题，如“临床治疗时间线工作台”。
- 隐私提示是明确的信息条，不是装饰贴纸或竖向 seal。
- 萤火虫 logo 参考 `01-login-dark.png` 的方向：橙色抽象萤火虫/叶片形品牌符号 + `一页萤岛` 中文名 + `Firefly-Isle` 英文小字。v3 不要改成通用星点、医疗十字或复杂写实昆虫。

### 2. `/app` extraction workspace

v2 最接近目标，但需要继续收敛：

- 左侧导航展开宽度固定 256px，主题切换、语言、匿名会话、退出登录固定在底部。
- 03/04 必须使用同一套侧栏几何：logo 区、主导航、底部工具、状态卡的 x 坐标、图标列宽、文字基线和 item 高度完全一致；只允许 token 换肤。
- 侧栏必须支持向左隐藏：展开态 256px，收起态 64-72px；收起后只保留 logo mark、导航图标、状态点和一个显式展开按钮，文字 label 隐藏但 hover tooltip 可出现。
- 顶栏只保留页面标题、系统状态、帮助、设置；不要额外装饰分隔线。
- 主区按单一垂直节奏排列：输入面板 -> 参数/状态条 -> 报告预览。
- 输入面板内只保留一个主按钮“开始结构化提取”；导出 PDF/PNG 是次级按钮，放在同一 action row。
- 文本输入高度 180-220px，字符计数右下角，focus ring 使用 orange 2px。
- “当前提取参数”用 5 个等宽 metadata cells，不要让它像报纸表格或终端日志。
- follow-up 状态必须像任务流：`待补充 2 项`、`第 1/3 轮追问`、`重新分析`，不要藏在小字日志里。
- 报告预览必须像真正 app surface：卡片、表格、缺失字段提示、时间线状态，避免大面积海报化标题。

### 3. `/record/:id` patient detail

保留病历档案的仪式感，但降低“封面海报”强度：

- 使用与 `/app` 同一个 sidebar/topbar 系统。
- 05/06 的侧栏必须与 03/04 像同一个组件实例：相同展开宽度、收起宽度、item 高度、图标尺寸、底部工具排列和品牌区比例。
- 可折叠逻辑是 shell 状态，不是另一个页面设计；内容区应随侧栏宽度自然重排，不能出现第二套 record 专用导航。
- 页面标题区高度控制在 120-160px，不再使用超大竖向海报标题。
- 顶部 patient summary 是 4 个 metric + 4 个 metadata cells。
- 主内容用治疗时间线 list：初发诊断、一线治疗、二线治疗，每段左侧是 narrative，右侧是检查/疗效/状态 side card。
- 每个 section 的编号、状态 chip、时间范围在同一 header row。
- AI verified/footer 作为底部 audit band，不要使用印章、二维码或装饰大图作为主要信息。

### 4. Component strip

组件 strip 应像实现规格，不像另一张海报：

- 一行展示 dark，一行展示 light，组件顺序完全一致。
- 必须包含：expanded sidebar item、collapsed sidebar item、sidebar toggle、brand logo lockup、primary button、secondary button、textarea、status chip、timeline card、export control、alert state。
- 每个组件旁边标注 token 名称或状态名即可，不要加入独立世界观标题。
- 展示 hover/focus/disabled 至少各一个状态。

## Implementation Mapping

落地时优先改这几个真相源：

- `src/lib/theme/tokens.ts`: 让 light/dark 使用同一语义 token，尤其 light 的 primary accent 不再是纯黑，而是 firefly orange。
- `src/index.css`: 移除全局 `border-radius: 0 !important`，只用 token 控制半径；删除 paper/newsprint 专用背景、drop-cap、hard-shadow。
- `src/components/system/surfaces.tsx`: 统一 border weight、radius、focus ring，把 theme 分支压到 token 与 class 组合。
- `src/components/workspace/extraction-composer.tsx`: 消除 dark/light 双 JSX 结构，保留同一 action row 与输入面板。
- `src/routes/record-page.tsx`: 消除 dark/light 两套页面骨架，改成同一 RecordPage layout + token skin。
- `src/components/record/*`: 保留 summary/header/side-card/section-frame，但改成统一 radius、spacing、border contract。

## V3 Generation Prompt

Use the existing v2 images as visual reference, but refine them into one unified SaaS product system.

Design Firefly-Isle as "Clinical Archive Console", a calm clinical oncology treatment timeline and patient record builder. The product must feel like one application with dark and light skins, not two separate visual identities.

Preserve these product surfaces:

1. `/login`: product entry with login/register, third-party login, anonymous session, privacy notice, theme and language controls.
2. `/app`: extraction workspace with sidebar, topbar, clinical text input, primary extraction action, secondary export actions, extraction parameters, follow-up state, report preview, timeline and missing-field alerts.
3. `/record/:id`: patient record detail with the same shell, patient metrics, metadata, diagnosis and treatment timeline sections, side cards for IHC/genetics/response, audit footer.
4. Component strip: dark and light rows showing the same components in the same order.

Strict visual rules:

- Use one shared layout grid across dark and light.
- For screens 03, 04, 05 and 06, make the left sidebar alignment identical: same expanded width, collapsed width, icon column, item height, text baseline, brand zone, bottom utilities and status card placement. Use the provided dark console screenshot as the alignment reference.
- The sidebar must be collapsible toward the left. Show or clearly imply two states: expanded 256px and collapsed 64-72px. Collapsed state keeps icons, logo mark, status dot and a visible expand control; labels are hidden, with tooltip affordance allowed.
- Use the Firefly-Isle logo direction from image 01: an orange abstract firefly/leaf mark paired with Chinese brand name `一页萤岛` and small `Firefly-Isle` text. Do not replace it with a generic spark, cross, dot cluster or realistic insect.
- Use one modern UI sans font for all Chinese and UI text; use one restrained mono only for metadata, version, time, model and counters.
- Remove decorative serif type, newspaper layout, cyber-terminal styling, scan lines, stamps, heavy dashed boxes, decorative vertical seals, and oversized poster headlines.
- Use 8px radius, 1px borders, quiet surfaces, strong contrast, visible focus rings, and concise Chinese labels.
- Dark palette: charcoal shell, graphite panels, off-white text, firefly orange accent, clinical green success.
- Light palette: warm white shell, soft gray panels, graphite text, the same orange and green semantic accents.
- Sidebar, buttons, input panels, report cards, timeline sections, export actions, status chips, privacy panels and alert states must share border radius, border weight, spacing and interaction language.
- Make the UI operational and breathable. The user should immediately see where to paste patient history, how extraction starts, how missing fields are resolved, and where the structured report appears.

V3 acceptance criteria:

- When placed side by side, `/app` dark and `/app` light have identical geometry.
- Login dark and login light have identical geometry.
- Record dark and record light have identical geometry.
- Screens 03, 04, 05 and 06 share one sidebar component: alignment, spacing, icon rhythm and bottom utility stack match pixel-for-pixel except for theme tokens.
- Sidebar collapse is treated as a real interaction state: expanded/collapsed widths are specified, labels disappear cleanly, content reflows without overlap, and the toggle remains discoverable.
- Logo treatment remains consistent with 01: the orange Firefly-Isle mark is recognizable in expanded and collapsed sidebar states.
- No primary UI text is smaller than 12px.
- No decorative label carries primary meaning.
- Every main action has one clear visual priority.
- Component strip can be translated into Tailwind tokens without inventing new one-off styles.
