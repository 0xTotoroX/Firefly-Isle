import { describe, expect, it } from 'vitest'
import { completeLegacySupabaseSessionMigration, copyLegacySupabaseSession, isLegacySupabaseSession } from './supabase-session-migration'

const oldKey = 'sb-irkjblpzmclqekxbexll-auth-token'
const newKey = 'sb-supabase-auth-token'
function storage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial))
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
function token(iss: string) { return `header.${btoa(JSON.stringify({ iss }))}.signature` }

describe('Supabase endpoint migration', () => {
  it('retains the only anonymous credential while copying it to the destination', () => {
    const saved = '{"refresh_token":"opaque-old-token"}'
    const s = storage({ [oldKey]: saved })
    copyLegacySupabaseSession('https://supabase.ghibli1024.com', s)
    expect(s.getItem(newKey)).toBe(saved)
    expect(s.getItem(oldKey)).toBe(saved)
  })
  it('does not overwrite a newer destination session or migrate another project', () => {
    const s = storage({ [oldKey]: 'old', [newKey]: 'new' })
    copyLegacySupabaseSession('https://supabase.ghibli1024.com', s)
    expect(s.getItem(newKey)).toBe('new')
    const other = storage({ [oldKey]: 'old' })
    copyLegacySupabaseSession('https://different.supabase.co', other)
    expect(other.getItem(newKey)).toBeNull()
  })
  it('refreshes only cloud-issued tokens', () => {
    expect(isLegacySupabaseSession(token('https://irkjblpzmclqekxbexll.supabase.co/auth/v1'))).toBe(true)
    expect(isLegacySupabaseSession(token('https://supabase.ghibli1024.com/auth/v1'))).toBe(false)
    expect(isLegacySupabaseSession('invalid')).toBe(false)
  })

  it('does not restore the old account after a completed migration and sign-out', () => {
    const s = storage({ [oldKey]: 'original-credential' })
    expect(copyLegacySupabaseSession('https://supabase.ghibli1024.com', s)).toBe(true)
    completeLegacySupabaseSessionMigration(s)
    s.removeItem(newKey)
    expect(copyLegacySupabaseSession('https://supabase.ghibli1024.com', s)).toBe(false)
    expect(s.getItem(newKey)).toBeNull()
    expect(s.getItem(oldKey)).toBe('original-credential')
  })

  it('can retry after the SDK removes a rejected imported session', () => {
    const s = storage({ [oldKey]: 'original-credential' })
    copyLegacySupabaseSession('https://supabase.ghibli1024.com', s)
    s.removeItem(newKey)
    expect(copyLegacySupabaseSession('https://supabase.ghibli1024.com', s)).toBe(true)
    expect(s.getItem(oldKey)).toBe('original-credential')
  })

  it('recognizes a previously copied cloud session without replacing it', () => {
    const saved = JSON.stringify({ access_token: token('https://irkjblpzmclqekxbexll.supabase.co/auth/v1') })
    const s = storage({ [oldKey]: 'older', [newKey]: saved })
    expect(copyLegacySupabaseSession('https://supabase.ghibli1024.com', s)).toBe(true)
    expect(s.getItem(newKey)).toBe(saved)
  })
})
