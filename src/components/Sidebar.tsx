import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, ChevronLeft, House, Settings, Stethoscope, Users } from 'lucide-react'
import logoMark from '../assets/logo-mark.png'
import { useNow } from '../hooks/useNow'
import { useSettings } from '../hooks/useStores'
import { updateSettings } from '../lib/settings'
import { pad } from '../lib/format'

interface Props {
  open: boolean
  onNavigate: () => void
  counts: { consultasHoje?: number }
}

const NAV = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/agenda', label: 'Agendamentos', icon: CalendarClock, badge: 'consultasHoje' as const },
  { to: '/medicos', label: 'Médicos', icon: Stethoscope },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
]

export function Sidebar({ open, onNavigate, counts }: Props) {
  const { sidebarCollapsed: collapsed, clinicName } = useSettings()
  const { pathname } = useLocation()
  const now = useNow()

  const renderLink = (item: (typeof NAV)[number] | { to: string; label: string; icon: typeof House; end?: boolean; badge?: undefined }) => {
    const active = item.end ? pathname === item.to : pathname.startsWith(item.to)
    const Icon = item.icon
    const badge = item.badge ? counts[item.badge] : undefined
    return (
      <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={`nav__link ${active ? 'is-active' : ''}`}>
        {active && <motion.span layoutId="nav-active" className="nav__active-bg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
        <span className="nav__icon">
          <Icon size={20} strokeWidth={2.1} />
        </span>
        <span className="nav__label">{item.label}</span>
        {!!badge && <span className="nav__badge" aria-label={`${badge} consultas hoje`}>{badge}</span>}
        <span className="nav__tip" role="tooltip">
          {item.label}
        </span>
      </NavLink>
    )
  }

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${open ? 'is-open' : ''}`} aria-label="Menu principal">
      <button
        className="collapse-btn"
        onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        <ChevronLeft size={16} />
      </button>

      <NavLink to="/" className="sidebar__brand" onClick={onNavigate}>
        <span className="sidebar__logo">
          <img src={logoMark} alt="" />
        </span>
        <span className="sidebar__brand-text">
          <strong>MedVoll</strong>
          <span>{clinicName}</span>
        </span>
      </NavLink>

      <div className="sidebar__section">Menu</div>
      <nav className="nav">{NAV.map(renderLink)}</nav>

      <div className="sidebar__section">Sistema</div>
      <nav className="nav">{renderLink({ to: '/configuracoes', label: 'Configurações', icon: Settings })}</nav>

      <div className="sidebar__footer">
        <div className="sidebar__clock" aria-label="Relógio">
          <div className="sidebar__clock-time">
            {pad(now.getHours())}:{pad(now.getMinutes())}
            <small>:{pad(now.getSeconds())}</small>
          </div>
          <div className="sidebar__clock-date">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
          </div>
        </div>
      </div>
    </aside>
  )
}
