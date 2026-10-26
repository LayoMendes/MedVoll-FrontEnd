import { useCallback, useEffect, useRef, useState } from 'react'
import { dataBus } from '../lib/store'
import { connectionStore } from '../lib/connection'
import { settingsStore } from '../lib/settings'

/**
 * Carrega dados assíncronos e recarrega quando:
 *  - algum serviço emitir alteração em um dos escopos informados;
 *  - o modo de dados / status de conexão mudar.
 */
export function useData<T>(fetcher: () => Promise<T>, scopes: string[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const reqId = useRef(0)

  const reload = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const result = await fetcherRef.current()
      if (id === reqId.current) {
        setData(result)
        setError(null)
      }
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'Erro ao carregar dados.')
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [])

  const scopeKey = scopes.join('|')
  useEffect(() => {
    reload()
    const offBus = dataBus.on((s) => scopeKey.split('|').includes(s) && reload())
    let lastConn = JSON.stringify(connectionStore.get().recursos)
    const offConn = connectionStore.subscribe(() => {
      const next = JSON.stringify(connectionStore.get().recursos)
      if (next !== lastConn && !next.includes('verificando')) {
        lastConn = next
        reload()
      }
    })
    let lastMode = settingsStore.get().dataMode + settingsStore.get().apiUrl
    const offSettings = settingsStore.subscribe(() => {
      const next = settingsStore.get().dataMode + settingsStore.get().apiUrl
      if (next !== lastMode) {
        lastMode = next
        reload()
      }
    })
    return () => {
      offBus()
      offConn()
      offSettings()
    }
  }, [reload, scopeKey])

  return { data, error, loading, reload }
}
