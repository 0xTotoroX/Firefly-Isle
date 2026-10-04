/**
 * [INPUT]: 依赖 Deno 标准运行时环境变量与 ./handler.ts 的 createStripeWebhookHandler。
 * [OUTPUT]: 对外提供 stripe-webhook Edge Function HTTP 入口，接收并交由 handler 校验 Stripe 一次性捐赠事件。
 * [POS]: supabase/functions/stripe-webhook 的 Deno 启动壳，把运行时 env 交给可测试 handler。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createStripeWebhookHandler, type RuntimeEnv } from './handler.ts'

type DenoRuntime = {
  env: RuntimeEnv
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const denoRuntime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno

if (!denoRuntime) {
  throw new Error('Deno runtime is required for stripe-webhook.')
}

denoRuntime.serve(createStripeWebhookHandler({ env: denoRuntime.env }))
