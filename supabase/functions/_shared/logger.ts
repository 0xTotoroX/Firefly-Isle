/**
 * [INPUT]: 依赖 Deno console。
 * [OUTPUT]: 对外提供 createFunctionLogger 与 FunctionLogger / LogLevel 类型。
 * [POS]: supabase/functions 的共享可观测性边界，把静默失败路径变成单行结构化 JSON 日志；调用方 SHALL NOT 把密钥或敏感负载放进 meta。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type LogLevel = 'error' | 'info' | 'warn'

export type FunctionLogger = {
  error: (event: string, meta?: Record<string, unknown>) => void
  info: (event: string, meta?: Record<string, unknown>) => void
  warn: (event: string, meta?: Record<string, unknown>) => void
}

export function createFunctionLogger(scope: string): FunctionLogger {
  const write = (level: LogLevel, event: string, meta?: Record<string, unknown>) => {
    const line = JSON.stringify({ event, level, scope, timestamp: new Date().toISOString(), ...meta })

    if (level === 'error') {
      console.error(line)
    } else if (level === 'warn') {
      console.warn(line)
    } else {
      console.log(line)
    }
  }

  return {
    error: (event, meta) => write('error', event, meta),
    info: (event, meta) => write('info', event, meta),
    warn: (event, meta) => write('warn', event, meta),
  }
}
