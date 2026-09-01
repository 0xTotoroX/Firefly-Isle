/**
 * [INPUT]: 依赖 Deno 环境变量与 ./handler 的可测试核心。
 * [OUTPUT]: 对外提供 billing-checkout Edge Function 的 Deno serve 入口。
 * [POS]: supabase/functions/billing-checkout 的部署外壳，只做 env 装配，不承载业务逻辑。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createBillingCheckoutHandler, type RuntimeEnv } from './handler.ts'

type DenoRuntime = {
  env: RuntimeEnv
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const denoRuntime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno

if (!denoRuntime) {
  throw new Error('Deno runtime is required for billing-checkout.')
}

denoRuntime.serve(createBillingCheckoutHandler({ env: denoRuntime.env }))
