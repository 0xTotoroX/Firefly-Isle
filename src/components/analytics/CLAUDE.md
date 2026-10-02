# src/components/analytics/
> L2 | 父级: /src/components/CLAUDE.md

成员清单
CLAUDE.md: 说明统计页展示组件目录职责，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
demo-lab-analytics.ts: 统一虚构 fixture 的化验/病历兼容导出和明确标注的固定 AI 预览。
lab-analytics-dashboard.tsx: 实验室趋势统计主界面，区分加载/失败/真实空态并提供重试，编排中文摘要指标条、分类索引、趋势图控制、等价数据表、异常与连续上涨提醒；化验上传链接保留患者上下文并进入 /app，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-analytics-controls.tsx: 统计页常量与小型展示部件，提供分类顺序、默认指标、滚动/监测行样式、摘要卡、只读数值、拖动提示和肿瘤上涨窗口格式化，避免 dashboard 超过 800 行，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-analytics-format.tsx: 统计页状态文案、数值/比例格式化、状态标签与上涨比例标签展示工具，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-trend-chart.tsx: 横向 SVG 趋势图组件，负责冻结 Y 轴刻度、参考范围、图表点键盘/点击选择、肿瘤连续上涨段高亮、拖动误选抑制与时间点显示密度控制，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
lab-analytics-dashboard.test.tsx: 统计页展示合同测试，约束中文摘要、分类、趋势图范围选择、时间点显示切换、全局状态文字切换、肿瘤连续上涨段高亮、趋势图横向滑动区、趋势图等价表格、图表点与表格行可选定位、demo 标识、空态回到 /app 上传和非诊断文案，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 这里只表达统计页界面与交互骨架；/analytics 做展示，/app 做输入，OCR、归一化、Supabase 写入必须留在 lib 边界。
