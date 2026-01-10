// src/shared/api/httpClient.ts

import { z } from 'zod'
import { useAuthStore } from '@/app/store/authStore'

/**
 * Week 2 OIDC: tenant + actor derived from JWT token.
 * Authorization: Bearer <token> attached automatically.
 * No x-tenant-id header - tenant context derived from JWT.
 */
const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_API_MODE: z.string().optional(), // "mock" | "live" (optional)
})

const env = EnvSchema.parse(import.meta.env)

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ApiError = {
  status: number
  code?: string
  message: string
  details?: unknown
  requestId?: string
}

export class ApiException extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly details?: unknown
  public readonly requestId?: string

  constructor(err: ApiError) {
    super(err.message)
    this.name = 'ApiException'
    this.status = err.status
    this.code = err.code
    this.details = err.details
    this.requestId = err.requestId
  }
}

function makeRequestId(): string {
  // Stable-enough client request id for correlation (Week 1)
  // Example: req_ks8f2p_170452...
  return `req_${Math.random().toString(36).slice(2, 8)}_${Date.now()}`
}

function joinUrl(base: string, path: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

async function parseResponse(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return await res.json().catch(() => null)
  }
  // fallback text
  const text = await res.text().catch(() => '')
  return text || null
}

function buildHeaders(extra?: Record<string, string>): Headers {
  const h = new Headers()
  h.set('accept', 'application/json')
  // only set content-type when we send JSON body (done in request() below)

  // Request correlation id
  h.set('x-request-id', makeRequestId())

  // Week 2: Authorization header from auth store
  // Tenant context derived from JWT token (no x-tenant-id header)
  const token = useAuthStore.getState().accessToken
  if (token) {
    h.set('Authorization', `Bearer ${token}`)
  }

  if (extra) {
    for (const [k, v] of Object.entries(extra)) h.set(k, v)
  }
  return h
}

export type RequestOptions = {
  method?: HttpMethod
  query?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  body?: unknown
  signal?: AbortSignal
}

export const httpClient = {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET'

    const url = new URL(joinUrl(env.VITE_API_BASE_URL, path), window.location.origin)

    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null) continue
        url.searchParams.set(k, String(v))
      }
    }

    const headers = buildHeaders(options.headers)

    const init: RequestInit = {
      method,
      headers,
      signal: options.signal,
      credentials: 'include', // harmless now; useful later if needed
    }

    if (options.body !== undefined) {
      headers.set('content-type', 'application/json')
      init.body = JSON.stringify(options.body)
    }

    const res = await fetch(url.toString(), init)
    const requestId =
      res.headers.get('x-request-id') ||
      res.headers.get('x-correlation-id') ||
      undefined

    if (!res.ok) {
      const payload = await parseResponse(res)

      // Attempt to normalize backend error shapes
      const message =
        (payload as any)?.message ||
        (payload as any)?.error ||
        res.statusText ||
        'Request failed'

      const code = (payload as any)?.code
      const details = (payload as any)?.details ?? payload

      throw new ApiException({
        status: res.status,
        code,
        message: typeof message === 'string' ? message : 'Request failed',
        details,
        requestId,
      })
    }

    return (await parseResponse(res)) as T
  },

  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return httpClient.request<T>(path, { ...options, method: 'GET' })
  },

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return httpClient.request<T>(path, { ...options, method: 'POST', body })
  },

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return httpClient.request<T>(path, { ...options, method: 'PUT', body })
  },

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return httpClient.request<T>(path, { ...options, method: 'PATCH', body })
  },

  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return httpClient.request<T>(path, { ...options, method: 'DELETE' })
  },

  /**
   * POST with multipart/form-data (file uploads).
   * Browser automatically sets Content-Type with boundary.
   */
  async postForm<T>(path: string, formData: FormData, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    const url = new URL(joinUrl(env.VITE_API_BASE_URL, path), window.location.origin)

    if (options?.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null) continue
        url.searchParams.set(k, String(v))
      }
    }

    const headers = buildHeaders(options?.headers)
    // IMPORTANT: Do NOT set content-type for FormData (browser sets it with boundary)

    const init: RequestInit = {
      method: 'POST',
      headers,
      body: formData,
      signal: options?.signal,
      credentials: 'include',
    }

    const res = await fetch(url.toString(), init)
    const requestId =
      res.headers.get('x-request-id') ||
      res.headers.get('x-correlation-id') ||
      undefined

    if (!res.ok) {
      const payload = await parseResponse(res)

      const message =
        (payload as any)?.message ||
        (payload as any)?.error ||
        res.statusText ||
        'Request failed'

      const code = (payload as any)?.code
      const details = (payload as any)?.details ?? payload

      throw new ApiException({
        status: res.status,
        code,
        message: typeof message === 'string' ? message : 'Request failed',
        details,
        requestId,
      })
    }

    return (await parseResponse(res)) as T
  },
}
