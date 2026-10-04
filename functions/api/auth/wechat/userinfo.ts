/**
 * [INPUT]: 依赖 ./shared 的 getWechatAdapterUserinfo 读取 adapter access token 对应的微信身份资料。
 * [OUTPUT]: 对外提供 onRequestGet，对应 /api/auth/wechat/userinfo。
 * [POS]: functions/api/auth/wechat 的 userinfo endpoint，给 Supabase custom OAuth2 provider 返回稳定 subject。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

import { getWechatAdapterUserinfo, methodNotAllowed, type WechatOAuthContext } from './shared'

export async function onRequestGet(context: WechatOAuthContext) {
  return getWechatAdapterUserinfo(context.request, context.env)
}

export async function onRequestPost() {
  return methodNotAllowed('GET')
}
