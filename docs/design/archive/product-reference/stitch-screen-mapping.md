# Firefly-Isle Stitch 页面映射与命名说明

## 1. 文档目的

这份文档用于固定当前 Stitch 项目的页面清单、页面命名映射，以及后续自动化/文档应读取哪一层名称作为“真名”。

当前已经确认：

- Stitch 画布上显示的页面名称，来自 `get_project -> screenInstances[*].label`
- MCP `list_screens` 读到的页面标题，来自底层 `screen.title`
- 这两层名称目前并不一致

因此，后续所有页面清单、产品文档、自动化映射，都应以 **`screenInstances.label`** 作为当前页面名称的唯一真相源。

---

## 2. 当前项目状态

| 项目 | 值 |
|---|---|
| Stitch Project ID | `projects/16650187914970423595` |
| 当前 `project.title` | `Login Page` |
| 当前可见且带标签的页面实例数 | `12` |
| 当前 MCP `list_screens` 返回 screen 数 | `12` |

说明：

- `project.title` 仍是旧值，不应作为产品信息架构命名来源
- 当前“页面真实名称”应以画布可见实例标签为准

---

## 3. 当前页面清单与映射

下表只包含 **当前画布上可见且带标签** 的 12 个页面，不包含隐藏历史副本。

| 当前页面名称（`screenInstances.label`） | `sourceScreen` | 当前 MCP `screen.title` | 尺寸 |
|---|---|---|---|
| `登录页面 - Web - Dark` | `projects/16650187914970423595/screens/b2ad0f7570e74904b9c79a8e1f97aebb` | `登录页面 - 多方式版` | `1280 x 1024` |
| `临床工作区 - Web - Dark` | `projects/16650187914970423595/screens/dd5d14c473c04504a4dd41d8f8bc721c` | `临床工作区 - 侧边栏优化版` | `1280 x 1701` |
| `档案详情 - Web - Dark` | `projects/16650187914970423595/screens/e3c5a1a650604933941c2d4d3dfde047` | `档案详情 - 侧边栏样式优化版` | `1280 x 2425` |
| `登录页面 - Web - Light` | `projects/16650187914970423595/screens/846b3904dbf44f449b5c533caec9314e` | `登录页面 - 墨迹文稿版` | `1280 x 1199` |
| `临床工作区 - Web - Light` | `projects/16650187914970423595/screens/724b7cd0d4b643e49798ddd2734f050c` | `临床工作区 - 墨迹文稿版` | `1280 x 1750` |
| `档案详情 - Web - Light` | `projects/16650187914970423595/screens/ce048a2762ad429a8eb4f371bff04f5a` | `档案详情 - 墨迹文稿版` | `1280 x 2191` |
| `登录页面 - Mobile - Dark` | `projects/16650187914970423595/screens/d44ac727ef2c4dffbbd0f53de4542d3e` | `登录页面 - 移动端 (顶栏导航 V2)` | `390 x 1326` |
| `临床工作区 - Mobile - Dark` | `projects/16650187914970423595/screens/3471a8f7819a43a0b853c3ae59168715` | `临床工作区 - 移动端 (顶栏导航 V2)` | `390 x 1459` |
| `档案详情 - Mobile - Dark` | `projects/16650187914970423595/screens/33dcdcf38cf645119c5d71266a128fee` | `档案详情 - 移动端 (顶栏导航 V1)` | `390 x 1431` |
| `登录页面 - Mobile - Light` | `projects/16650187914970423595/screens/43b5a6cf95764258bb8aa97ce75041f9` | `登录页面 - 移动端 (顶栏导航版)` | `390 x 1380` |
| `临床工作区 - Mobile - Light` | `projects/16650187914970423595/screens/5c683275768f46a682f403b42265e814` | `临床工作区 - 移动端 (顶栏导航版)` | `390 x 1452` |
| `档案详情 - Mobile - Light` | `projects/16650187914970423595/screens/f5b06b5ba3974a5d80b95c0df604f1c1` | `档案详情 - 移动端 (顶栏导航版)` | `390 x 1912` |

说明：

- 表中的尺寸来自当前画布上可见实例尺寸，不是 `list_screens` 返回的大画布逻辑尺寸
- `sourceScreen` 是后续读取页面 HTML、截图、结构内容时应使用的底层 screen 资源

---

## 4. 命名层级说明

### 4.1 当前应当信任的名字

`get_project(name) -> screenInstances[*].label`

这是当前在 Stitch 画布上真实显示给用户看的名称，也是当前产品文档和页面编排上应该使用的名称。

### 4.2 当前不应当直接信任的名字

`list_screens(projectId) -> screens[*].title`

这一层仍保留很多历史标题，例如：

- `登录页面 - 多方式版`
- `临床工作区 - 侧边栏优化版`
- `档案详情 - 墨迹文稿版`

这些标题对调试底层 screen 资源仍然有参考价值，但不应再作为页面真名使用。

### 4.3 当前不应作为信息架构来源的字段

`get_project(name) -> title`

当前项目标题仍然是 `Login Page`，显然已经不能代表这套设计的真实内容范围。

---

## 5. Stitch AI 改底层标题实验结论

### 5.1 实验目标

尝试使用 Stitch MCP 的 `edit_screens` 能力，将底层 `screen.title` 同步为当前画布上的新命名：

- `登录页面 - Web - Dark`
- `临床工作区 - Web - Dark`
- `档案详情 - Web - Dark`

### 5.2 实验范围

仅对第一组 `Web - Dark` 三页做实验：

- `b2ad0f7570e74904b9c79a8e1f97aebb`
- `dd5d14c473c04504a4dd41d8f8bc721c`
- `e3c5a1a650604933941c2d4d3dfde047`

### 5.3 实验结果

实验失败，已停止继续对其他分组尝试。

失败依据如下：

1. 原 3 个底层 `screen.title` 没有变化，仍然保持旧名字
2. 原 3 个页面的截图 hash 和 HTML hash 保持不变，说明原资源没有被原地改名
3. `list_screens` 总数仍然是 `12`，项目持久化页面列表没有发生我们需要的重命名结果
4. `edit_screens` 返回了新的 screen 输出结果，而不是就地修改原 screen metadata

### 5.4 实验结论

当前 Stitch MCP 暴露的能力中：

- 有 `edit_screens`
- 没有显式 `rename_screen`
- 没有显式 `update_screen_title`

因此，`edit_screens` 不能被当作可靠的底层标题重命名接口。

---

## 6. 后续使用规则

### 6.1 页面清单与产品文档

统一以：

`get_project(name) -> screenInstances[*].label`

作为页面名称来源。

### 6.2 页面内容读取

需要读取截图、HTML、页面结构时：

- 先从 `screenInstances` 找到当前页面名称对应的 `sourceScreen`
- 再用 `get_screen(name=sourceScreen)` 读取底层页面资源

### 6.3 禁止的读取方式

在没有新的 Stitch API/工具前，不要直接把下面这些字段当作页面真名：

- `project.title`
- `list_screens.title`

### 6.4 若未来再次尝试统一命名

只有在 Stitch 后续提供以下任一能力时，才应再次尝试改底层标题：

- 显式 screen rename API
- 显式 update screen metadata/title API
- UI 侧确认能同步更新底层 `screen.title` 的正式操作路径

在此之前，默认策略固定为：

> **所有外部分析、清单、映射和自动化都以 `screenInstances.label` 为准。**

---

## 7. 附录：本次失败实验产生的新 screen 输出

`edit_screens` 在 `Web - Dark` 实验中返回过新的 screen 结果，但这些结果没有成为当前持久化页面清单的一部分：

- `projects/16650187914970423595/screens/8ae507cb617e4b84bf6dfefdbcb89f0e`
- `projects/16650187914970423595/screens/f24796505328485c83c120a7adcb7bb4`
- `projects/16650187914970423595/screens/875631efa53349308675dd799259796e`

这些结果只能证明 Stitch AI “理解了改名意图”，不能证明它完成了“原地修改旧 screen.title”。
