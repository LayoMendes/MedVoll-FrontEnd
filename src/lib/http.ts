import { settingsStore } from './settings'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** true quando a API não respondeu (servidor desligado, rede, proxy) */
    public offline = false,
  ) {
    super(message)
  }
  /** Endpoint inexistente na API (ex.: recurso ainda não implementado) */
  get unsupported() {
    return this.status === 404 || this.status === 405
  }
}

const baseUrl = () => settingsStore.get().apiUrl.replace(/\/+$/, '')

function friendlyMessage(status: number, body: unknown): string {
  // Bean Validation do Spring pode devolver uma lista de erros por campo.
  if (Array.isArray(body) && body.length && typeof body[0] === 'object') {
    return body
      .map((e: { campo?: string; field?: string; mensagem?: string; defaultMessage?: string }) =>
        [e.campo ?? e.field, e.mensagem ?? e.defaultMessage].filter(Boolean).join(': '),
      )
      .join(' · ')
  }
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message) {
    if (status !== 500) return body.message
  }
  switch (status) {
    case 400:
      return 'Dados inválidos. Revise os campos e tente novamente.'
    case 403:
      return 'Acesso negado pela API.'
    case 404:
      return 'Registro ou recurso não encontrado na API.'
    case 409:
      return 'Conflito: o registro já existe.'
    case 500:
      return 'A API recusou a operação. Verifique se e-mail ou CRM já estão cadastrados.'
    default:
      return `Erro inesperado da API (${status}).`
  }
}

export async function http<T = unknown>(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 8000)
  let res: Response
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: ctrl.signal,
    })
  } catch {
    throw new ApiError('Não foi possível conectar à API.', 0, true)
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  let body: unknown = undefined
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    const offline = res.headers.get('X-Medvoll-Proxy') === 'offline' || res.status === 502 || res.status === 504
    throw new ApiError(offline ? 'API indisponível no momento.' : friendlyMessage(res.status, body), res.status, offline)
  }
  // Ao chamar por um servidor de desenvolvimento sem proxy, um HTML pode vir no lugar do JSON.
  if (typeof body === 'string' && body.trimStart().startsWith('<')) {
    throw new ApiError('A URL configurada não respondeu como a API MedVoll.', 404)
  }
  return body as T
}
