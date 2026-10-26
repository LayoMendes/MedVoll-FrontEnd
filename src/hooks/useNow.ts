import { useEffect, useState } from 'react'

/** Data/hora atual, atualizada no início de cada segundo (sem "derivas" do setInterval). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setNow(new Date())
      timer = setTimeout(tick, intervalMs - (Date.now() % intervalMs))
    }
    timer = setTimeout(tick, intervalMs - (Date.now() % intervalMs))
    return () => clearTimeout(timer)
  }, [intervalMs])
  return now
}
