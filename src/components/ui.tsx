import { useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Bone, HeartPulse, Sparkles, Baby } from 'lucide-react'
import type { Especialidade } from '../lib/types'
import { especialidadeLabel } from '../lib/types'
import { initials } from '../lib/format'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__thumb" />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
}) {
  const id = useId()
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="segmented__pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  )
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#A9DDF8,#4A94EB)',
  'linear-gradient(135deg,#79B9F2,#2F7AD6)',
  'linear-gradient(135deg,#9FD3F5,#5A9FEA)',
  'linear-gradient(135deg,#8CC8F5,#4A7FE0)',
  'linear-gradient(135deg,#9AD7F0,#3A8BD9)',
]

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <div className="avatar" style={{ ['--size' as string]: `${size}px`, background: AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length] }} aria-hidden>
      {initials(name)}
    </div>
  )
}

export const SPEC_META: Record<Especialidade, { color: string; icon: typeof HeartPulse }> = {
  CARDIOLOGIA: { color: '#E0607E', icon: HeartPulse },
  DERMATOLOGIA: { color: '#8B7CF6', icon: Sparkles },
  GINECOLOGIA: { color: '#D46BB3', icon: Baby },
  ORTOPEDIA: { color: '#2A9D9F', icon: Bone },
}

export function SpecBadge({ value }: { value: Especialidade }) {
  const meta = SPEC_META[value]
  const Icon = meta?.icon ?? HeartPulse
  return (
    <span className="spec" style={{ ['--c' as string]: meta?.color }}>
      <Icon /> {especialidadeLabel(value)}
    </span>
  )
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
  className = '',
  htmlFor,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="req">*</span>}
      </label>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

/** Cabeçalho das páginas internas. O rótulo (eyebrow) fica só para leitores de tela. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header" aria-label={eyebrow}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

/** Aviso exibido quando um recurso está usando os dados locais. */
export function SourceNotice({ fonte, recurso }: { fonte: 'api' | 'local'; recurso: string }) {
  if (fonte === 'api') return null
  return (
    <div className="alert alert--warning" role="note">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
      </svg>
      <div>
        <strong>Modo local ativo para {recurso}.</strong> A API não respondeu neste recurso; os dados estão sendo salvos neste
        navegador. Ajuste a conexão em <em>Configurações → Integração</em>.
      </div>
    </div>
  )
}
