# 微信登录接入准备

2026-10-06：网页已接上海原版自托管 Supabase。当前未收到小程序 AppID/AppSecret，也未完成新域名备案；本文件记录可执行接入范围与材料，不代表微信登录已实现或已上线。小程序本轮先准备登录与同一账号下的病历读取，不展开全部 Web 页面。

## 小程序登录合同

`wx.login` 获取一次性 code，由上海登录函数使用固定服务端 AppID 调用微信 code2Session。openid 仅作微信外部标识；用非 Data API 暴露的私有表保存 `(appid, openid) → auth.users.id`，业务表仍使用 UUID 和现有 RLS/RPC。

服务端通过 Supabase Admin `generateLink` 和 `verifyOtp` 签发正式、可刷新会话，小程序用 SDK `auth.setSession` 恢复。登录函数不自行签 JWT，不信任客户端提交的 openid/UUID，不根据 user_metadata、昵称或相似邮箱绑定账号。session_key、AppSecret、service-role key 不下发客户端；返回会话的响应不缓存。首次登录并发必须保持唯一映射，清理本次创建但未绑定的候选用户；账号删除同时清理私有映射。Web 与小程序自动账号合并另行验收。

可参考 MIT 的 [supabase-mp-js](https://github.com/vibeunion/supabase-mp-js) 的 wx.request/storage 与 setSession 适配；只参考其使用 generateLink/verifyOtp 的示例，不采用旧示例的手签 JWT 或可由用户修改的身份映射。

## 配置和本人操作

| 项目 | 填写/操作位置 | 当前状态 |
| --- | --- | --- |
| 小程序 AppID（公开编号） | 微信公众平台与开发者工具项目配置 | 待本人注册账号或提供已有 AppID |
| 小程序 AppSecret | 服务器 `/opt/firefly-supabase/functions.env` 的 `WECHAT_MINIPROGRAM_APP_SECRET` | 仅私有配置，不发聊天、不放 VITE_ 或 Git |
| 服务端固定 AppID | 同一私有配置的 `WECHAT_MINIPROGRAM_APP_ID` | 不由客户端选择 |
| 请求域名 | 微信公众平台开发设置的 request 合法域名 | 新 API 域名实名、ICP备案、HTTPS 完成后配置；当前预研 Tunnel 入口不能视为已具备微信上线条件 |
| 主体、管理员和体验成员 | 本人微信公众平台账号 | 实名、人脸/扫码及验证码由本人办理 |
| 小程序备案/类目/隐私指引 | 平台申请 | 以登录后病历/OCR真实范围填写；不得填成诊疗、公开 AI 解读或收费会员 |

明天购买域名后仍须实名与备案；购买成功不等于马上可以发布小程序。个人小程序不能用 web-view 包装现有网站。无需另加客服预核流程。

## 网页扫码登录另行申请

网页微信扫码需要已审核的网站应用、独立 AppID/AppSecret 与 snsapi_login 权限，不能使用小程序凭据代替。当前网页入口保持关闭，Cloudflare 协议适配只是预研。迁入腾讯云时，微信授权码应使用数据库事务原子消费，不能把 KV 的读后删除当成一次性凭据的并发保护。

官方网页应用审核资料已出现个人开发者条款，不能把个人主体绝对无法申请写成已确认事实；以实际网站应用审核为准。

## 验收顺序

1. 实现私有映射、受限服务端 RPC、登录函数与小程序客户端，先用合成响应检查缺配置、微信失败、code 重放、并发首登、UID 不一致、刷新/注销与错误脱敏。
2. 使用本人小程序开发/体验环境验证真正的 wx.login、code2Session、Supabase Session 和跨账号隔离；不使用真实病历。
3. 实名/备案域名配置后，在真机验证 HTTPS、合法域名、隐私授权、登录与资料读取，保存平台审核和运行证据。

参考：[微信登录流程](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)、[网络配置](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)、[个人 web-view 限制](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)、[网页微信登录](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)、[网站应用审核规范](https://developers.weixin.qq.com/doc/oplatform/Website_App/operation.html)、[Supabase generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)、[verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)（查询日期 2026-10-06）。
