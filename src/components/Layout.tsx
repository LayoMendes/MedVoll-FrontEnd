import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useSettings } from '../hooks/useStores'
import { resolveTheme } from '../lib/settings'

// three.js é pesado: o shader carrega sob demanda, com um gradiente CSS enquanto isso.
const ShaderBackground = lazy(() => import('./ShaderBackground'))
const ShaderFallback = () => <div className="shader-bg" aria-hidden />
import logoMark from '../assets/logo-mark.png'
import { useData } from '../hooks/useData'
import { consultasService } from '../services/consultas'
import { parseLocalIso, sameDay } from '../lib/format'

export function Layout() {
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const isHome = pathname === '/'
  const { theme, animatedBackground } = useSettings()
  const resolved = useResolvedTheme(theme)

  const { data: consultas } = useData(() => consultasService.listar(), ['consultas'])
  const consultasHoje = useMemo(() => {
    const hoje = new Date()
    return (consultas ?? []).filter((c) => c.status === 'AGENDADA' && sameDay(parseLocalIso(c.data), hoje)).length
  }, [consultas])

  useEffect(() => {
    setDrawer(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Início',
      '/agenda': 'Agendamentos',
      '/medicos': 'Médicos',
      '/pacientes': 'Pacientes',
      '/configuracoes': 'Configurações',
    }
    document.title = `${titles[pathname] ?? 'Página'} · MedVoll`
  }, [pathname])

  return (
    <div className={`app ${isHome ? 'app--home' : ''}`}>
      {isHome && (
        <>
          {/* Foto à direita; o shader cobre a esquerda e se dissolve sobre ela. */}
          <div className="home-photo" aria-hidden />
          <Suspense fallback={<ShaderFallback />}>
            <ShaderBackground theme={resolved} animate={animatedBackground} />
          </Suspense>
        </>
      )}
      <Sidebar open={drawer} onNavigate={() => setDrawer(false)} counts={{ consultasHoje }} />

      <AnimatePresence>
        {drawer && (
          <motion.div className="scrim" onClick={() => setDrawer(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>

      <div className="main">
        <div className="mobilebar">
          <div className="mobilebar__brand">
            <img src={logoMark} alt="" /> MedVoll
          </div>
          <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
        </div>
        {/* Só animação de entrada: a nova página monta na hora, sem esperar a anterior sair. */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}


/** Tema efetivo, acompanhando a preferência do sistema quando "system". */
function useResolvedTheme(pref: Parameters<typeof resolveTheme>[0]) {
  const [resolved, setResolved] = useState(() => resolveTheme(pref))
  useEffect(() => {
    const apply = () => {
      const t = resolveTheme(pref)
      setResolved(t)
      document.documentElement.dataset.theme = t
    }
    apply()
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [pref])
  return resolved
}
