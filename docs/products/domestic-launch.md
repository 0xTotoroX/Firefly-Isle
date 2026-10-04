# 国内 Web 与微信小程序上线选择

核查日期：2026-10-02。下文是选型建议及官方要求，不表示已选定供应商、取得备案或完成上线。名称与域名沿用 `product-naming.md` 的待选状态。

## Web 首发

建议保留现有 React / TypeScript 前端、Supabase 数据模型和函数边界，先完成 Web。现有自托管准备可继续使用，但应把数据中心、外网入口、备份、邮件及模型服务作为一条完整链路验收。

| 选择 | 已核实的能力与成本 | 适用判断 |
| --- | --- | --- |
| Supabase 官方云 | 官方区域有新加坡、东京、首尔，没有中国大陆区域；平台承担较多维护工作 | 适合继续产品验证。国内速度需实际测量，境外存储/处理需单独评估 |
| 腾讯境内 VPS 自托管 | Supabase 完整部署最低 2 核/4GB/40GB，建议 4 核/8GB+/80GB+；更新、监控、备份及恢复由运营者承担 | 与现有迁移准备衔接，但本轮未重新核对 VPS 资源、地区和在线状态 |
| EdgeOne Pages | 提供中国大陆加速，自定义域名需备案 | 国内静态前端优先评估；现有 Cloudflare Functions/KV 不能假定无修改兼容 |
| 境内 VPS 静态托管 | 可以继续部署现有 Vite 的 dist 产物 | 小规模时平台较少，但需维护证书、缓存、发布和回滚 |

依据：[Supabase 区域](https://supabase.com/docs/guides/platform/regions)、[Docker 部署要求](https://supabase.com/docs/guides/self-hosting/docker)、[自托管责任](https://supabase.com/docs/guides/self-hosting)、[EdgeOne 域名](https://edgeone.cloud.tencent.com/pages/document/175191784523485184)、[EdgeOne Functions](https://edgeone.cloud.tencent.com/pages/document/162936866445025280)。

普通 Cloudflare Pages 不能当作国内节点保障。Cloudflare 中国网络是 Enterprise 的额外服务，要求 ICP 与内容审核，官方 FAQ 明确 Pages 不属于直接在中国大陆运行的 Pages 服务。这不意味着所有大陆用户都无法访问当前网站，具体仍需实测。[中国网络接入条件](https://developers.cloudflare.com/china-network/get-started/)、[FAQ](https://developers.cloudflare.com/china-network/faq/)

当前自托管准备经 Cloudflare Tunnel 对外，只搬数据库不能证明国内体验改善。正式选择前，用移动、联通、电信的真实网络测首次访问、认证、病历读写、上传和模型响应；记录时间、地区、成功率和长尾耗时。缺少这样的样本时，不给出虚构的国内性能结论。

## 小程序单独交付

| 路线 | 能复用的部分 | 需要重做的部分 |
| --- | --- | --- |
| Taro + React，优先试做 | TypeScript 类型、校验、领域规则、API 协议及无 DOM 依赖 hooks | 页面、导航、文件、图表、导出、登录；Radix/React Router/html2canvas 不能直接搬入 |
| 微信原生 | 同一后端与协议；少量纯业务函数 | UI 与平台逻辑重写较多，适合少量高频手机流程 |
| uni-app | 后端与领域协议 | 主要使用 Vue 单文件组件，与当前 React UI 复用较少；没有足够收益前不整体换栈 |

参考：[Taro 源码](https://github.com/NervJS/taro)、[React 限制](https://docs.taro.zone/docs/react-overall)、[DOM 差异](https://docs.taro.zone/docs/taro-dom/)、[微信官方示例](https://github.com/wechat-miniprogram/miniprogram-demo)、[TDesign 小程序](https://github.com/Tencent/tdesign-miniprogram)、[uni-app 原理](https://uniapp.dcloud.net.cn/tutorial/index.html)。

Taro 的首轮技术验证应包含长病历、化验图与导出。官方 DOM 文档列出了 `querySelectorAll`、SVG 和尺寸读取的限制，而当前 Web 的 `export-record.ts` 和 `lab-analytics-dashboard.tsx` 使用这些能力；普通表单跑通不足以证明导出可迁移。页内 `createPortal` 受支持，不能泛称 Portal 全部不可用。

小程序首版建议覆盖上传报告、查看病历、随访提醒和复诊摘要。AI 分析与对外分享是否首发需结合类目确认。登录是 `wx.login → 服务端 code2Session → 业务登录态/账号绑定`，不能拿 Web 扫码登录适配器直接替代。[微信登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)

## 主体、类目与备案

微信当前个人主体有“工具—健康管理”，范围描述为身高、体重等健康管理记录；非个人同类包含个人身体管理记录。“医疗服务”里的查报告单、其他医学健康服务等有各自资质条件。官方清单未明确覆盖本项目全部癌症病历、治疗线、AI 分析及分享功能，需要以真实页面向平台确认；不能据此保证个人主体可过审，也不能把注册公司等同于取得医疗资质。[微信服务类目](https://developers.weixin.qq.com/miniprogram/product/material.html)

个人小程序暂不支持 `web-view`，因此个人主体不能按网页套壳计划上线。[web-view 官方说明](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)

| 事项 | 需要准备 | 官方时间口径 |
| --- | --- | --- |
| 网站 ICP | 主体/负责人证件、域名实名、接入资源、服务信息及省份补充材料；域名实名应与主体一致 | 腾讯初审 1–2 个工作日，短信 24 小时内核验，管局不超过 20 个工作日；另留域名实名同步时间 |
| 小程序备案 | 主体证件、主体/小程序负责人证件、现场核验照片、承诺书；适用时前置审批及其他材料 | 微信初审 1–2 个工作日，短信 24 小时内核验，管局 1–20 个工作日 |
| 微信认证与版本审核 | 按确定后的主体、类目、所需平台能力核对认证页面和材料；提交实际功能版本 | 本轮未进入申请后台，费用、材料和审核周期尚未核验，不承诺固定周期 |

依据：[腾讯域名要求](https://cloud.tencent.com/document/product/243/18905)、[网站备案流程](https://cloud.tencent.com/document/product/243/18909)、[微信备案指引](https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html)、[工信部说明](https://www.miit.gov.cn/jgsj/xgj/hlwgl/art/2023/art_564bf0759d7e41d5b4aa8ce4996b9e84.html)。项目排期建议预留 4–6 周及退回修改余量，这不是官方承诺；网站备案不能代替小程序备案。

## 数据和接口边界

医疗健康信息属于敏感个人信息。国内服务器不能自动解决境外 LLM/OCR、错误上报或备份的数据流问题；应逐项核对提供者、处理目的、必要字段、保存时间、用户告知与适用手续。[个人信息保护法](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)

现有授权码分享会包含患者姓名和临床内容，它是可撤销、会到期的授权阅读，不是匿名化。未来 API/PAT 的默认只读、字段白名单、最小范围、hash 保存与撤销要求见 `saas-acceptance.md`。不实现 MCP/CLI，也不把 Supabase 管理 PAT 交给产品用户。

## 待确定的产品输入

1. 运营主体、正式产品名与域名。
2. 首发地区与持续运维预算，决定官方云或境内自托管、前端入口和支付通道。
3. 小程序首版是否包含 AI 分析与对外分享，决定类目咨询和首版验收范围。

已存在的 Stripe 代码目前是一次性打赏基座，不代表商业订阅方案已选定。价格、支付主体与可用通道需要在上述输入确定后验证。

## 研究证据

早先 Grok 请求达到回合上限后取消；2026-10-02 后续使用本地 Grok 1.0.46 完成了一次只读研究，退出 0，实际调用了 `x_keyword_search`、`x_semantic_search` 和 `x_thread_fetch`。其找到的 [跨端复杂度经验](https://x.com/jiahao_jayden/status/1940788211904926171) 与 [React 团队的小程序经验](https://x.com/SkyZhan37176488/status/1945511634883252240) 仅作为社区线索：独立网页读取返回 403，没有将无法独立复核的帖子内容作为技术结论。上面的平台取舍以官方文档和源码为依据。
