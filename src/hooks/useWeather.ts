import { useEffect, useState } from 'react'
import type { CityPref } from '../lib/settings'

export interface Weather {
  city: string
  region?: string
  temperature: number
  code: number
  isDay: boolean
  unit: 'C' | 'F'
}

type Status = 'loading' | 'ready' | 'error'

const FALLBACK: CityPref = { name: 'São Paulo', admin: 'SP', lat: -23.5505, lon: -46.6333 }

const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('sem geolocalização'))
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 30 * 60_000 })
  })

async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; admin?: string }> {
  const r = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
  )
  const j = await r.json()
  const admin = (j.principalSubdivisionCode as string | undefined)?.split('-')[1] ?? j.principalSubdivision
  return { name: j.city || j.locality || 'Sua localização', admin }
}

async function fetchWeather(lat: number, lon: number, unit: 'C' | 'F') {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&temperature_unit=${unit === 'F' ? 'fahrenheit' : 'celsius'}&timezone=auto`,
  )
  if (!r.ok) throw new Error('clima indisponível')
  const j = await r.json()
  return { temperature: j.current.temperature_2m as number, code: j.current.weather_code as number, isDay: j.current.is_day === 1 }
}

export function useWeather(city: CityPref | null, unit: 'C' | 'F') {
  const [state, setState] = useState<{ status: Status; data: Weather | null; usingFallback: boolean }>({
    status: 'loading',
    data: null,
    usingFallback: false,
  })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval>

    async function load() {
      try {
        let place: CityPref = city ?? FALLBACK
        let usingFallback = false
        if (!city) {
          try {
            const pos = await getPosition()
            const { latitude: lat, longitude: lon } = pos.coords
            const geo = await reverseGeocode(lat, lon).catch(() => ({ name: 'Sua localização', admin: undefined }))
            place = { name: geo.name, admin: geo.admin, lat, lon }
          } catch {
            usingFallback = true
          }
        }
        const w = await fetchWeather(place.lat, place.lon, unit)
        if (!cancelled)
          setState({ status: 'ready', usingFallback, data: { city: place.name, region: place.admin, unit, ...w } })
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: 'error' }))
      }
    }

    load()
    timer = setInterval(load, 15 * 60_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [city?.lat, city?.lon, city?.name, unit])

  return state
}

/** Códigos WMO -> descrição em português */
export function weatherLabel(code: number) {
  if (code === 0) return 'Céu limpo'
  if (code <= 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code <= 48) return 'Neblina'
  if (code <= 57) return 'Garoa'
  if (code <= 67) return 'Chuva'
  if (code <= 77) return 'Neve'
  if (code <= 82) return 'Pancadas de chuva'
  return 'Tempestade'
}

export async function searchCities(q: string): Promise<CityPref[]> {
  if (q.trim().length < 2) return []
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=pt&format=json`,
  )
  const j = await r.json()
  return (j.results ?? []).map((c: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
    name: c.name,
    admin: c.admin1,
    country: c.country,
    lat: c.latitude,
    lon: c.longitude,
  }))
}
