import { ApiError, http } from './http'
import { settingsStore } from './settings'
import { createStore } from './store'
import type { FonteDados } from './types'

export type Recurso = 'medicos' | 'pacientes' | 'consultas'
export type EstadoRecurso = 'verificando' | 'online' | 'offline' | 'indisponivel'

export interface ConnectionState {
  recursos: Record<Recurso, EstadoRecurso>
  verificadoEm: Date | null
}

export const connectionStore = createStore<ConnectionState>({
  recursos: { medicos: 'verificando', pacientes: 'verificando', consultas: 'verificando' },
  verificadoEm: null,
})

const isPage = (b: unknown) => !!b && typeof b === 'object' && Array.isArray((b as { content?: unknown }).content)

async function probeList(path: string): Promise<EstadoRecurso> {
  try {
    const body = await http(`${path}?size=1`, { timeoutMs: 4000 })
    return isPage(body) ? 'online' : 'indisponivel'
  } catch (e) {
    if (e instanceof ApiError && e.offline) return 'offline'
    return 'indisponivel'
  }
}

let inflight: Promise<void> | null = null

export function probeApi(): Promise<void> {
  if (settingsStore.get().dataMode === 'local') {
    connectionStore.set({ recursos: { medicos: 'offline', pacientes: 'offline', consultas: 'offline' }, verificadoEm: new Date() })
    return Promise.resolve()
  }
  if (inflight) return inflight
  connectionStore.set((s) => ({
    ...s,
    recursos: { medicos: 'verificando', pacientes: 'verificando', consultas: 'verificando' },
  }))
  inflight = (async () => {
    const [medicos, pacientes, consultas] = await Promise.all([
      probeList('/medicos'),
      probeList('/pacientes'),
      probeList('/consultas'),
    ])
    connectionStore.set({ recursos: { medicos, pacientes, consultas }, verificadoEm: new Date() })
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export function markOffline(recurso: Recurso) {
  connectionStore.set((s) => ({ ...s, recursos: { ...s.recursos, [recurso]: 'offline' } }))
}

/** Decide de onde cada recurso lê/escreve, conforme o modo configurado e o diagnóstico da API. */
export async function fonteDe(recurso: Recurso): Promise<FonteDados> {
  const mode = settingsStore.get().dataMode
  if (mode === 'local') return 'local'
  if (mode === 'api') return 'api'
  if (connectionStore.get().recursos[recurso] === 'verificando') await probeApi()
  return connectionStore.get().recursos[recurso] === 'online' ? 'api' : 'local'
}

export function fonteAtual(recurso: Recurso): FonteDados {
  const mode = settingsStore.get().dataMode
  if (mode !== 'auto') return mode
  return connectionStore.get().recursos[recurso] === 'online' ? 'api' : 'local'
}
