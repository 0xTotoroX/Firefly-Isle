# functions/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
api/auth/wechat/: Cloudflare Pages Functions 微信 OAuth2 适配层，把 Supabase custom provider 请求翻译到微信开放平台扫码登录，并由 tsconfig.cloudflare-functions.json 独立 type-check

法则: 边缘函数只承载服务器侧密钥与协议适配；不得创建第二套登录态，不得替代 Supabase Auth。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
