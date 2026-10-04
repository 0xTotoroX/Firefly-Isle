# functions/api/auth/wechat/
> L2 | 父级: [AGENTS.md](../../../AGENTS.md)

成员清单
authorize.ts: OAuth2 authorization endpoint，校验 Supabase client 与 PKCE 参数，保存短时 state 后跳转微信扫码登录
callback.ts: 微信回调 endpoint，交换微信 code，读取微信 userinfo，并生成短时 adapter authorization code 返回 Supabase callback
token.ts: OAuth2 token endpoint，校验 client secret、redirect_uri 与 PKCE，消费一次性 code 并签发短时 adapter access token
userinfo.ts: OAuth2 userinfo endpoint，按 adapter access token 返回 Supabase 可识别的 `sub`/`id` 与微信公开资料
shared.ts: 微信 OAuth2 adapter 的纯逻辑、KV 存取、PKCE 校验、微信 API 交换与错误响应兜底工具
shared.test.ts: 微信 OAuth2 adapter 回归测试，覆盖授权跳转、PKCE token 交换、userinfo 与错误清洗

法则: Supabase 是最终认证真相源；adapter 只做协议翻译和短时令牌桥接。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
