import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  kind: Kind
  title: string
  message?: string
}

const Ctx = createContext<(kind: Kind, title: string, message?: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((kind: Kind, title: string, message?: string) => {
    const id = Date.now() + Math.random()
    setItems((l) => [...l.slice(-3), { id, kind, title, message }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 6500 : 4200)
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="region" aria-live="polite" aria-label="Notificações">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast toast--${t.kind}`}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role={t.kind === 'error' ? 'alert' : 'status'}
            >
              <div className="toast__icon">
                {t.kind === 'success' ? <CheckCircle2 size={18} /> : t.kind === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
              </div>
              <div>
                <strong>{t.title}</strong>
                {t.message && <span>{t.message}</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const push = useContext(Ctx)
  return useMemo(
    () => ({
      success: (title: string, message?: string) => push('success', title, message),
      error: (title: string, message?: string) => push('error', title, message),
      info: (title: string, message?: string) => push('info', title, message),
    }),
    [push],
  )
}
