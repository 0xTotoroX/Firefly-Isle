/**
 * [INPUT]: 依赖 node:fs 与 node:path 遍历 src/functions/supabase 源码树，依赖 vitest 执行结构合同。
 * [OUTPUT]: 对外提供每个 .ts/.tsx/.sql 文件不超过 800 行的结构债回归测试。
 * [POS]: lib 的架构卫生测试，防止登录页、病历页或边缘函数再次退化为超大文件。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const LINE_LIMIT = 800
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.sql'])
const SOURCE_ROOTS = ['src', 'functions', 'supabase'] as const

type FileLineCount = {
  lineCount: number
  path: string
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      return listSourceFiles(entryPath)
    }

    if (stat.isFile() && SOURCE_EXTENSIONS.has(extname(entryPath))) {
      return [entryPath]
    }

    return []
  })
}

function countLines(filePath: string): number {
  const content = readFileSync(filePath, 'utf8').replace(/\r?\n$/, '')

  return content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length
}

function findOversizedSourceFiles(): FileLineCount[] {
  return SOURCE_ROOTS.flatMap((root) => listSourceFiles(join(process.cwd(), root)))
    .map((filePath) => ({
      lineCount: countLines(filePath),
      path: relative(process.cwd(), filePath),
    }))
    .filter((file) => file.lineCount > LINE_LIMIT)
}

describe('source file size contract', () => {
  it('keeps source files at or below 800 lines', () => {
    expect(findOversizedSourceFiles()).toEqual([])
  })
})
