# src/components/analytics/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
lab-analytics-dashboard.tsx: 页面入口，组合加载/失败/空态、摘要、指标列表、趋势与异常监测；上传链接保留患者上下文并进入工作台。
use-lab-analytics.ts: 只读统计的选择状态与派生数据，复用 lib 的临床计算，处理搜索、分类切换、监测回选与连续上涨区间。
lab-indicator-list.tsx: 分类导航、可访问搜索和最新指标选择，完整显示指标名称、日期与单位。
lab-trend-panel.tsx: 趋势工具栏、SVG 图表与等价读数表；工具栏随宽度换行，年份按钮明确显示实际数据年份，读数不足时禁用导出。
use-lab-chart-navigation.ts: 图表/表格双向日期定位、键盘滚动、指针拖动和拖动结束误选抑制。
lab-chart-export.ts: 独立 SVG 导出，内嵌主题与连续上涨状态色，恢复冻结坐标轴文字且不修改页面原图。
lab-monitor-panels.tsx: 最近异常与肿瘤连续上涨提醒表，键盘/点击回选趋势；临床语义及计算保持在 lib。
lab-analytics-controls.tsx: 分类顺序、默认指标与范围、滚动行样式、摘要卡和可读拖动提示。
lab-analytics-format.tsx: 状态文案、数值/比例格式化、状态标签与上涨比例标签。
lab-trend-chart.tsx: 横向 SVG 趋势图，按数值宽度冻结 Y 轴、参考范围、点选择、连续上涨高亮、拖动误选抑制和时间标签。
demo-lab-analytics.ts: 统一虚构 fixture 的化验/病历兼容导出和明确标注的固定 AI 预览。
lab-analytics-dashboard.test.tsx: 摘要、趋势/等价表格、监测、真实空态与非诊断文案展示合同。
lab-analytics-interactions.test.tsx: 真实 React 交互回归，覆盖监测回选、分类清除高亮、搜索、日期定位、实际年份范围、拖动误选保护和患者上传链接。
lab-chart-export.test.ts: 导出独立 SVG 的连续上涨状态色、坐标轴恢复和原图不变回归。

法则: /analytics 做只读展示，/app 做输入；OCR、归一化、计算与 Supabase 写入必须留在 lib 边界。不以隐藏单位、日期或临床说明换取视觉简化。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md。
