/**
 * [INPUT]: 依赖 Deno 标准运行时环境变量与 ./handler.ts 的 createLlmProxyHandler。
 * [OUTPUT]: 对外提供 llm-proxy Edge Function HTTP 入口，启动统一 LLM provider 代理。
 * [POS]: supabase/functions/llm-proxy 的 Deno 启动壳，把运行时 env 交给可测试 handler。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { createLlmProxyHandler, type RuntimeEnv } from './handler.ts'

type DenoRuntime = {
  env: RuntimeEnv
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const denoRuntime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno

if (!denoRuntime) {
  throw new Error('Deno runtime is required for llm-proxy.')
}

denoRuntime.serve(createLlmProxyHandler({ env: denoRuntime.env }))
