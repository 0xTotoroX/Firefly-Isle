/**
 * [INPUT]: 依赖 ./shared 的 startWechatAuthorization 处理 Supabase custom provider 授权请求。
 * [OUTPUT]: 对外提供 onRequestGet，对应 /api/auth/wechat/authorize。
 * [POS]: functions/api/auth/wechat 的授权入口，保存短时 OAuth state 后把用户送往微信扫码登录。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

import { methodNotAllowed, startWechatAuthorization, type WechatOAuthContext } from './shared'

export async function onRequestGet(context: WechatOAuthContext) {
  return startWechatAuthorization(context.request, context.env)
}

export async function onRequestPost() {
  return methodNotAllowed('GET')
}
