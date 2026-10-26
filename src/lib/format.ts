export const onlyDigits = (v: string) => v.replace(/\D/g, '')

export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export const initials = (nome: string) =>
  nome
    .replace(/^(dr|dra)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const pad = (n: number) => String(n).padStart(2, '0')

/** Date -> 'yyyy-MM-dd' no fuso local */
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Date -> 'yyyy-MM-ddTHH:mm' no fuso local (formato LocalDateTime esperado pelo Spring) */
export const toLocalIso = (d: Date) => `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`

export const parseLocalIso = (s: string) => {
  const [date, time = '00:00'] = s.split('T')
  const [y, m, d] = date!.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y!, m! - 1, d!, hh, mm)
}

export const sameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const fmtLongDate = (d: Date) =>
  capitalize(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

export const fmtShortDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

export const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const greeting = (d: Date) => {
  const h = d.getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]
