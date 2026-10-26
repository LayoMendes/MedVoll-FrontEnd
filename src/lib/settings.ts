import { createStore, readJson, writeJson } from './store'

export type ThemePref = 'light' | 'dark' | 'system'
export type DataMode = 'auto' | 'api' | 'local'

export interface CityPref {
  name: string
  admin?: string
  country?: string
  lat: number
  lon: number
}

export interface Settings {
  theme: ThemePref
  apiUrl: string
  dataMode: DataMode
  /** null = usar a geolocalização do navegador */
  city: CityPref | null
  tempUnit: 'C' | 'F'
  showSeconds: boolean
  animatedBackground: boolean
  sidebarCollapsed: boolean
  clinicName: string
}

const KEY = 'medvoll:settings'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  apiUrl: '/api',
  dataMode: 'auto',
  city: null,
  tempUnit: 'C',
  showSeconds: true,
  animatedBackground: true,
  sidebarCollapsed: false,
  clinicName: 'Clínica MedVoll',
}

export const settingsStore = createStore<Settings>({ ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(KEY, {}) })

settingsStore.subscribe(() => writeJson(KEY, settingsStore.get()))

export const updateSettings = (patch: Partial<Settings>) => settingsStore.set((s) => ({ ...s, ...patch }))

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
