/**
 * [INPUT]: 依赖 ./shared 的 issueWechatAdapterToken 消费一次性 adapter code。
 * [OUTPUT]: 对外提供 onRequestPost，对应 /api/auth/wechat/token。
 * [POS]: functions/api/auth/wechat 的 token endpoint，被 Supabase Auth 服务端调用以换取短时 adapter access token。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

import { issueWechatAdapterToken, methodNotAllowed, type WechatOAuthContext } from './shared'

export async function onRequestPost(context: WechatOAuthContext) {
  return issueWechatAdapterToken(context.request, context.env)
}

export async function onRequestGet() {
  return methodNotAllowed('POST')
}
