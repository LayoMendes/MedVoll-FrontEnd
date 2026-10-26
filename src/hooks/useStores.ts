import { useSyncExternalStore } from 'react'
import { settingsStore } from '../lib/settings'
import { connectionStore } from '../lib/connection'

export const useSettings = () => useSyncExternalStore(settingsStore.subscribe, settingsStore.get)
export const useConnection = () => useSyncExternalStore(connectionStore.subscribe, connectionStore.get)
