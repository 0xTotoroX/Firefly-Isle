/**
 * [INPUT]: 依赖 Deno 环境变量与 ./handler 的可测试核心。
 * [OUTPUT]: 对外提供 billing-checkout Edge Function 的 Deno serve 入口。
 * [POS]: supabase/functions/billing-checkout 的部署外壳，只做 env 装配，不承载业务逻辑。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
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
