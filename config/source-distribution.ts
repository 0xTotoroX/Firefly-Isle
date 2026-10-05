/**
 * [INPUT]: Git公开源码清单、项目许可/锁文件、已安装运行依赖、Node文件/摘要API及系统tar。
 * [OUTPUT]: 构建时生成精确源码快照、运行依赖源文件/通知、版本清单、托管限额内的源码分卷及无需登录的源码许可页。
 * [POS]: config的本地分发装配，不读取.env、凭据、运行数据或历史私密资料，不发布文件。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Plugin } from 'vite'

type SourceFile = { name: string; bytes: Buffer; mode: number }
type Dependency = { name: string; version: string; license: unknown; files: SourceFile[]; notices: string[] }
type LockPackage = { version?: string; dev?: boolean; link?: boolean; optional?: boolean }
type Snapshot = { revision: string | null; dirty: boolean; files: SourceFile[]; digest: string }
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

const rootFiles = new Set([
  'AGENTS.md', 'LICENSE', 'LICENSING.md', 'THIRD_PARTY_NOTICES.md', 'README.md', 'README.en.md',
  'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'package.json', 'package-lock.json',
  'index.html', 'tsconfig.json', 'eslint.config.js', 'components.json', 'capacitor.config.ts',
  'wrangler.jsonc', '.gitignore', '.env.local.example', '.dev.vars.example', 'supabase/config.toml',
  'ops/self-hosted/.env.example',
])
const sourceRoots = ['src/', 'config/', 'scripts/', 'public/', 'LICENSES/', 'mobile/', 'supabase/functions/', 'supabase/migrations/', 'supabase/tests/', 'functions/']
const buildDocs = new Set(['docs/architecture/data-model.md', 'docs/architecture/repository-context.md', 'docs/operations/supabase-self-hosted.md', 'docs/operations/capacitor-mobile-shell.md'])

export function isProjectSource(name: string) {
  if (name.includes('\\') || path.isAbsolute(name) || name.split('/').includes('..')) return false
  if (rootFiles.has(name)) return true
  if (name.split('/').some((part) => /^(?:\.env(?:\..*)?|\.dev\.vars|node_modules|dist|coverage|\.git|private|backups|volumes|\.temp|\.gradle|build|Pods|DerivedData|xcuserdata)$/i.test(part))) return false
  if (path.basename(name) === 'local.properties') return false
  if (/\.(?:dump|sqlite3?|db|pem|key|p12|pfx|jks|keystore|mobileprovision)$/i.test(name)) return false
  return sourceRoots.some((prefix) => name.startsWith(prefix)) || buildDocs.has(name)
    || (name.startsWith('ops/self-hosted/') && /(?:\.example|\.md|\.sh|\.ya?ml|\.toml|\.json|\.sql|\.service|\.timer)$/.test(name))
}

async function walk(directory: string, relative = ''): Promise<SourceFile[]> {
  const files: SourceFile[] = []
  for (const entry of (await readdir(path.join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (['node_modules', '.git', '.cache', '.npmrc'].includes(entry.name) || /^\.env(?:\.|$)/.test(entry.name)) continue
    const name = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) throw new Error(`Source symlink must be reviewed: ${name}`)
    if (entry.isDirectory()) files.push(...await walk(directory, name))
    else if (entry.isFile()) {
      const full = path.join(directory, name)
      files.push({ name, bytes: await readFile(full), mode: (await lstat(full)).mode & 0o777 })
    }
  }
  return files
}

async function sourceNames(root: string, relative = ''): Promise<string[]> {
  const names: string[] = []
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name
    if (name.split('/').some((part) => ['private', 'volumes', 'backups', '.git', 'node_modules', 'dist'].includes(part))) continue
    if (entry.isDirectory()) {
      if (sourceRoots.some((prefix) => prefix.startsWith(`${name}/`) || name.startsWith(prefix))
        || [...buildDocs].some((file) => file.startsWith(`${name}/`)) || name === 'ops' || name.startsWith('ops/self-hosted')) names.push(...await sourceNames(root, name))
    } else if (isProjectSource(name)) names.push(name)
  }
  return names
}

function git(root: string, args: string[]) {
  return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
}

export async function captureProjectSource(root: string): Promise<Snapshot> {
  let names: string[]
  let revision: string | null
  let dirty = true
  try {
    // Ensure an extracted source directory is not mistaken for its enclosing repository.
    if (await realpath(git(root, ['rev-parse', '--show-toplevel']).trim()) !== await realpath(root)) throw new Error('Not this checkout')
    revision = git(root, ['rev-parse', 'HEAD']).trim()
    dirty = git(root, ['status', '--porcelain=v1', '--untracked-files=normal']).trim().length > 0
    names = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)
  } catch {
    // Archives carry a manifest, but never a .git directory or credentials.
    const previous = JSON.parse(await readFile(path.join(root, 'SOURCE_MANIFEST.json'), 'utf8')) as { revision: string | null }
    revision = previous.revision
    names = await sourceNames(root)
  }
  const files: SourceFile[] = []
  for (const name of [...new Set(names)].filter(isProjectSource).sort()) {
    const full = path.join(root, name)
    const stat = await lstat(full)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsupported source file: ${name}`)
    files.push({ name, bytes: await readFile(full), mode: stat.mode & 0o777 })
  }
  if (!files.some((file) => file.name === 'LICENSE') || !files.some((file) => file.name === 'package-lock.json')) throw new Error('Missing source license or lock')
  const hash = createHash('sha256')
  files.forEach((file) => hash.update(file.name).update('\0').update(String(file.mode)).update('\0').update(file.bytes).update('\0'))
  return { revision, dirty, files, digest: hash.digest('hex') }
}

export async function collectRuntimeDependencies(root: string): Promise<Dependency[]> {
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8')) as { packages: Record<string, LockPackage> }
  const dependencies: Dependency[] = []
  for (const [name, locked] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
    if (!name || locked.dev || locked.link) continue
    if (!name.startsWith('node_modules/') || name.includes('..')) throw new Error('Unexpected runtime dependency path')
    let files: SourceFile[]
    try { files = await walk(path.join(root, name)) } catch (error) {
      // Optional, platform-specific packages may legitimately be absent.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && locked.optional) continue
      throw error
    }
    const metadataFile = files.find((file) => file.name === 'package.json')
    if (!metadataFile) throw new Error(`Missing installed metadata: ${name}`)
    const metadata = JSON.parse(metadataFile.bytes.toString()) as { name: string; version: string; license?: unknown }
    if (metadata.version !== locked.version) throw new Error(`Installed version differs from lock: ${name}`)
    const notices = files.filter((file) => /^(?:licenses?|licences?|copying|notices?|third[_-]?party|ofl|copyright|authors)(?:[._ -]|$)/i.test(path.basename(file.name))
      || file.name.split('/').some((part) => /^(?:licenses?|licences?|notices?)$/i.test(part))).map((file) => file.name)
    // README can contain upstream licensing when the published package has no separate notice.
    if (!notices.length) notices.push(...files.filter((file) => /^readme(?:[._ -]|$)/i.test(path.basename(file.name))).map((file) => file.name))
    dependencies.push({ name, version: metadata.version, license: metadata.license ?? null, files, notices })
  }
  return dependencies
}

async function put(directory: string, name: string, bytes: Buffer | string, mode?: number) {
  const full = path.join(directory, name)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, bytes, mode === undefined ? {} : { mode })
}

type ArchivePart = { name: string; bytes: number; sha256: string }

function sourceDownload(archive: string, archiveHash: string, parts: ArchivePart[]) {
  const download = parts.length
    ? `<p>源码包已分卷。下载全部分卷到同一目录，再按顺序拼接：</p><ol>${parts.map((part) => `<li><a href="${escapeHtml(part.name)}" download referrerpolicy="no-referrer">${escapeHtml(part.name)}</a>（${part.bytes} 字节）</li>`).join('')}</ol><pre><code>cat ${escapeHtml(archive)}.part-* &gt; ${escapeHtml(archive)}</code></pre><p>拼接后按下面的整体 SHA-256 校验，再解压。每卷的校验值也在源码清单中。</p>`
    : `<p><a href="${escapeHtml(archive)}" download referrerpolicy="no-referrer">免费下载此构建对应源码 / Download this build's source</a></p>`
  return `${download}<p>归档 SHA-256：<code>${escapeHtml(archiveHash)}</code></p>`
}

function sourcePage({ revision, digest, archive, archiveHash, parts = [], dirty }: { revision: string | null; digest: string; archive?: string; archiveHash?: string; parts?: ArchivePart[]; dirty: boolean }) {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知见 / MyOncode — 源码与许可</title><link rel="stylesheet" href="/source/source.css"></head><body><main><h1>源码与许可 / Source and license</h1><p>知见 / MyOncode 自有代码：<strong>AGPL-3.0-only</strong>。第三方代码和素材保留各自许可；历史 MIT 授予继续有效。</p><p>这是本地构建材料；生成这些文件不代表已经发布或部署。${dirty ? '此构建包含未提交快照，以内容摘要识别。' : ''}</p><dl><dt>修订 / Revision</dt><dd>${escapeHtml(revision ?? '源归档快照')}</dd><dt>源码摘要 / Source SHA-256</dt><dd>${escapeHtml(digest)}</dd></dl>${archive ? sourceDownload(archive, archiveHash!, parts) : '<p>开发服务器尚未生成源码包。生产构建会随附对应源码；此页面不声称远端已有当前源码。</p>'}<p>源码包收录项目的前后端、构建材料及已安装运行依赖发布物中的源文件与通知；必要配置使用示例，不包含账户、病历、凭据或私人运行资料。音乐、字体和图像不改授 AGPL。</p><ul><li><a href="/licenses/LICENSE">AGPL 第三版全文</a></li><li><a href="/licenses/LICENSING.md">许可与源码说明</a></li><li><a href="/licenses/THIRD_PARTY_NOTICES.md">第三方与素材边界</a></li><li><a href="source-manifest.json">此构建源码清单</a></li></ul><p>若运行独立后端，部署者还须确保所提供源码与实际后端版本一致。本页面不证明全部第三方权属或上线审查已经完成。</p></main></body></html>`
}

const sourceCss = 'body{margin:0;background:#fafafa;color:#202020;font:16px/1.7 system-ui,sans-serif}main{max-width:52rem;margin:auto;padding:2rem 1.25rem}h1{font-size:1.8rem}a{color:#72512d;text-underline-offset:3px}dd,code{overflow-wrap:anywhere}dd{margin:0 0 1rem}dt{font-weight:600}'

export async function writeSourceDistribution(root: string, outDir: string, snapshot: Snapshot, maxArchivePartBytes = 20 * 1024 * 1024) {
  if (!Number.isSafeInteger(maxArchivePartBytes) || maxArchivePartBytes <= 0) throw new Error('Invalid archive part size')
  const current = await captureProjectSource(root)
  if (current.digest !== snapshot.digest || current.revision !== snapshot.revision) throw new Error('Source changed during build; rebuild instead of publishing a mismatched archive')
  const dependencies = await collectRuntimeDependencies(root)
  const packageMetadata = JSON.parse(snapshot.files.find((file) => file.name === 'package.json')!.bytes.toString()) as { license?: string }
  if (packageMetadata.license !== 'AGPL-3.0-only') throw new Error('Expected fixed AGPL-3.0-only project grant')
  const sourceDir = path.join(outDir, 'source')
  const licenseDir = path.join(outDir, 'licenses')
  await mkdir(sourceDir, { recursive: true })
  const stage = await mkdtemp(path.join(os.tmpdir(), 'myoncode-source-'))
  const archiveName = `myoncode-source-${snapshot.digest.slice(0, 16)}.tar.gz`
  const manifest = {
    license: 'AGPL-3.0-only', publication: 'not published or deployed by this build', revision: snapshot.revision,
    dirtySnapshot: snapshot.dirty, projectSha256: snapshot.digest,
    projectFiles: snapshot.files.map((file) => ({ path: file.name, sha256: sha256(file.bytes) })),
    runtimePackages: dependencies.map((dependency) => ({ path: dependency.name, version: dependency.version, licenseMetadata: dependency.license, noticeFiles: dependency.notices })),
    boundary: 'Third-party code and assets retain their original grants. Private runtime patient data, credentials, private configuration and historical private documents are outside the source allowlist. Runtime package source means files in the exact installed npm release; this is not a complete upstream rights or preferred-source certification.',
  }
  try {
    for (const file of snapshot.files) await put(stage, file.name, file.bytes, file.mode)
    await put(stage, 'SOURCE_MANIFEST.json', JSON.stringify(manifest, null, 2) + '\n')
    for (const dependency of dependencies) {
      for (const file of dependency.files) await put(stage, `vendor/npm/${dependency.name}/${file.name}`, file.bytes, file.mode)
      for (const name of dependency.notices) {
        const notice = dependency.files.find((file) => file.name === name)!
        await put(licenseDir, `npm/${dependency.name}/${name}`, notice.bytes)
      }
      const metadata = dependency.files.find((file) => file.name === 'package.json')!
      await put(licenseDir, `npm/${dependency.name}/package.json`, metadata.bytes)
    }
    for (const file of snapshot.files.filter((file) => ['LICENSE', 'LICENSING.md', 'THIRD_PARTY_NOTICES.md'].includes(file.name) || file.name.startsWith('LICENSES/'))) await put(licenseDir, file.name, file.bytes)
    await put(licenseDir, 'runtime-packages.json', JSON.stringify(manifest.runtimePackages, null, 2) + '\n')
    execFileSync('tar', ['-czf', path.join(sourceDir, archiveName), '-C', stage, '.'], { env: { ...process.env, COPYFILE_DISABLE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
    const archiveBytes = await readFile(path.join(sourceDir, archiveName))
    const archiveHash = sha256(archiveBytes)
    const archiveParts: ArchivePart[] = []
    if (archiveBytes.length > maxArchivePartBytes) {
      for (let offset = 0; offset < archiveBytes.length; offset += maxArchivePartBytes) {
        const bytes = archiveBytes.subarray(offset, offset + maxArchivePartBytes)
        const name = `${archiveName}.part-${String(archiveParts.length + 1).padStart(6, '0')}`
        await put(sourceDir, name, bytes)
        archiveParts.push({ name, bytes: bytes.length, sha256: sha256(bytes) })
      }
      await rm(path.join(sourceDir, archiveName))
    }
    const result = { ...manifest, archive: archiveName, archiveSha256: archiveHash, archiveParts }
    await put(sourceDir, 'source-manifest.json', JSON.stringify(result, null, 2) + '\n')
    await put(sourceDir, 'index.html', sourcePage({ revision: snapshot.revision, digest: snapshot.digest, archive: archiveName, archiveHash, parts: archiveParts, dirty: snapshot.dirty }))
    await put(sourceDir, 'source.css', sourceCss)
    return result
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

export function sourceDistribution(root: string): Plugin[] {
  let outDir = path.join(root, 'dist')
  let snapshot: Snapshot | null = null
  return [{
    name: 'myoncode-source-distribution',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(root, config.build.outDir) },
    async buildStart() { snapshot = await captureProjectSource(root) },
    async closeBundle() { if (snapshot) await writeSourceDistribution(root, outDir, snapshot) },
  }, {
    name: 'myoncode-development-source-page',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url?.split('?')[0]
        if (pathname === '/source/source.css') { response.setHeader('Content-Type', 'text/css'); response.end(sourceCss); return }
        if (pathname === '/source/index.html' || pathname === '/source/') {
          const current = await captureProjectSource(root)
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.end(sourcePage({ revision: current.revision, digest: current.digest, dirty: true }))
          return
        }
        if (pathname === '/source/source-manifest.json') {
          const current = await captureProjectSource(root)
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ revision: current.revision, projectSha256: current.digest, dirtySnapshot: true, publication: 'development only; source archive not generated' }))
          return
        }
        if (pathname?.startsWith('/licenses/')) {
          const name = pathname.slice('/licenses/'.length)
          if (['LICENSE', 'LICENSING.md', 'THIRD_PARTY_NOTICES.md'].includes(name)) {
            response.setHeader('Content-Type', 'text/plain; charset=utf-8')
            response.end(await readFile(path.join(root, name)))
            return
          }
        }
        next()
      })
    },
  }]
}
