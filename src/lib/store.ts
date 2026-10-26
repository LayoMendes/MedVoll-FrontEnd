// Pequena store observável (sem dependências) usada por configurações e status de conexão.
// Permite que serviços fora do React leiam o estado e que componentes reajam via useSyncExternalStore.

export function createStore<T>(initial: T) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* armazenamento indisponível (modo privado): segue apenas em memória */
  }
}

/** Barramento simples para avisar telas que os dados mudaram. */
const dataListeners = new Set<(scope: string) => void>()
export const dataBus = {
  emit: (scope: string) => dataListeners.forEach((l) => l(scope)),
  on(l: (scope: string) => void) {
    dataListeners.add(l)
    return () => dataListeners.delete(l)
  },
}
