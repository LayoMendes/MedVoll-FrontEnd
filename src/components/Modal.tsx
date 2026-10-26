import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: ReactNode
  tone?: 'default' | 'danger'
  width?: number
  children: ReactNode
  footer?: ReactNode
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, description, icon, tone = 'default', width, children, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && ref.current) {
        // Mantém o foco dentro do diálogo.
        const els = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (!els.length) return
        const first = els[0]!
        const last = els[els.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>('[data-autofocus], .modal__body input:not([disabled]), .modal__body select')
      ;(target ?? ref.current)?.focus()
    }, 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
      previous?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="modal-root">
          <motion.div className="modal-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={ref}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            style={{ ['--modal-w' as string]: width ? `${width}px` : undefined }}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="modal__head">
              {icon && <div className={`modal__icon ${tone === 'danger' ? 'modal__icon--danger' : ''}`}>{icon}</div>}
              <div>
                <h2 className="modal__title" id="modal-title">
                  {title}
                </h2>
                {description && <p className="modal__desc">{description}</p>}
              </div>
              <button className="icon-btn modal__close" onClick={onClose} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="modal__body">{children}</div>
            {footer && <div className="modal__foot">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
