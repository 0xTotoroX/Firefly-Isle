<!--
 * [INPUT]: 依赖 V3 运行时审计、V4 DESIGN.md 与 refresh-product-visual-system-v4 OpenSpec 变更
 * [OUTPUT]: 对外提供 V4 候选批次的目标、候选清单、比较方法、交付物与选择边界
 * [POS]: Image-2/V4 的批次说明；帮助设计评审者理解截图与 /design-preview 的用途
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 -->

# 2026-07-30 V4 Visual Direction Brief

## 目标

在不改动正式页面的前提下，把当前 V3 的视觉问题转化为一个可运行、可响应、可比较的下一代设计系统评估面。

本批次不让三套方案使用不同内容“作弊”。Clinical Calm、Firefly Glass、Living Archive 使用同一静态患者、同一治疗/指标信息、同一 DOM 与同一任务顺序，只替换 token、材料、排版语气和允许的装饰语法。

## 候选

1. **A · Clinical Calm / 临床静观（推荐）**
   - 温暖中性、极少边框、清晰临床层级。
   - 最适合长期全站和高密度阅读。
2. **B · Firefly Glass / 萤光舷窗**
   - 深海材质、受限玻璃、萤火焦点与冷青信息色。
   - 品牌最强，但必须控制透明层和 glow。
3. **C · Living Archive / 活档案**
   - 纸张/墨色、现代编辑节奏、索引与长期档案语法。
   - 病历叙事最强，分析工作台需要严格控密度。

## 评审方式

- 打开 `/design-preview`。
- 逐个切换 A/B/C，并在 Light/Dark 中检查同一页面。
- 重点判断：首屏阅读顺序、长时间舒适度、品牌辨识、指标可读性、移动端稳定性。
- 不要因为默认推荐 A 就把它视为已选定。
- 如果采用混合方案，必须明确写成“以 A 为骨架，借 B 的背景，借 C 的标题/索引”等可执行语句，不能只说“融合一下”。

## 交付物

- `DESIGN.md`：V4 候选设计合同。
- `/design-preview`：三方向、双材料、同内容的真实页面。
- `01-clinical-calm-light.png`：A 的代表性桌面截图，1440 × 1000。
- `02-firefly-glass-dark.png`：B 的代表性桌面截图，1440 × 1000。
- `03-living-archive-light.png`：C 的代表性桌面截图，1440 × 1000。
- `04-design-preview-mobile.png`：A 的 390px 移动截图，390 × 844。

## 2026-07-31 验证记录

### 真实浏览器矩阵

- **桌面**：1440px 与 1280px 均完成 A/B/C × Light/Dark 六种组合检查；页面级 `clientWidth === scrollWidth`，分别为 1425px 与 1265px（差值来自浏览器滚动条）。
- **移动**：390 × 844 完成 A/B/C × Light/Dark 六种组合检查；页面级 `innerWidth === clientWidth === scrollWidth === 390`。指标图表的宽内容只存在于内部横向滚动容器（容器 296px，内容 560px），没有把横向滚动泄漏到页面。
- **触控与焦点**：开启 touch emulation 后控件不依赖 hover；方向与材质控件保持原生 `button`、可读标签、`aria-pressed` 和 `:focus-visible`。浏览器实测焦点轮廓为 2px 实线、`outline-offset: 3px`。
- **减少动态效果**：`prefers-reduced-motion: reduce` 下，预览内容与选择状态仍完整可见；预览范围内最大 transition/animation 均降为 0.01ms，唯一候选切换动画被禁用。恢复普通媒体设置后，正常交互动效保持在 160ms 级别。

### 控制台与网络

- 页面运行错误日志为 0。
- 重载 `/design-preview` 后未发现 Fetch/XHR/WebSocket/EventSource 请求，也未发现 Supabase Auth、患者记录、实验室指标、`record_shares` 或用户 LLM 设置读取。
- 观察到的网络项仅为本地 Vite 模块、字体、favicon 与本地背景音乐资源；Google Fonts 样式表是唯一远端静态资源。一次本地音频 range 请求以 `ERR_ABORTED` 取消，属于背景音播放器的可取消预加载，不影响页面渲染。

### 键盘验证边界

- 已验证真实 DOM 使用原生 `button`，方向/材质状态通过 `aria-pressed` 暴露，按钮获得焦点时有可见 `:focus-visible` 轮廓；可访问树正确呈现两个命名 group 和三个方向按钮。
- 当前浏览器控制层的键盘注入可以聚焦按钮，但不会可靠触发原生 Enter/Space 激活，因此不把“浏览器注入完成键盘选择 E2E”写成已通过。产品代码没有为此添加鼠标专用语义；在正式迁移前应以真实人工键盘或另一条可信 E2E 通道补一轮激活验证。

## 边界

- V3 仍是正式产品实现。
- V4 只在 `/design-preview` 生效。
- 不读取 Supabase 患者数据，不写主题偏好，不进入正式导航。
- 用户明确选择后，另开 OpenSpec 变更迁移全站。
