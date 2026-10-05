/**
 * [INPUT]: Node临时目录、合成Git/依赖发布物和source-distribution的真实归档装配。
 * [OUTPUT]: 源码版本匹配、隐私排除、归档/通知字节、版本漂移与无Git再构建行为测试。
 * [POS]: config的离线分发回归，不使用实际凭据或患者数据、不执行发布。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { captureProjectSource, collectRuntimeDependencies, isProjectSource, writeSourceDistribution } from './source-distribution'

const roots: string[] = []
async function put(root: string, name: string, text: string) {
  const full = path.join(root, name)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, text)
}
function git(root: string, args: string[]) { return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString() }
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'myoncode-source-test-'))
  roots.push(root)
  await put(root, 'LICENSE', 'Synthetic AGPL fixture text\n')
  await put(root, 'LICENSING.md', 'Project code only; third-party assets retain their own rights.\n')
  await put(root, 'THIRD_PARTY_NOTICES.md', 'Synthetic third-party boundaries\n')
  await put(root, 'LICENSES/history.txt', 'Historical fixture license\n')
  await put(root, '.gitignore', 'node_modules/\ndist/\n.env.local\n')
  await put(root, '.env.local', 'SYNTHETIC SECRET PLACEHOLDER\n')
  await put(root, '.env.local.example', 'PUBLIC_EXAMPLE=placeholder\n')
  await put(root, 'docs/log/private-note.md', 'SYNTHETIC PRIVATE PLACEHOLDER\n')
  await put(root, 'src/main.ts', 'export const revision = 1\n')
  await put(root, 'supabase/functions/example/index.ts', 'export const server = true\n')
  await put(root, 'ops/self-hosted/.env.example', 'PUBLIC_TEMPLATE=placeholder\n')
  await put(root, 'package.json', JSON.stringify({ license: 'AGPL-3.0-only', dependencies: { 'fixture-library': '1.2.3' } }))
  await put(root, 'package-lock.json', JSON.stringify({ packages: { '': { license: 'AGPL-3.0-only' }, 'node_modules/fixture-library': { version: '1.2.3' } } }))
  await put(root, 'node_modules/fixture-library/package.json', JSON.stringify({ name: 'fixture-library', version: '1.2.3', license: 'MIT' }))
  await put(root, 'node_modules/fixture-library/LICENSE', 'Synthetic library notice — unchanged\n')
  await put(root, 'node_modules/fixture-library/index.js', 'export const originalLibrary = true\n')
  git(root, ['init', '-q'])
  git(root, ['add', '.'])
  git(root, ['add', '-f', '.env.local'])
  git(root, ['-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Synthetic', '-c', 'user.email=synthetic@example.invalid', 'commit', '-qm', 'fixture'])
  return root
}
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('source distribution boundaries', () => {
  it('keeps source/build examples while excluding secrets, runtime data, history and traversal', () => {
    for (const name of ['src/main.ts', 'mobile/android/app/src/main/AndroidManifest.xml', 'supabase/config.toml', 'supabase/tests/example.sql', 'supabase/functions/example/index.ts', 'ops/self-hosted/.env.example', '.env.local.example', 'LICENSES/history.txt']) expect(isProjectSource(name)).toBe(true)
    for (const name of ['.env.local', '../src/main.ts', '/src/main.ts', 'src/private/data.json', 'ops/self-hosted/volumes/data.sql', 'ops/self-hosted/volumes/secret.example', 'ops/self-hosted/private/secret.example', 'mobile/android/local.properties', 'mobile/ios/Pods/secret.txt', 'mobile/android/app/build/output.apk', 'mobile/android/signing.keystore', 'docs/log/private-note.md', 'public/data.sqlite']) expect(isProjectSource(name)).toBe(false)
  })

  it('ships the matching code, dependency files and original license bytes in an accessible local bundle', async () => {
    const root = await fixture()
    const snapshot = await captureProjectSource(root)
    const output = path.join(root, 'dist')
    const manifest = await writeSourceDistribution(root, output, snapshot)
    expect(manifest.dirtySnapshot).toBe(false)
    expect(manifest.revision).toBe(git(root, ['rev-parse', 'HEAD']).trim())
    expect(manifest.projectFiles.some((file) => file.path === '.env.local')).toBe(false)
    expect(manifest.projectFiles.some((file) => file.path === 'docs/log/private-note.md')).toBe(false)
    expect(await readFile(path.join(output, 'licenses/npm/node_modules/fixture-library/LICENSE'), 'utf8')).toBe('Synthetic library notice — unchanged\n')
    const archive = path.join(output, 'source', manifest.archive)
    expect(createHash('sha256').update(await readFile(archive)).digest('hex')).toBe(manifest.archiveSha256)
    const listing = execFileSync('tar', ['-tzf', archive]).toString()
    expect(listing).toContain('./src/main.ts')
    expect(listing).toContain('./supabase/functions/example/index.ts')
    expect(listing).toContain('./vendor/npm/node_modules/fixture-library/index.js')
    expect(listing).not.toContain('./.git/')
    expect(listing).not.toContain('./.env.local\n')
    expect(listing).not.toContain('private-note')
    expect(execFileSync('tar', ['-xOzf', archive, './LICENSE']).toString()).toBe('Synthetic AGPL fixture text\n')
    const html = await readFile(path.join(output, 'source/index.html'), 'utf8')
    expect(html).toContain(manifest.archive)
    expect(html).toContain(snapshot.digest)
    expect(html).toContain('不代表已经发布或部署')
    expect(html).not.toContain('github.com')
  })

  it('rejects code changed after the build snapshot', async () => {
    const root = await fixture()
    const snapshot = await captureProjectSource(root)
    await put(root, 'src/main.ts', 'export const revision = 2\n')
    await expect(writeSourceDistribution(root, path.join(root, 'dist'), snapshot)).rejects.toThrow('Source changed during build')
  })

  it('labels uncommitted snapshots and rejects source symlinks', async () => {
    const root = await fixture()
    await put(root, 'src/new-file.ts', 'export const added = true\n')
    expect((await captureProjectSource(root)).dirty).toBe(true)
    await symlink('../LICENSE', path.join(root, 'src/license-link.ts'))
    await expect(captureProjectSource(root)).rejects.toThrow('Unsupported source file')
  })

  it('rejects a missing required runtime package or mismatched installed version', async () => {
    const root = await fixture()
    await put(root, 'node_modules/fixture-library/package.json', JSON.stringify({ name: 'fixture-library', version: '2.0.0' }))
    await expect(collectRuntimeDependencies(root)).rejects.toThrow('differs from lock')
    await rm(path.join(root, 'node_modules/fixture-library'), { recursive: true })
    await expect(collectRuntimeDependencies(root)).rejects.toThrow()
  })

  it('can capture an extracted archive and detects newly added source files without Git', async () => {
    const root = await fixture()
    const snapshot = await captureProjectSource(root)
    const manifest = await writeSourceDistribution(root, path.join(root, 'dist'), snapshot)
    const extracted = await mkdtemp(path.join(os.tmpdir(), 'myoncode-extracted-test-'))
    roots.push(extracted)
    execFileSync('tar', ['-xzf', path.join(root, 'dist/source', manifest.archive), '-C', extracted])
    const copied = await captureProjectSource(extracted)
    expect(copied.digest).toBe(snapshot.digest)
    expect(copied.revision).toBe(snapshot.revision)
    await put(extracted, 'src/addition.ts', 'export const changed = true\n')
    const modified = await captureProjectSource(extracted)
    expect(modified.digest).not.toBe(snapshot.digest)
    expect(modified.dirty).toBe(true)
    expect(modified.files.some((file) => file.name === 'src/addition.ts')).toBe(true)
  })
})
