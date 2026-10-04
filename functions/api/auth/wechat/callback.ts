/**
 * [INPUT]: 依赖 ./shared 的 handleWechatCallback 处理微信授权回调与用户资料交换。
 * [OUTPUT]: 对外提供 onRequestGet，对应 /api/auth/wechat/callback。
 * [POS]: functions/api/auth/wechat 的微信回调入口，把微信 code 转成 Supabase 可消费的一次性 adapter code。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

import { handleWechatCallback, methodNotAllowed, type WechatOAuthContext } from './shared'

export async function onRequestGet(context: WechatOAuthContext) {
  return handleWechatCallback(context.request, context.env)
}

export async function onRequestPost() {
  return methodNotAllowed('GET')
}
