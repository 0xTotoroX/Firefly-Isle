/**
 * [INPUT]: 依赖 Deno 标准运行时环境变量与 ./handler.ts 的 createStripeWebhookHandler。
 * [OUTPUT]: 对外提供 stripe-webhook Edge Function HTTP 入口，接收并校验 Stripe 订阅事件。
 * [POS]: supabase/functions/stripe-webhook 的 Deno 启动壳，把运行时 env 交给可测试 handler。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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
