/**
 * [INPUT]: 依赖 vitest、./shared 的微信 OAuth2 adapter 纯逻辑与内存 KV。
 * [OUTPUT]: 对外提供 adapter 授权跳转、token 交换、userinfo 与错误路径回归测试。
 * [POS]: functions/api/auth/wechat 的协议测试，确保 Cloudflare Pages Functions 与 Supabase custom provider 的契约稳定。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

import { describe, expect, it, vi } from 'vitest'
import {
  getWechatAdapterUserinfo,
  handleWechatCallback,
  issueWechatAdapterToken,
  startWechatAuthorization,
  type FetchLike,
  type WechatOAuthEnv,
  type WechatOAuthKv,
} from './shared'

class MemoryKv implements WechatOAuthKv {
  values = new Map<string, string>()

  async get(key: string) {
    return this.values.get(key) ?? null
  }

  async put(key: string, value: string) {
    this.values.set(key, value)
  }

  async delete(key: string) {
    this.values.delete(key)
  }
}

function makeEnv(kv = new MemoryKv()): WechatOAuthEnv & { WECHAT_OAUTH_KV: MemoryKv } {
  return {
    SUPABASE_AUTH_CALLBACK_URL: 'https://irkjblpzmclqekxbexll.supabase.co/auth/v1/callback',
    WECHAT_OAUTH_CLIENT_ID: 'firefly-wechat',
    WECHAT_OAUTH_CLIENT_SECRET: 'adapter-secret',
    WECHAT_OAUTH_KV: kv,
    WECHAT_OAUTH_PUBLIC_BASE_URL: 'https://firefly.ghibli1024.com',
    WECHAT_OPEN_APP_ID: 'wx-app-id',
    WECHAT_OPEN_APP_SECRET: 'wx-secret',
  }
}

function basicAuth(clientId = 'firefly-wechat', clientSecret = 'adapter-secret') {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`
}

async function s256(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  let binary = ''
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

describe('WeChat OAuth adapter', () => {
  it('stores Supabase OAuth state and redirects to WeChat QR login', async () => {
    const env = makeEnv()
    const request = new Request(
      'https://firefly.ghibli1024.com/api/auth/wechat/authorize?' +
        new URLSearchParams({
          client_id: 'firefly-wechat',
          code_challenge: 'plain-challenge',
          code_challenge_method: 'plain',
          redirect_uri: 'https://irkjblpzmclqekxbexll.supabase.co/auth/v1/callback',
          response_type: 'code',
          state: 'supabase-state',
        }),
    )

    const response = await startWechatAuthorization(request, env)
    const location = response.headers.get('location') ?? ''

    expect(response.status).toBe(302)
    expect(location).toContain('https://open.weixin.qq.com/connect/qrconnect')
    expect(location).toContain('appid=wx-app-id')
    expect(location).toContain('scope=snsapi_login')
    expect(location).toContain('redirect_uri=https%3A%2F%2Ffirefly.ghibli1024.com%2Fapi%2Fauth%2Fwechat%2Fcallback')

    const savedStateKeys = [...env.WECHAT_OAUTH_KV.values.keys()].filter((key) => key.startsWith('wechat_state:'))
    expect(savedStateKeys).toHaveLength(1)
  })

  it('exchanges WeChat code, consumes adapter code once, and returns userinfo with stable unionid subject', async () => {
    const env = makeEnv()
    const verifier = 'verifier-value'
    const challenge = await s256(verifier)
    const authorizeRequest = new Request(
      'https://firefly.ghibli1024.com/api/auth/wechat/authorize?' +
        new URLSearchParams({
          client_id: 'firefly-wechat',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          redirect_uri: 'https://irkjblpzmclqekxbexll.supabase.co/auth/v1/callback',
          response_type: 'code',
          state: 'supabase-state',
        }),
    )
    const authorizeResponse = await startWechatAuthorization(authorizeRequest, env)
    const wechatRedirect = new URL(authorizeResponse.headers.get('location') ?? '')
    const adapterState = wechatRedirect.searchParams.get('state') ?? ''

    const fetcher = vi.fn<FetchLike>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/sns/oauth2/access_token')) {
        return Response.json({
          access_token: 'wechat-token',
          openid: 'wechat-openid',
          unionid: 'wechat-unionid',
        })
      }

      return Response.json({
        headimgurl: 'https://example.com/avatar.png',
        nickname: '一页萤火',
        openid: 'wechat-openid',
        unionid: 'wechat-unionid',
      })
    })

    const callbackResponse = await handleWechatCallback(
      new Request(`https://firefly.ghibli1024.com/api/auth/wechat/callback?code=wechat-code&state=${adapterState}`),
      env,
      fetcher,
    )
    const supabaseRedirect = new URL(callbackResponse.headers.get('location') ?? '')
    const adapterCode = supabaseRedirect.searchParams.get('code') ?? ''

    expect(callbackResponse.status).toBe(302)
    expect(supabaseRedirect.origin + supabaseRedirect.pathname).toBe(
      'https://irkjblpzmclqekxbexll.supabase.co/auth/v1/callback',
    )
    expect(supabaseRedirect.searchParams.get('state')).toBe('supabase-state')
    expect(adapterCode).not.toBe('')

    const tokenBody = new URLSearchParams({
      code: adapterCode,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: 'https://irkjblpzmclqekxbexll.supabase.co/auth/v1/callback',
    })
    const tokenResponse = await issueWechatAdapterToken(
      new Request('https://firefly.ghibli1024.com/api/auth/wechat/token', {
        body: tokenBody,
        headers: {
          authorization: basicAuth(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      }),
      env,
    )
    const tokenPayload = (await tokenResponse.json()) as { access_token: string; token_type: string }

    expect(tokenResponse.status).toBe(200)
    expect(tokenPayload.token_type).toBe('Bearer')
    expect(tokenPayload.access_token).not.toBe('')

    const replayResponse = await issueWechatAdapterToken(
      new Request('https://firefly.ghibli1024.com/api/auth/wechat/token', {
        body: tokenBody,
        headers: {
          authorization: basicAuth(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      }),
      env,
    )
    expect(replayResponse.status).toBe(400)

    const userinfoResponse = await getWechatAdapterUserinfo(
      new Request('https://firefly.ghibli1024.com/api/auth/wechat/userinfo', {
        headers: { authorization: `Bearer ${tokenPayload.access_token}` },
      }),
      env,
    )
    const userinfo = (await userinfoResponse.json()) as { name: string; sub: string; openid: string }

    expect(userinfoResponse.status).toBe(200)
    expect(userinfo.sub).toBe('wechat-unionid:wechat-unionid')
    expect(userinfo.openid).toBe('wechat-openid')
    expect(userinfo.name).toBe('一页萤火')
  })

  it('rejects token exchange when PKCE verifier does not match', async () => {
    const env = makeEnv()
    await env.WECHAT_OAUTH_KV.put(
      'wechat_code:adapter-code',
      JSON.stringify({
        codeChallenge: 'expected-verifier',
        codeChallengeMethod: 'plain',
        createdAt: Date.now(),
        profile: {
          openid: 'wechat-openid',
          subject: 'wechat-openid:wechat-openid',
        },
        redirectUri: 'https://irkjblpzmclqekxbexll.supabase.co/auth/v1/callback',
      }),
    )

    const response = await issueWechatAdapterToken(
      new Request('https://firefly.ghibli1024.com/api/auth/wechat/token', {
        body: new URLSearchParams({
          code: 'adapter-code',
          code_verifier: 'wrong-verifier',
          grant_type: 'authorization_code',
          redirect_uri: 'https://irkjblpzmclqekxbexll.supabase.co/auth/v1/callback',
        }),
        headers: {
          authorization: basicAuth(),
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'PKCE verification failed.' })
  })

  it('reports missing server-side configuration without exposing secrets', async () => {
    const response = await startWechatAuthorization(
      new Request('https://firefly.ghibli1024.com/api/auth/wechat/authorize'),
      {},
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error:
        'WeChat OAuth adapter is not configured: WECHAT_OAUTH_KV, WECHAT_OPEN_APP_ID, WECHAT_OPEN_APP_SECRET, WECHAT_OAUTH_CLIENT_ID, WECHAT_OAUTH_CLIENT_SECRET.',
    })
  })
})
