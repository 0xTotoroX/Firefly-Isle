/**
 * [INPUT]: 依赖 Web Crypto、Fetch API 与 Cloudflare KV 兼容接口完成微信 OAuth2 协议桥接。
 * [OUTPUT]: 对外提供 Wechat OAuth adapter 的授权、回调、token、userinfo 处理函数与测试辅助类型。
 * [POS]: functions/api/auth/wechat 的核心协议层，被四个 Pages Function endpoint 共享。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

type KvPutOptions = {
  expirationTtl?: number
}

export type WechatOAuthKv = {
  get: (key: string) => Promise<string | null>
  put: (key: string, value: string, options?: KvPutOptions) => Promise<void>
  delete: (key: string) => Promise<void>
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type WechatOAuthEnv = {
  WECHAT_OAUTH_KV?: WechatOAuthKv
  WECHAT_OPEN_APP_ID?: string
  WECHAT_OPEN_APP_SECRET?: string
  WECHAT_OAUTH_CLIENT_ID?: string
  WECHAT_OAUTH_CLIENT_SECRET?: string
  WECHAT_OAUTH_PUBLIC_BASE_URL?: string
  SUPABASE_AUTH_CALLBACK_URL?: string
}

export type WechatOAuthContext = {
  request: Request
  env: WechatOAuthEnv
}

type OAuthStateRecord = {
  redirectUri: string
  supabaseState: string
  codeChallenge: string
  codeChallengeMethod: 'S256' | 'plain' | ''
  createdAt: number
}

type AdapterCodeRecord = {
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: 'S256' | 'plain' | ''
  profile: WechatUserProfile
  createdAt: number
}

type AccessTokenRecord = {
  profile: WechatUserProfile
  createdAt: number
}

export type WechatUserProfile = {
  subject: string
  openid: string
  unionid?: string
  nickname?: string
  avatarUrl?: string
}

type WechatTokenResponse = {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  openid?: string
  scope?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

type WechatUserinfoResponse = {
  openid?: string
  nickname?: string
  headimgurl?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

const STATE_TTL_SECONDS = 10 * 60
const CODE_TTL_SECONDS = 5 * 60
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60

const STATE_PREFIX = 'wechat_state:'
const CODE_PREFIX = 'wechat_code:'
const ACCESS_TOKEN_PREFIX = 'wechat_access:'

export async function startWechatAuthorization(request: Request, env: WechatOAuthEnv) {
  const config = readConfig(env, request)
  if ('error' in config) return oauthError(config.error, 503)

  const url = new URL(request.url)
  const clientId = url.searchParams.get('client_id') ?? ''
  const redirectUri = url.searchParams.get('redirect_uri') ?? ''
  const responseType = url.searchParams.get('response_type') ?? ''
  const supabaseState = url.searchParams.get('state') ?? ''
  const codeChallenge = url.searchParams.get('code_challenge') ?? ''
  const codeChallengeMethod = normalizeCodeChallengeMethod(url.searchParams.get('code_challenge_method'))

  if (clientId !== config.clientId) return oauthError('Invalid OAuth client.', 401)
  if (responseType !== 'code') return oauthError('Unsupported OAuth response type.', 400)
  if (!redirectUri || !supabaseState) return oauthError('Missing OAuth redirect or state.', 400)
  if (config.supabaseCallbackUrl && redirectUri !== config.supabaseCallbackUrl) {
    return oauthError('Unexpected Supabase callback URL.', 400)
  }
  if (codeChallenge && !codeChallengeMethod) return oauthError('Unsupported PKCE method.', 400)

  const adapterState = randomToken()
  const stateRecord: OAuthStateRecord = {
    codeChallenge,
    codeChallengeMethod,
    createdAt: Date.now(),
    redirectUri,
    supabaseState,
  }

  await config.kv.put(`${STATE_PREFIX}${adapterState}`, JSON.stringify(stateRecord), {
    expirationTtl: STATE_TTL_SECONDS,
  })

  const wechatUrl = new URL('https://open.weixin.qq.com/connect/qrconnect')
  wechatUrl.searchParams.set('appid', config.wechatAppId)
  wechatUrl.searchParams.set('redirect_uri', config.callbackUrl)
  wechatUrl.searchParams.set('response_type', 'code')
  wechatUrl.searchParams.set('scope', 'snsapi_login')
  wechatUrl.searchParams.set('state', adapterState)

  return Response.redirect(`${wechatUrl.toString()}#wechat_redirect`, 302)
}

export async function handleWechatCallback(request: Request, env: WechatOAuthEnv, fetcher: FetchLike = fetch) {
  const config = readConfig(env, request)
  if ('error' in config) return oauthError(config.error, 503)

  const url = new URL(request.url)
  const wechatCode = url.searchParams.get('code') ?? ''
  const adapterState = url.searchParams.get('state') ?? ''

  const stateRecord = adapterState ? await readJson<OAuthStateRecord>(config.kv, `${STATE_PREFIX}${adapterState}`) : null
  if (!stateRecord) return oauthError('Expired or invalid WeChat login state.', 400)

  await config.kv.delete(`${STATE_PREFIX}${adapterState}`)

  if (!wechatCode) {
    return redirectOAuthError(stateRecord.redirectUri, stateRecord.supabaseState, 'access_denied', 'WeChat authorization was cancelled.')
  }

  const token = await exchangeWechatCode(config.wechatAppId, config.wechatAppSecret, wechatCode, fetcher)
  if ('error' in token) {
    return redirectOAuthError(stateRecord.redirectUri, stateRecord.supabaseState, 'server_error', token.error ?? 'WeChat token exchange failed.')
  }

  const profile = await fetchWechatProfile(token.accessToken, token.openid, token.unionid, fetcher)
  if ('error' in profile) {
    return redirectOAuthError(stateRecord.redirectUri, stateRecord.supabaseState, 'server_error', profile.error ?? 'WeChat profile request failed.')
  }

  const adapterCode = randomToken()
  const codeRecord: AdapterCodeRecord = {
    codeChallenge: stateRecord.codeChallenge,
    codeChallengeMethod: stateRecord.codeChallengeMethod,
    createdAt: Date.now(),
    profile,
    redirectUri: stateRecord.redirectUri,
  }

  await config.kv.put(`${CODE_PREFIX}${adapterCode}`, JSON.stringify(codeRecord), {
    expirationTtl: CODE_TTL_SECONDS,
  })

  const redirectUrl = new URL(stateRecord.redirectUri)
  redirectUrl.searchParams.set('code', adapterCode)
  redirectUrl.searchParams.set('state', stateRecord.supabaseState)
  return Response.redirect(redirectUrl.toString(), 302)
}

export async function issueWechatAdapterToken(request: Request, env: WechatOAuthEnv) {
  const config = readConfig(env, request)
  if ('error' in config) return oauthError(config.error, 503)

  const form = await request.formData()
  const code = String(form.get('code') ?? '')
  const grantType = String(form.get('grant_type') ?? '')
  const redirectUri = String(form.get('redirect_uri') ?? '')
  const codeVerifier = String(form.get('code_verifier') ?? '')

  if (!isValidClientCredentials(request, form, config.clientId, config.clientSecret)) {
    return oauthError('Invalid OAuth client credentials.', 401)
  }
  if (grantType !== 'authorization_code') return oauthError('Unsupported grant type.', 400)
  if (!code) return oauthError('Missing authorization code.', 400)

  const codeKey = `${CODE_PREFIX}${code}`
  const codeRecord = await readJson<AdapterCodeRecord>(config.kv, codeKey)
  if (!codeRecord) return oauthError('Expired or invalid authorization code.', 400)

  await config.kv.delete(codeKey)

  if (redirectUri !== codeRecord.redirectUri) return oauthError('Redirect URI mismatch.', 400)
  if (!(await verifyPkce(codeRecord.codeChallenge, codeRecord.codeChallengeMethod, codeVerifier))) {
    return oauthError('PKCE verification failed.', 400)
  }

  const accessToken = randomToken()
  const accessRecord: AccessTokenRecord = {
    createdAt: Date.now(),
    profile: codeRecord.profile,
  }

  await config.kv.put(`${ACCESS_TOKEN_PREFIX}${accessToken}`, JSON.stringify(accessRecord), {
    expirationTtl: ACCESS_TOKEN_TTL_SECONDS,
  })

  return json({
    access_token: accessToken,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope: 'openid profile',
    token_type: 'Bearer',
  })
}

export async function getWechatAdapterUserinfo(request: Request, env: WechatOAuthEnv) {
  const config = readConfig(env, request)
  if ('error' in config) return oauthError(config.error, 503)

  const accessToken = readBearerToken(request)
  if (!accessToken) return oauthError('Missing bearer token.', 401)

  const accessRecord = await readJson<AccessTokenRecord>(config.kv, `${ACCESS_TOKEN_PREFIX}${accessToken}`)
  if (!accessRecord) return oauthError('Expired or invalid bearer token.', 401)

  const { profile } = accessRecord
  return json({
    avatar_url: profile.avatarUrl,
    email_verified: false,
    id: profile.subject,
    name: profile.nickname ?? 'WeChat User',
    nickname: profile.nickname,
    openid: profile.openid,
    picture: profile.avatarUrl,
    provider_id: profile.openid,
    sub: profile.subject,
    unionid: profile.unionid,
  })
}

export function methodNotAllowed(expectedMethod: string) {
  return json({ error: `Method not allowed. Use ${expectedMethod}.` }, 405, {
    Allow: expectedMethod,
  })
}

async function exchangeWechatCode(appId: string, appSecret: string, code: string, fetcher: FetchLike) {
  const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token')
  tokenUrl.searchParams.set('appid', appId)
  tokenUrl.searchParams.set('secret', appSecret)
  tokenUrl.searchParams.set('code', code)
  tokenUrl.searchParams.set('grant_type', 'authorization_code')

  const response = await fetcher(tokenUrl)
  const payload = (await response.json()) as WechatTokenResponse

  if (!response.ok || payload.errcode || !payload.access_token || !payload.openid) {
    return { error: 'WeChat code exchange failed.' } as const
  }

  return {
    accessToken: payload.access_token,
    openid: payload.openid,
    unionid: payload.unionid,
  } as const
}

async function fetchWechatProfile(
  accessToken: string,
  openid: string,
  unionidFromToken: string | undefined,
  fetcher: FetchLike,
) {
  const userinfoUrl = new URL('https://api.weixin.qq.com/sns/userinfo')
  userinfoUrl.searchParams.set('access_token', accessToken)
  userinfoUrl.searchParams.set('openid', openid)
  userinfoUrl.searchParams.set('lang', 'zh_CN')

  const response = await fetcher(userinfoUrl)
  const payload = (await response.json()) as WechatUserinfoResponse

  if (!response.ok || payload.errcode || !payload.openid) {
    return { error: 'WeChat userinfo request failed.' } as const
  }

  const stableUnionid = payload.unionid || unionidFromToken
  return {
    avatarUrl: payload.headimgurl,
    nickname: payload.nickname,
    openid: payload.openid,
    subject: stableUnionid ? `wechat-unionid:${stableUnionid}` : `wechat-openid:${payload.openid}`,
    unionid: stableUnionid,
  } satisfies WechatUserProfile
}

type AdapterConfig =
  | {
      callbackUrl: string
      clientId: string
      clientSecret: string
      kv: WechatOAuthKv
      supabaseCallbackUrl: string
      wechatAppId: string
      wechatAppSecret: string
    }
  | { error: string }

function readConfig(env: WechatOAuthEnv, request: Request): AdapterConfig {
  const baseUrl = (env.WECHAT_OAUTH_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '')
  const missing = [
    ['WECHAT_OAUTH_KV', env.WECHAT_OAUTH_KV],
    ['WECHAT_OPEN_APP_ID', env.WECHAT_OPEN_APP_ID],
    ['WECHAT_OPEN_APP_SECRET', env.WECHAT_OPEN_APP_SECRET],
    ['WECHAT_OAUTH_CLIENT_ID', env.WECHAT_OAUTH_CLIENT_ID],
    ['WECHAT_OAUTH_CLIENT_SECRET', env.WECHAT_OAUTH_CLIENT_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    return { error: `WeChat OAuth adapter is not configured: ${missing.join(', ')}.` }
  }

  return {
    callbackUrl: `${baseUrl}/api/auth/wechat/callback`,
    clientId: env.WECHAT_OAUTH_CLIENT_ID ?? '',
    clientSecret: env.WECHAT_OAUTH_CLIENT_SECRET ?? '',
    kv: env.WECHAT_OAUTH_KV as WechatOAuthKv,
    supabaseCallbackUrl: env.SUPABASE_AUTH_CALLBACK_URL ?? '',
    wechatAppId: env.WECHAT_OPEN_APP_ID ?? '',
    wechatAppSecret: env.WECHAT_OPEN_APP_SECRET ?? '',
  }
}

function isValidClientCredentials(request: Request, form: FormData, clientId: string, clientSecret: string) {
  const basicCredentials = parseBasicAuth(request.headers.get('authorization'))
  if (basicCredentials) {
    return basicCredentials.clientId === clientId && basicCredentials.clientSecret === clientSecret
  }

  return form.get('client_id') === clientId && form.get('client_secret') === clientSecret
}

function parseBasicAuth(header: string | null) {
  if (!header?.startsWith('Basic ')) return null

  try {
    const decoded = atob(header.slice('Basic '.length))
    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex < 0) return null
    return {
      clientId: decoded.slice(0, separatorIndex),
      clientSecret: decoded.slice(separatorIndex + 1),
    }
  } catch {
    return null
  }
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : ''
}

function normalizeCodeChallengeMethod(value: string | null): 'S256' | 'plain' | '' {
  if (!value) return ''
  return value === 'S256' || value === 'plain' ? value : ''
}

async function verifyPkce(challenge: string, method: 'S256' | 'plain' | '', verifier: string) {
  if (!challenge) return true
  if (!verifier) return false
  if (method === 'plain') return verifier === challenge
  if (method !== 'S256') return false

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest)) === challenge
}

async function readJson<T>(kv: WechatOAuthKv, key: string) {
  const raw = await kv.get(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    await kv.delete(key)
    return null
  }
}

function redirectOAuthError(redirectUri: string, state: string, error: string, description: string) {
  const redirectUrl = new URL(redirectUri)
  redirectUrl.searchParams.set('error', error)
  redirectUrl.searchParams.set('error_description', description)
  redirectUrl.searchParams.set('state', state)
  return Response.redirect(redirectUrl.toString(), 302)
}

function oauthError(message: string, status: number) {
  return json({ error: message }, status, {
    'Cache-Control': 'no-store',
  })
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
    status,
  })
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
