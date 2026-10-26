import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Compass } from 'lucide-react'
import './styles/global.css'
import './styles/typography.css'
import './styles/glass.css'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/Toast'
import { EmptyState } from './components/ui'
import { probeApi } from './lib/connection'
import Home from './pages/Home'

const Agenda = lazy(() => import('./pages/Agenda'))
const CadastroPage = lazy(() => import('./pages/CadastroPage'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))

probeApi()

function NotFound() {
  return (
    <div className="page">
      <div className="card" style={{ marginTop: 40 }}>
        <EmptyState
          icon={<Compass size={30} />}
          title="Página não encontrada"
          text="O endereço acessado não existe ou foi movido."
          action={
            <Link to="/" className="btn btn--primary">
              Voltar ao início
            </Link>
          }
        />
      </div>
    </div>
  )
}

const page = (el: React.ReactNode) => <Suspense fallback={<div className="page" />}>{el}</Suspense>

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="agenda" element={page(<Agenda />)} />
            <Route path="medicos" element={page(<CadastroPage key="medico" tipo="medico" />)} />
            <Route path="pacientes" element={page(<CadastroPage key="paciente" tipo="paciente" />)} />
            <Route path="configuracoes" element={page(<Configuracoes />)} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
