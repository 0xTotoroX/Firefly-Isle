/**
 * [INPUT]: 依赖 @/lib/supabase 的 Edge Function env 与当前 Supabase session。
 * [OUTPUT]: 对外提供 MedicalDocumentOcrError、recognizeMedicalDocument 与 getMedicalDocumentOcrMessage。
 * [POS]: src/lib 的医学文档 OCR 前端协议边界，负责文件校验、base64 编码、JWT 透传与错误归一。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { getSupabaseClient, hasSupabaseEnv, hasSupabaseFunctionEnv, supabaseEdgeFunctionUrl } from '@/lib/supabase'
import type { Locale } from '@/lib/locale'
import { isBrowserOffline } from '@/lib/network-status'

export type MedicalDocumentOcrErrorName =
  | 'AuthError'
  | 'ConfigurationError'
  | 'OCRInvalidFileError'
  | 'OCRInvalidRequestError'
  | 'OCRInvalidResponseError'
  | 'OCRNetworkUnavailableError'
  | 'OCRTimeoutError'
  | 'OCRUpstreamError'

type OcrErrorPayload = {
  error?: {
    message?: string
    name?: string
  }
}

type OcrSuccessPayload = {
  model?: string
  text?: string
}

export class MedicalDocumentOcrError extends Error {
  name: MedicalDocumentOcrErrorName
  status?: number

  constructor(name: MedicalDocumentOcrErrorName, message: string, status?: number) {
    super(message)
    this.name = name
    this.status = status
  }
}

const SUPPORTED_MIME_TYPES = new Set(['application/pdf'])
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024

function buildUrl() {
  return `${supabaseEdgeFunctionUrl.replace(/\/$/, '')}/medical-document-ocr`
}

function ensureConfigured() {
  if (!hasSupabaseEnv || !hasSupabaseFunctionEnv) {
    throw new MedicalDocumentOcrError('ConfigurationError', 'Missing Supabase OCR environment variables.')
  }
}

function isSupportedFile(file: File) {
  return file.type.startsWith('image/') || SUPPORTED_MIME_TYPES.has(file.type)
}

function validateFile(file: File) {
  if (!isSupportedFile(file)) {
    throw new MedicalDocumentOcrError('OCRInvalidFileError', 'Only image and PDF medical documents are supported.')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new MedicalDocumentOcrError('OCRInvalidFileError', 'Medical document file is too large.')
  }
}

async function getAccessToken() {
  const { data, error } = await getSupabaseClient().auth.getSession()

  if (error || !data.session?.access_token) {
    throw new MedicalDocumentOcrError('AuthError', 'Missing Supabase session for OCR request.')
  }

  return data.session.access_token
}

function encodeBase64(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  if (typeof btoa === 'function') {
    return btoa(binary)
  }

  return Buffer.from(bytes).toString('base64')
}

async function fileToBase64(file: File) {
  return encodeBase64(new Uint8Array(await file.arrayBuffer()))
}

function toOcrError(payload: OcrErrorPayload, status: number) {
  const name = payload?.error?.name
  const message = payload?.error?.message

  if (typeof name === 'string' && typeof message === 'string') {
    return new MedicalDocumentOcrError(name as MedicalDocumentOcrErrorName, message, status)
  }

  return new MedicalDocumentOcrError('OCRInvalidResponseError', 'OCR boundary returned an invalid error payload.', status)
}

function toOcrText(payload: OcrSuccessPayload) {
  if (typeof payload?.text !== 'string') {
    throw new MedicalDocumentOcrError('OCRInvalidResponseError', 'OCR boundary returned an invalid success payload.')
  }

  const text = payload.text.trim()

  if (!text) {
    throw new MedicalDocumentOcrError('OCRInvalidResponseError', 'OCR boundary returned empty text.')
  }

  return text
}

export async function recognizeMedicalDocument(file: File) {
  ensureConfigured()
  validateFile(file)

  if (isBrowserOffline()) {
    throw new MedicalDocumentOcrError('OCRNetworkUnavailableError', 'Network connection is required for OCR.')
  }

  const [accessToken, dataBase64] = await Promise.all([getAccessToken(), fileToBase64(file)])
  const response = await fetch(buildUrl(), {
    body: JSON.stringify({
      dataBase64,
      fileName: file.name,
      mimeType: file.type,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new MedicalDocumentOcrError('OCRInvalidResponseError', 'OCR boundary returned non-JSON content.', response.status)
  }

  if (!response.ok) {
    throw toOcrError(payload as OcrErrorPayload, response.status)
  }

  return {
    text: toOcrText(payload as OcrSuccessPayload),
  }
}

export function getMedicalDocumentOcrMessage(error: unknown, locale: Locale) {
  const name = error instanceof MedicalDocumentOcrError ? error.name : 'OCRUpstreamError'
  const messages: Record<MedicalDocumentOcrErrorName, Record<Locale, string>> = {
    AuthError: {
      en: 'Please sign in again before uploading a medical document.',
      zh: '请重新登录后再上传病历文件。',
    },
    ConfigurationError: {
      en: 'OCR is not configured yet. Please try again later.',
      zh: 'OCR 服务尚未配置，请稍后重试。',
    },
    OCRInvalidFileError: {
      en: 'Only medical images and PDF files are supported.',
      zh: '仅支持病历图片或 PDF 文件。',
    },
    OCRInvalidRequestError: {
      en: 'The uploaded file could not be read. Please try another image or PDF.',
      zh: '上传文件无法识别，请换一张图片或 PDF 重试。',
    },
    OCRInvalidResponseError: {
      en: 'No readable medical text was found. You can retry or type it manually.',
      zh: '未识别到可读病历文字，可重试或手动输入。',
    },
    OCRNetworkUnavailableError: {
      en: 'Network unavailable. Reconnect before uploading a medical document.',
      zh: '当前网络不可用，请联网后再上传病历文件。',
    },
    OCRTimeoutError: {
      en: 'OCR timed out. Please retry with a smaller file.',
      zh: 'OCR 超时，请换更小的文件重试。',
    },
    OCRUpstreamError: {
      en: 'OCR failed. Please retry or type the text manually.',
      zh: 'OCR 识别失败，请重试或手动输入。',
    },
  }

  return messages[name][locale]
}
