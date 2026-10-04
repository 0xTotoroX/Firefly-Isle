# MyOncode 设计系统规范
**方案代号：Clarity Grid**  
**版本：DS v1.0 Baseline**  
**适用范围：Web 应用（桌面与移动端）**

---

## 独立设计理由

Clarity Grid 从信息架构的根本需求出发：肿瘤治疗信息管理要求**高密度数据呈现**与**清晰的可信度区分**。本系统面向的是需要长期追踪复杂医疗数据的患者与家属，他们需要在焦虑状态下快速找到关键信息、理解数据变化、识别缺失项。

设计策略核心：
1. **信息架构优先于装饰**：所有视觉决策服务于数据可读性与操作明确性
2. **状态即视觉语言**：用颜色与形态明确区分已确认、待审核、AI 建议、缺失数据
3. **密度可控**：同一信息在总览、时间线、详情三层有不同展开度
4. **临床色彩系统**：主色调取自医疗影像的冷色调（青蓝光谱），传递专业与精确，避免暖色可能带来的情绪暗示

---

## DS-00：设计原则

### 原则 1：边界清晰
- 所有数据源必须可追溯（采样日期、原报告来源）
- AI 生成内容与人工录入内容视觉上明确区分
- 缺失数据显著标记，不用默认值掩盖

### 原则 2：认知负荷分层
- Dashboard 层：聚合统计 + 异常提醒
- Timeline 层：时间序列 + 治疗阶段
- Detail 层：完整字段 + 编辑能力

### 原则 3：操作可逆
- 删除前二次确认
- 表单自动保存草稿
- 导出不改变原数据

### 原则 4：专业克制
- 不承诺疗效，不替代医生判断
- 高低值标记附带参考范围与单位
- 趋势图不连接缺失日期的断点

---

## DS-01：颜色系统

### 表面层级（Surface Ladder）
黑暗主题为主导设计，浅色主题派生。色调取自 **cyan-tinted neutrals**（医疗影像冷色调）。

#### 黑暗主题表面
```
--surface-00: #040A0F  /* 页面底色，L=3% */
--surface-01: #0A1218  /* 卡片背景，L=5% */
--surface-02: #101A24  /* 悬浮层，L=8% */
--surface-03: #16232F  /* 模态框，L=12% */
--surface-04: #1D2D3C  /* 高亮区域，L=16% */
```

#### 浅色主题表面
```
--surface-00: #FAFBFC  /* 页面底色，L=98% */
--surface-01: #F2F4F6  /* 卡片背景，L=95% */
--surface-02: #E8EBEF  /* 悬浮层，L=92% */
--surface-03: #DFE3E8  /* 模态框，L=89% */
--surface-04: #D5DAE1  /* 输入框，L=86% */
```

### 文本层级
#### 黑暗主题
```
--text-primary: #E8F0F5    /* 标题与关键数据，L=93% */
--text-secondary: #A8BBC9  /* 说明文字，L=70% */
--text-muted: #6B7D8C      /* 辅助信息，L=50% */
--text-disabled: #3F4F5C   /* 禁用状态，L=30% */
```

#### 浅色主题
```
--text-primary: #0D1821    /* L=8% */
--text-secondary: #3D5266  /* L=35% */
--text-muted: #6B7D8C      /* L=50% */
--text-disabled: #A1ADB8   /* L=68% */
```

### 强调色（Accent Colors）
用户可在设置中切换，默认 **Clinical Cyan**。

#### 1. Clinical Cyan（默认）
```
--accent-50: #E0F7FF
--accent-500: #06B6D4   /* 主交互色 */
--accent-600: #0891B2   /* hover */
--accent-700: #0E7490   /* active */
--on-accent: #FFFFFF
```

#### 2. Research Teal
```
--accent-50: #D4F5F0
--accent-500: #14B8A6
--accent-600: #0D9488
--accent-700: #0F766E
--on-accent: #FFFFFF
```

#### 3. Archive Slate
```
--accent-50: #E8EDF2
--accent-500: #64748B
--accent-600: #475569
--accent-700: #334155
--on-accent: #FFFFFF
```

#### 4. Precision Indigo
```
--accent-50: #E0E7FF
--accent-500: #6366F1
--accent-600: #4F46E5
--accent-700: #4338CA
--on-accent: #FFFFFF
```

### 语义颜色（独立于强调色）
#### 黑暗主题
```
--success: #10B981     /* 正常范围、完成状态 */
--success-bg: #064E3B
--warning: #F59E0B     /* 边缘值、待处理 */
--warning-bg: #78350F
--danger: #EF4444      /* 异常值、错误 */
--danger-bg: #7F1D1D
--info: #3B82F6        /* AI 建议、提示 */
--info-bg: #1E3A8A
```

#### 浅色主题
```
--success: #059669
--success-bg: #D1FAE5
--warning: #D97706
--warning-bg: #FEF3C7
--danger: #DC2626
--danger-bg: #FEE2E2
--info: #2563EB
--info-bg: #DBEAFE
```

### 特殊状态颜色
```
--review-border: #F59E0B      /* 待审核边框 */
--ai-generated-bg: #1E3A8A    /* AI 生成内容背景（深色）*/
--ai-generated-bg-light: #DBEAFE  /* 浅色主题 */
--missing-indicator: #6B7D8C  /* 缺失项标记 */
--confirmed-badge: #10B981    /* 已确认徽章 */
```

### 边框与分隔
#### 黑暗主题
```
--border-subtle: #1D2D3C      /* 常规分隔线 */
--border-default: #2D3F52     /* 卡片边框 */
--border-strong: #3D5266      /* 焦点边框 */
```

#### 浅色主题
```
--border-subtle: #E8EBEF
--border-default: #D5DAE1
--border-strong: #A1ADB8
```

---

## DS-02：字体与排版

### 字体栈
```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", 
             sans-serif;
--font-mono: ui-monospace, "SF Mono", "Cascadia Code", 
             "Source Code Pro", monospace;
--font-numeric: "SF Pro Text", "Helvetica Neue", sans-serif; 
/* 用于数值，确保等宽数字 */
```

### 字号体系（Fluid Scale）
```css
--text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem);    /* 12-13px */
--text-sm: clamp(0.875rem, 0.825rem + 0.25vw, 0.9375rem); /* 14-15px */
--text-base: clamp(1rem, 0.95rem + 0.25vw, 1.0625rem);    /* 16-17px */
--text-lg: clamp(1.125rem, 1.05rem + 0.375vw, 1.25rem);   /* 18-20px */
--text-xl: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);       /* 20-24px */
--text-2xl: clamp(1.5rem, 1.35rem + 0.75vw, 1.875rem);    /* 24-30px */
--text-3xl: clamp(1.875rem, 1.65rem + 1.125vw, 2.25rem);  /* 30-36px */
```

### 行高与字距
```css
--leading-tight: 1.25;    /* 标题 */
--leading-normal: 1.5;    /* 正文 */
--leading-relaxed: 1.75;  /* 长文本 */

--tracking-tight: -0.02em;  /* 大标题 */
--tracking-normal: 0;
--tracking-wide: 0.025em;   /* 小标签 */
```

### 字重
```css
--font-normal: 400;
--font-medium: 500;   /* 按钮、标签 */
--font-semibold: 600; /* 卡片标题 */
--font-bold: 700;     /* 页面标题 */
```

---

## DS-03：间距、圆角与层级

### 间距体系
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 圆角
```css
--radius-sm: 0.375rem;   /* 6px - 输入框、小徽章 */
--radius-md: 0.5rem;     /* 8px - 卡片 */
--radius-lg: 0.75rem;    /* 12px - 模态框 */
--radius-xl: 1rem;       /* 16px - 大面板 */
--radius-full: 999px;    /* 按钮、标签 */
--radius-circle: 50%;    /* 头像、图标井 */
```

### 阴影层级
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
```

### 布局网格
- **桌面**：12 列，间距 24px，最大宽度 1280px
- **移动端（390px）**：4 列，间距 16px，左右边距 16px

---

## DS-04：组件状态与行为

### 按钮
#### 主要按钮（Primary）
- **default**: 背景 `var(--accent-500)`，文本 `var(--on-accent)`，圆角 `var(--radius-full)`
- **hover**: 背景 `var(--accent-600)`，轻微上抬 `translateY(-1px)`
- **focus**: 外描边 2px `var(--accent-500)` + 4px 偏移
- **active**: 背景 `var(--accent-700)`，无位移
- **disabled**: 背景 `var(--surface-03)`，文本 `var(--text-disabled)`，`cursor: not-allowed`
- **loading**: 禁用状态样式 + spinner 动画，文本 "处理中…"

#### 次要按钮（Secondary）
- **default**: 背景透明，边框 1px `var(--border-default)`，文本 `var(--text-primary)`
- **hover**: 背景 `var(--surface-02)`
- **disabled**: 边框与文本均为 `var(--text-disabled)`

#### 危险按钮（Danger）
- **default**: 背景 `var(--danger)`，文本白色
- **hover**: 背景加深 10%

### 表单输入
#### 文本输入框
- **default**: 背景 `var(--surface-02)`，边框 1px `var(--border-default)`，圆角 `var(--radius-sm)`
- **hover**: 边框颜色 `var(--border-strong)`
- **focus**: 边框 2px `var(--accent-500)`，外阴影 `0 0 0 3px` accent 10% 透明度
- **error**: 边框 `var(--danger)`，下方显示错误文本
- **disabled**: 背景 `var(--surface-01)`，文本 `var(--text-disabled)`

#### 选择器与复选框
- **focus**: 2px 实线焦点环，颜色 `var(--accent-500)`
- **checked**: 背景 `var(--accent-500)`，勾选标记白色

### 徽章（Badge）
- **default**: 背景 `var(--surface-03)`，文本 `var(--text-secondary)`，圆角 `var(--radius-full)`，padding `var(--space-1) var(--space-3)`
- **confirmed**: 背景 `var(--success-bg)`，文本 `var(--success)`，前缀图标 ✓
- **review**: 背景 `var(--warning-bg)`，文本 `var(--warning)`，边框虚线
- **missing**: 背景 `var(--surface-02)`，文本 `var(--text-muted)`，前缀图标 —

### 导航
#### 主导航（顶部或侧边）
- **default**: 背景 `var(--surface-01)`，文本 `var(--text-secondary)`
- **hover**: 背景 `var(--surface-02)`
- **active**: 背景 `var(--surface-03)`，文本 `var(--accent-500)`，左侧 3px 竖条 `var(--accent-500)`
- **focus**: 焦点环，键盘导航可见

### 表格
- **header**: 背景 `var(--surface-02)`，文本 `var(--text-secondary)`，字重 `var(--font-semibold)`
- **row default**: 背景 `var(--surface-01)`，底边框 1px `var(--border-subtle)`
- **row hover**: 背景 `var(--surface-02)`
- **row selected**: 背景 `var(--surface-03)`，左侧 3px 竖条 `var(--accent-500)`
- **empty state**: 居中显示插图 + 提示文字 "暂无数据"
- **loading**: 骨架屏动画，3-5 行淡入淡出
- **error**: 红色警告图标 + "加载失败，请重试"

### 图表
- **default**: 线条 2px，颜色取自 `var(--accent-500)`
- **hover**: 数据点放大，显示 tooltip（背景 `var(--surface-04)`，文本完整数值 + 单位 + 日期）
- **missing data**: 该段线条变虚线，颜色 `var(--text-muted)`，不连接断点
- **empty**: 灰色占位区域 + "缺少至少 2 个数据点"
- **loading**: 骨架图表轮廓

### 抽屉（Drawer）
- **enter**: 从右侧滑入，300ms ease-out，背景遮罩淡入
- **exit**: 滑出 + 遮罩淡出
- **focus trap**: 打开时焦点锁定在抽屉内，Esc 关闭

---

## DS-05：原生组件与多状态

### 日期选择器
- 使用原生 `<input type="date">` 保证可访问性
- **missing**: 显示占位符 "—"，边框虚线

### 文件上传（化验单 OCR）
- **default**: 虚线边框拖放区，图标 + "拖入文件或点击上传"
- **drag over**: 边框实线，背景 `var(--accent-500)` 5% 透明度
- **uploading**: 进度条 + 文件名
- **error**: 红色边框 + 错误信息（如 "文件格式不支持"）
- **review**: 上传成功后显示缩略图 + "待审核" 徽章

### 多选标签（治疗线关联）
- **default**: 已选项显示为 pill 徽章，带 × 删除按钮
- **focus**: 最后一个 pill 焦点环
- **empty**: 占位符 "开始输入或选择"

---

## 三页低保真文字结构

### 虚构患者：张明，男，62 岁，肺腺癌 IV 期（2024-03 确诊）

---

### 1. Dashboard 总览（桌面 1280px / 移动 390px）

#### 桌面布局（3 列网格）
```
┌─ 顶部栏 ────────────────────────────────────┐
│ Logo | 总览 时间线 化验 随访 | 设置 主题切换 │
└──────────────────────────────────────────────┘

┌─ 页面标题 ──────────────────────────────────┐
│ 张明的治疗档案                               │
│ 最后更新：2026-09-28                         │
└──────────────────────────────────────────────┘

┌─ 卡片区域（3 列） ──────────────────────────┐
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│ │治疗概况    │ │近期化验    │ │待办事项    │ │
│ │           │ │           │ │           │ │
│ │· 一线治疗  │ │· 3 项新结果│ │🔔 复诊到期  │ │
│ │  进行中    │ │· 1 项待审核│ │   (超期2天) │ │
│ │· 已完成    │ │· 趋势图    │ │· 安排随访   │ │
│ │  2 个周期  │ │  [缩略图]  │ │             │ │
│ └───────────┘ └───────────┘ └───────────┘ │
│                                             │
│ ┌───────────────────────────────────────┐  │
│ │关键指标趋势（CEA，过去 6 个月）          │  │
│ │ [折线图：Y 轴单位 ng/mL，X 轴日期]       │  │
│ │ ● 2026-04: 5.2  ● 2026-06: 3.8         │  │
│ │ ● 2026-08: 4.1  [参考范围: <5.0]       │  │
│ └───────────────────────────────────────┘  │
│                                             │
│ ┌───────────────────────────────────────┐  │
│ │快速操作                                  │  │
│ │ [+ 录入新记录] [上传化验单] [导出 PDF]   │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### 移动布局（390px，单列堆叠）
```
┌─ 顶部栏 ──────────────┐
│ ☰ | 总览 | 设置       │
└────────────────────────┘

┌─ 患者卡片 ────────────┐
│ 张明，62 岁            │
│ 肺腺癌 IV 期           │
│ [查看完整档案]         │
└────────────────────────┘

┌─ 待办 ────────────────┐
│ 🔔 复诊超期 2 天        │
│ [安排随访]             │
└────────────────────────┘

┌─ 化验概况 ────────────┐
│ 3 项新结果 | 1 项待审核 │
│ [查看全部]             │
└────────────────────────┘

┌─ CEA 趋势 ────────────┐
│ [简化折线图]           │
│ 最新: 4.1 ng/mL        │
│ (参考: <5.0)           │
└────────────────────────┘

┌─ 快速操作 ────────────┐
│ [+ 录入] [上传] [导出] │
└────────────────────────┘
```

---

### 2. 治疗时间线（Timeline）

#### 桌面布局
```
┌─ 面包屑 ──────────────────────────────────┐
│ 总览 > 治疗时间线                          │
└────────────────────────────────────────────┘

┌─ 视图切换 ────────────────────────────────┐
│ ● 时间线  ○ 表格  ○ 甘特图                 │
└────────────────────────────────────────────┘

┌─ 时间轴（垂直） ──────────────────────────┐
│                                             │
│ 2024-03-15 ● [确诊]                        │
│ ├─ 病理: 肺腺癌，cT4N3M1c                   │
│ ├─ 基因检测: EGFR 19 del                   │
│ └─ 来源: [某某医院病理报告 #2024-0315]      │
│    ↓                                        │
│                                             │
│ 2024-04-01 ● [一线治疗开始] ✓ 已确认        │
│ ├─ 方案: 奥希替尼 80mg qd                   │
│ ├─ 周期: 1-4 (2024-04 至 2024-07)          │
│ └─ 疗效评估: 部分缓解（PR）                 │
│    ↓                                        │
│                                             │
│ 2024-05-10 ● [基线化验]                    │
│ ├─ CEA: 12.3 ng/mL (参考: <5.0) ⚠️        │
│ ├─ 血常规: 正常 ✓                          │
│ └─ [查看完整报告]                          │
│    ↓                                        │
│                                             │
│ 2024-08-20 ● [副作用记录] ⚠️ 待审核         │
│ ├─ 类型: 皮疹（2 级）                       │
│ ├─ 处理: 外用药膏                          │
│ └─ AI 建议: 建议皮肤科会诊 [来源: GPT-4]   │
│    ↓                                        │
│                                             │
│ 2026-09-28 ● [最近化验]                    │
│ ├─ CEA: 4.1 ng/mL ✓                        │
│ ├─ CT: 病灶稳定                            │
│ └─ 下次复查: 2026-12-15                    │
│                                             │
└─────────────────────────────────────────────┘

[+ 添加新事件] [导出时间线 PDF]
```

#### 移动布局（卡片堆叠）
```
┌─ 2026-09-28 ────────┐
│ [最近化验] ✓         │
│ CEA: 4.1 ng/mL      │
│ [展开详情]          │
└──────────────────────┘

┌─ 2024-08-20 ────────┐
│ [副作用] ⚠️ 待审核   │
│ 皮疹 2 级           │
│ [审核]              │
└──────────────────────┘

┌─ 2024-05-10 ────────┐
│ [基线化验]          │
│ CEA: 12.3 ⚠️        │
│ [查看]              │
└──────────────────────┘

... [加载更多]
```

---

### 3. 指标趋势（Lab Trends）

#### 桌面布局
```
┌─ 标题栏 ──────────────────────────────────┐
│ 化验指标趋势                               │
│ [选择指标: CEA ▼] [时间范围: 1年 ▼]       │
└────────────────────────────────────────────┘

┌─ 图表区域 ────────────────────────────────┐
│          CEA 趋势（ng/mL）                 │
│   15 ┤                                     │
│      │  ●                                  │
│   10 ┤   ╲                                 │
│      │     ●─────●                         │
│    5 ┤             ╲   ●───●───●          │
│      │               ●                     │
│    0 ┼─────────────────────────────────────│
│      2024-03  05   07   09   2026-03  09  │
│                                             │
│   ━━━ 实测值  ─ ─ 参考上限 (5.0)          │
│   ● 数据点（hover 显示详情）                │
│   ⚠️ 超出参考范围高亮                       │
└─────────────────────────────────────────────┘

┌─ 数据表格 ────────────────────────────────┐
│ 日期         | 数值      | 参考范围  | 来源 │
│ ──────────────────────────────────────── │
│ 2026-09-28  | 4.1       | <5.0 ✓   | 报告#│
│ 2026-06-15  | 3.8       | <5.0 ✓   | 报告#│
│ 2026-03-10  | 4.5       | <5.0 ✓   | 报告#│
│ 2024-08-20  | 8.2       | <5.0 ⚠️  | 报告#│
│ 2024-05-10  | 12.3      | <5.0 ⚠️  | 报告#│
│ ──────────────────────────────────────── │
│ [导出 CSV] [添加新数据]                    │
└─────────────────────────────────────────────┘

⚠️ 说明: 高于或低于参考范围不构成诊断，请结合医生建议。
```

#### 移动布局
```
┌─ 指标选择 ──────────┐
│ [CEA ▼] [1年 ▼]    │
└──────────────────────┘

┌─ 简化图表 ──────────┐
│    ●                 │
│     ╲    ●──●──●    │
│       ●──           │
│ ─ ─ ─ ─ ─ (参考)    │
│ 2024    2026        │
└──────────────────────┘

┌─ 最新 3 条 ─────────┐
│ 09-28: 4.1 ✓        │
│ 06-15: 3.8 ✓        │
│ 03-10: 4.5 ✓        │
│ [查看全部]          │
└──────────────────────┘
```

---

## 可访问性

### 对比度目标
- **正文**: 至少 4.5:1（WCAG AA）
- **大号文本**: 至少 3:1
- **关键操作**: 建议 7:1（AAA）
- **注意**: 本规范提供的颜色 token 需实际测量验证，当前未经工具检验

### 键盘导航
- 所有交互元素可通过 Tab 访问
- 焦点顺序符合视觉顺序
- 焦点环 2px 实线，颜色 `var(--accent-500)`，与背景对比度 ≥3:1
- Esc 关闭模态框与抽屉

### 触摸目标
- 最小尺寸 44×44px
- 间距至少 8px

### 屏幕阅读器
- 语义化 HTML（`<main>`, `<nav>`, `<article>`）
- `aria-label` 用于图标按钮
- `aria-live="polite"` 用于状态更新
- 图表提供替代文本表格

### 动效
- 默认动画 200-300ms
- 用户启用 `prefers-reduced-motion` 时禁用过渡

---

## 本地 Demo 范围

**已实现功能（纯静态，刷新恢复）：**
1. Dashboard 显示虚构患者张明的 3 张卡片（治疗概况、近期化验、待办）
2. CEA 趋势图（SVG 硬编码 5 个数据点）
3. 浅色/深色主题切换按钮（localStorage 持久化）
4. 强调色切换：4 种预设（Clinical Cyan / Research Teal / Archive Slate / Precision Indigo）
5. 一个表单示例：录入副作用（输入框 + 下拉 + 保存按钮），点击保存显示 toast "已保存（Demo 不持久化）"
6. 移动端响应式：390px 以下堆叠布局

**明确未实现（需真实开发）：**
- 录入工作台的 LLM 提取与澄清流程
- 时间线的甘特图视图
- 化验单 OCR 与批量上传
- 随访计划与到期提醒
- 分享授权码生成
- AI 辅助分析接口
- 真实数据持久化
- 登录与账户系统
- 配额与订阅逻辑
- 导出 PDF 功能

---

## 实现 Tokens（JSON）

```json
{
  "colors": {
    "light": {
      "surface": {
        "00": "#FAFBFC",
        "01": "#F2F4F6",
        "02": "#E8EBEF",
        "03": "#DFE3E8",
        "04": "#D5DAE1"
      },
      "text": {
        "primary": "#0D1821",
        "secondary": "#3D5266",
        "muted": "#6B7D8C",
        "disabled": "#A1ADB8"
      },
      "border": {
        "subtle": "#E8EBEF",
        "default": "#D5DAE1",
        "strong": "#A1ADB8"
      },
      "semantic": {
        "success": "#059669",
        "successBg": "#D1FAE5",
        "warning": "#D97706",
        "warningBg": "#FEF3C7",
        "danger": "#DC2626",
        "dangerBg": "#FEE2E2",
        "info": "#2563EB",
        "infoBg": "#DBEAFE"
      },
      "special": {
        "reviewBorder": "#D97706",
        "aiGeneratedBg": "#DBEAFE",
        "missingIndicator": "#6B7D8C",
        "confirmedBadge": "#059669"
      }
    },
    "dark": {
      "surface": {
        "00": "#040A0F",
        "01": "#0A1218",
        "02": "#101A24",
        "03": "#16232F",
        "04": "#1D2D3C"
      },
      "text": {
        "primary": "#E8F0F5",
        "secondary": "#A8BBC9",
        "muted": "#6B7D8C",
        "disabled": "#3F4F5C"
      },
      "border": {
        "subtle": "#1D2D3C",
        "default": "#2D3F52",
        "strong": "#3D5266"
      },
      "semantic": {
        "success": "#10B981",
        "successBg": "#064E3B",
        "warning": "#F59E0B",
        "warningBg": "#78350F",
        "danger": "#EF4444",
        "dangerBg": "#7F1D1D",
        "info": "#3B82F6",
        "infoBg": "#1E3A8A"
      },
      "special": {
        "reviewBorder": "#F59E0B",
        "aiGeneratedBg": "#1E3A8A",
        "missingIndicator": "#6B7D8C",
        "confirmedBadge": "#10B981"
      }
    },
    "accents": {
      "clinicalCyan": {
        "50": "#E0F7FF",
        "500": "#06B6D4",
        "600": "#0891B2",
        "700": "#0E7490",
        "onAccent": "#FFFFFF"
      },
      "researchTeal": {
        "50": "#D4F5F0",
        "500": "#14B8A6",
        "600": "#0D9488",
        "700": "#0F766E",
        "onAccent": "#FFFFFF"
      },
      "archiveSlate": {
        "50": "#E8EDF2",
        "500": "#64748B",
        "600": "#475569",
        "700": "#334155",
        "onAccent": "#FFFFFF"
      },
      "precisionIndigo": {
        "50": "#E0E7FF",
        "500": "#6366F1",
        "600": "#4F46E5",
        "700": "#4338CA",
        "onAccent": "#FFFFFF"
      }
    }
  },
  "spacing": {
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem"
  },
  "radius": {
    "sm": "0.375rem",
    "md": "0.5rem",
    "lg": "0.75rem",
    "xl": "1rem",
    "full": "999px",
    "circle": "50%"
  },
  "typography": {
    "fontFamily": {
      "sans": "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
      "mono": "ui-monospace, 'SF Mono', 'Cascadia Code', 'Source Code Pro', monospace",
      "numeric": "'SF Pro Text', 'Helvetica Neue', sans-serif"
    },
    "fontSize": {
      "xs": "clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem)",
      "sm": "clamp(0.875rem, 0.825rem + 0.25vw, 0.9375rem)",
      "base": "clamp(1rem, 0.95rem + 0.25vw, 1.0625rem)",
      "lg": "clamp(1.125rem, 1.05rem + 0.375vw, 1.25rem)",
      "xl": "clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)",
      "2xl": "clamp(1.5rem, 1.35rem + 0.75vw, 1.875rem)",
      "3xl": "clamp(1.875rem, 1.65rem + 1.125vw, 2.25rem)"
    },
    "lineHeight": {
      "tight": "1.25",
      "normal": "1.5",
      "relaxed": "1.75"
    },
    "letterSpacing": {
      "tight": "-0.02em",
      "normal": "0",
      "wide": "0.025em"
    },
    "fontWeight": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    }
  },
  "shadows": {
    "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
    "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.6)"
  }
}
```

---

**版本说明**：本规范为 Clarity Grid v1.0 基线版本，适用于 MyOncode 初期开发与设计评审。所有颜色值需在实际应用中通过对比度检测工具验证 WCAG 合规性。