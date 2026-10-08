# 产品名称与定位：知见 / MyOncode

更新日期：2026 年 10 月 8 日。用户确认中文“知见”、英文“MyOncode”，面向肿瘤患者与家属提供全程管理工具。Medclear 的撤回及早期域名查询保留为历史记录，不代表当前注册状态。

## 名称与使用

| 项目 | 当前决定 |
| --- | --- |
| 中文名称 | 知见 |
| 英文名称 | MyOncode；展示大小写固定，下载前缀 myoncode |
| 中英文并列 | 知见 / MyOncode |
| 中文产品说明 | 面向肿瘤患者与家属的全程管理工具。 |
| 英文产品说明 | Cancer care management for patients and families. |

“知”表达理解医学信息，“见”表达看清记录、变化与关联。MyOncode 覆盖记录管理与信息理解的产品定位；不表示诊断、医疗许可或疗效保证。完整同名 .com 与 .cn 的普通注册状态及同名产品须在购买前核查。

## 产品背景与范围

知见 / MyOncode，是面向肿瘤患者与家属，集病历整理、治疗追踪、指标管理与疾病信息理解于一体的全程管理工具。作为患者的资料与追踪中枢，组织检查、诊断、用药和治疗记录，支持回看和就诊沟通，并持续追踪指标、病情记录、治疗进展、副作用和随访。

- 现有功能基础：病历与报告整理、治疗时间线、检验指标趋势、症状和随访记录，以及查阅、受控分享、导出与就医沟通。各项功能的实际验收状态见 [交付清单](saas-acceptance.md)。
- 后续规划：肿瘤基因检测报告解读，解释具体变异对应的信号通路、靶点与相关用药知识，提供来源、证据与不确定性说明。此项尚未实现，需另立行为与数据合同。
- 取舍依据：优先减少资料遗漏、理解困难和管理负担，以信息准确、来源可查、变化清晰、结论有边界作为专业化要求。情绪安慰与长期陪伴不作为核心功能或品牌主线；普通患者仍应能够理解界面和说明。

产品提供信息管理与理解支持，不替代医生诊疗，不把治疗效果归因于软件。详细实现范围见 [产品范围](core-scope.md)。

## 确认与实施边界

本地 Web 已适配品牌字标、介绍、浏览器/PWA 展示和下载名称；运行时名称集中在 `src/lib/brand.ts`。原灯塔图标暂时保留，新候选图标未确认。本地 Checkout 请求的商品名称已改为 MyOncode donation，原生壳源配置显示名已改为知见；真机、签名、函数部署与发布独立验收。Stripe 远端商户名称、账单描述及已有支付对象未读取或修改。账号 JSON 的 `firefly-isle.account-export` 格式、浏览器存储键、PWA identity/缓存前缀、bundle ID、OAuth 与既有数据/缓存标识保留原值；GitHub 仓库已原地更名为 `0xTotoroX/myoncode`，包名改为 `myoncode`，本地实际目录为 `/Users/Totoro/Documents/Projects/myoncode`，旧路径为指向它的兼容符号链接，以保留已有聊天的工作目录；不迁移或重置数据。

`myoncode.com` 已在腾讯云注册成功并完成实名认证。2026-10-08 控制台核对：腾讯云初审已通过、工信部短信已核验，当前管局审核中；新域名尚未启用。尚未完成商标与微信名称核验。后续变更与实际启用证据见[腾讯云操作单](../operations/tencent-cloud-cutover.md)。

此前考虑的 Medwise 已有同领域的医学信息检索服务，因此本次未采用。[Medwise 官方产品说明](https://medwise.ai/terms.html)

## 历史英文候选与实查

以下为此前筛选记录，MyOncode 已选定；记录中的域名价格与状态不是当前承诺。域名要求是完整匹配英文名称的 .com 与 .cn，避免通过拼写错误、数字、连字符或额外前后缀绕开主名。

| 候选 | 命名意图与取舍 | 2026-10-04 腾讯云实际结果 |
| --- | --- | --- |
| Medveria | Med 与 verify 的品牌构词意图，强调资料核对和有依据的理解；建议读 med-VEER-ee-uh。属于造词，单看名字不一定能读出核验含义，仍需产品说明。 | medveria.com、medveria.cn 均显示“立即加购”，分别为 83 元/首年、33 元/首年。 |
| Medclevia | Med、clear 与 via 的品牌构词意图，强调把治疗资料和过程理清；建议读 med-KLEE-vee-uh。拼写与构词需要解释，读感较长。 | medclevia.com、medclevia.cn 均显示“立即加购”，分别为 83 元/首年、33 元/首年。 |

两组由主 Agent 补充，Claude Fable 5.1 在原会话评审后更推荐 Medveria；其读感与品牌联想属于意见，不作为词源或药品命名事实。初步网络精确拼写检索未找到这两组同名产品，不构成商标核验。四个域名的可注册判断来自 [腾讯云批量查询](https://buy.cloud.tencent.com/domain/bulkregister) 的实际结果，.com 注册局 RDAP 均未返回登记对象，仅作为辅助证据；尚未加购或购买，最终以注册成功为准。

当前标准续费价 .com 为 90 元/年，.cn 为 38 元/年，后续可能调整。[腾讯云价格表](https://buy.cloud.tencent.com/domain/price)

Claude 新提案中的 Treatline、Clinote、Healthmap、Oncoview、Insightmed、Logimed、Recormed、Vitapath、Notemed 的 .com 均由腾讯云显示已注册。第二批 Evimed、Veritrace、Chronicare、Signalpath、Traceline、Archimed、Timelogic、Linemark，以及后续 Clarivo、Visitrack、Lumepath、Knowline 的 .com 均有注册局登记，未进入优先名单。Curemap 因治愈含义不符合要求而排除。

## 撤回 Medclear 的依据

2026-10-04 用户在了解域名登记后撤回 Medclear，并明确保留“知见”，仅重取英文。medclear.com 的 .com 注册局登记时间为 2008-09-28，当前不能按普通未注册域名购买。[注册局 RDAP](https://rdap.verisign.com/com/v1/domain/medclear.com)

此前用户浏览器查询的 medclaer.com 是 e/a 顺序相反的另一域名，其可注册状态不能证明 medclear.com 可用，也不采用它替代品牌。此前 Medclear 的定稿记录见对应 Git 历史与 [定稿日志](../log/0031-medclear-naming-decision.md)。

## 历史命名与查询记录

以下保留 2026 年 10 月 3 日及之前的原始讨论和查询结果，其中“本轮”“建议”“尚未选定”均指当时状态，不代表当前推荐或当前域名状态。

更新与查询时间：2026 年 10 月 3 日 06:36–06:42（北京时间）；注册商核验时间为 06:42。名称尚未选定，也未注册、加购或购买域名。产品现有名称未修改。

### 本轮新候选

此前推荐过的名字全部退出本轮候选。以下三个组合分别偏重病历整理、就诊用途和家属陪伴，供用户选择；英文表达产品方向，不要求与中文逐字对应。

| 中文名 / 英文名 | 名称含义 | 适合之处与取舍 |
| --- | --- | --- |
| 历页 / CareDaybook | 将历次病历整理成可翻阅的记录；Daybook 表达按时间积累的记录册。 | 最贴近病历、治疗时间线和导出的核心用途。中文短，但单看名字可能联想到日历，首次出现时需要产品说明。 |
| 就诊簿 / VisitDaybook | 把每次就诊的资料、检查和安排放进同一本记录簿。 | 三组中用途最直观，容易向患者和家属解释；名称偏描述性，品牌辨识度较弱。英文有 12 个字母。 |
| 历伴 / CareWaybook | 帮患者与家属持续保管、整理治疗资料；英文表达照护过程中的记录册。 | 更强调长期使用和家属参与，能覆盖症状与随访；中文不能直接说明是病历工具，Waybook 的含义也需要解释。 |

按现有核心功能，建议优先讨论“历页”；若最看重让新用户立即看懂用途，优先讨论“就诊簿”。**三个名字均未定稿，对应的六个域名在本次腾讯云查询中均可注册，但尚未持有。**

建议产品说明统一为“患者与家属的病历整理工具”。名称不使用诊断或治愈承诺，也不靠“AI”“智能诊疗”定义产品。

### 本轮域名核验

| 拟用域名组合 | 腾讯云 06:42 查询结果 | .com 登记查询辅助证据 |
| --- | --- | --- |
| caredaybook.com / caredaybook.cn | 两者均显示“立即加购” | [注册局 RDAP](https://rdap.verisign.com/com/v1/domain/caredaybook.com) 返回 HTTP 404 |
| visitdaybook.com / visitdaybook.cn | 两者均显示“立即加购” | [注册局 RDAP](https://rdap.verisign.com/com/v1/domain/visitdaybook.com) 返回 HTTP 404 |
| carewaybook.com / carewaybook.cn | 两者均显示“立即加购” | [注册局 RDAP](https://rdap.verisign.com/com/v1/domain/carewaybook.com) 返回 HTTP 404 |

本次在[腾讯云域名查询](https://buy.cloud.tencent.com/domain/)选择“批量注册”，输入 caredaybook、visitdaybook、carewaybook，仅勾选 .com 与 .cn。逐项读取结果页，六个域名各自均显示价格与“立即加购”：.com 为 83 元/首年，.cn 为 33 元/首年。查询未登录、未加购，购物车为空。报价不代表续费价或未来成交价。

Chrome 不可用后，已通过 Codex 内置浏览器完成上述核验。腾讯官方[注册说明](https://cloud.tencent.com/document/product/242/9595)将“立即加购”解释为未注册、可选择注册。**这是查询时的可注册状态，不构成持有或预留；最终以注册成功为准。**名称与运营主体确定后再办理注册。

RDAP 仅作为辅助证据：HTTP 404 表示本次查询未返回登记对象，单独不能保证可注册。本报告对新候选的可注册判断来自本轮注册商实际结果。[ICANN RDAP 说明](https://www.icann.org/rdap/)

本轮完整页面截图保存在本机 `work/saas-acceptance/domain-candidates-tencent-full.png`，六个域名的名称、价格和“立即加购”也由完整页面文本核对；该验收产物不加入 Git。

本轮还查询了中文名称及英文精确拼写，没有取得可证明这三组名称独占的材料。搜索结果未出现明确同名产品，不等于商标或微信名称可用。

### 历史候选与证据

以下名字已经退出候选，仅保留查证记录，不再作为本轮推荐：

- 原项目名称：一页萤屿 / Firefly-Isle。
- 更早建议：灯屿 / Lampisle、AlongNote、清序、CareThread、CareFolio、CareBrief，以及 qingxuji、banchengji 对应的旧域名方向。
- 上一轮建议：随程记 / CareChapters、程笺 / CareLeaflet、清历 / CareOutline、诊前册 / VisitThread。

以下是 **2026 年 10 月 2 日 18:56（北京时间）的历史查询结果**，本次未复查。查询当时使用用户现有 Chrome 中的注册商页面，只查询，未加购，腾讯云购物车为空。

| 历史域名组合 | 当时腾讯云查询结果 | 当时 .com 交叉核验 |
| --- | --- | --- |
| carechapters.com / carechapters.cn | 两者均显示“立即加购” | Namecheap 正常价格及 Add to cart；Verisign RDAP 返回 404 |
| careleaflet.com / careleaflet.cn | 两者均显示“立即加购” | 同上 |
| careoutline.com / careoutline.cn | 两者均显示“立即加购” | 同上 |
| visitthread.com / visitthread.cn | 两者均显示“立即加购” | 同上 |
| suichengji.com / suichengji.cn | 两者均显示“立即加购” | 同上 |

当时腾讯云页面报价为 .com 83 元/首年、.cn 33 元/首年；Namecheap 五个 .com 均显示 11.28 美元/年及 Add to cart，未标为 Premium。报价不代表续费价、当前状态或新候选域名的价格。

#### 历史核验方法与证据边界

1. [腾讯云域名查询](https://buy.cloud.tencent.com/domain/)：使用批量注册搜索，输入 carechapters、careleaflet、careoutline、visitthread、suichengji，只选 .com 与 .cn，实际结果中上述 10 个域名均有“立即加购”。腾讯官方[注册说明](https://cloud.tencent.com/document/product/242/9595)将此状态解释为域名未注册、可选择注册。
2. [Namecheap 查询入口](https://www.namecheap.com/domains/registration/results/?domain=careleaflet.com)：在 Beast Mode 中对上述五个 .com 查询，实际结果均显示正常报价与 Add to cart，作为独立注册商交叉核验。
3. Verisign .com 注册局 RDAP：例如 [carechapters.com 注册数据查询](https://rdap.verisign.com/com/v1/domain/carechapters.com)，五个 .com 当时均返回 HTTP 404。历史可注册判断以当时的注册商结果为主要证据。

历史查询保留了实际结果与方法，当时未保存截图。域名网页查询不构成名称预留。

### 命名依据

命名采用的筛选标准是：短、容易读写、能让目标用户理解、与产品用途相符，并分别核查域名及相近名称。域名优先避免数字和连字符。上述原则参考了已打开的 [Shopify 品牌命名指南](https://www.shopify.com/blog/how-to-name-your-brand)及[域名选择指南](https://www.shopify.com/blog/choose-domain-name)。

本项目的名称应表达整理、记录、复诊准备；病历、AI 和化验是功能，不能把品牌写成诊断服务或疗效承诺。

本轮还查看了同领域的 [OwnChart](https://github.com/nickpdawson/OwnChart) 与 [Strand](https://github.com/potalora/strand)：它们围绕患者自己的资料、来源和时间线表达产品用途。这里只参考命名及定位，没有复用代码或名称。

#### 发现冲突后排除的名字

- AlongNote：此前域名查询通过，但发现日本已有同名项目的[作者原文](https://note.com/keen_fox2416/n/n90d8084468c5)，因此排除。
- 清序：发现近似健康服务名称“清序和”的[商标初审记录](https://tm.aliyun.com/detail/0a35_91792895_44)，因此不放入优先候选。
- CareThread、CareFolio、CareBrief 等常见组合：.com 已有登记，没有列为可直接注册候选。
- 诊迹：本轮发现 [App Store 已有同名病历管理产品](https://apps.apple.com/cn/app/%E8%AF%8A%E8%BF%B9/id6774402123)，用途直接重叠，排除。
- VisitWeave、RecordNook：本轮 .com 注册局查询均返回 HTTP 200，已有登记，排除对应域名方案。

以上排除是减少混淆的初步筛选，不是商标法律结论。

### 备案与小程序准备

- 最终使用腾讯云等境内有资质注册商，按确定后的运营主体办理域名实名。腾讯备案文档要求备案主体与域名实名信息相符，并说明境外注册商域名不能直接备案，需要先转入境内有资质服务商。域名实名完成后还需等待信息同步。[腾讯备案域名要求](https://cloud.tencent.com/document/product/243/18905)
- 域名即使可注册，也不代表网站备案、小程序备案或服务类目已经获准。运营主体尚未确定，本报告不假定个人或公司。
- **国家商标库完整检索、微信后台名称可用性与小程序审核尚未核验。**普通网络搜索没有发现明确同名产品，不能据此保证无商标冲突或名称审核通过。

### 检索限制

命名阶段优先尝试本地 Grok CLI 做 X 与 GitHub 定向调研，但当时的三次尝试均取消，未取得可用原始来源 URL，因此本报告的命名判断来自注册商、官方资料及 GitHub 原始页面。之后的技术选型研究已成功使用 Grok 检索 X，结果与独立读取限制记录在 `domestic-launch.md`；它没有补足本报告尚未完成的商标或微信名称核验。
