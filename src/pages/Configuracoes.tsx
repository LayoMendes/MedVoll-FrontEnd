import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Cloud,
  Database,
  Info,
  Laptop,
  Loader2,
  MapPin,
  Moon,
  Palette,
  Plug,
  RefreshCw,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react'
import logoMark from '../assets/logo-mark.png'
import { PageHeader, Segmented, Switch } from '../components/ui'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { useConnection, useSettings } from '../hooks/useStores'
import { searchCities } from '../hooks/useWeather'
import { DEFAULT_SETTINGS, updateSettings, type CityPref, type DataMode, type ThemePref } from '../lib/settings'
import { probeApi, type EstadoRecurso } from '../lib/connection'
import { localDb } from '../lib/localdb'
import { dataBus } from '../lib/store'

type Tab = 'aparencia' | 'clima' | 'integracao' | 'dados' | 'sobre'

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'clima', label: 'Relógio e clima', icon: Cloud },
  { id: 'integracao', label: 'Integração com API', icon: Plug },
  { id: 'dados', label: 'Dados locais', icon: Database },
  { id: 'sobre', label: 'Sobre', icon: Info },
]

const ESTADO: Record<EstadoRecurso, { cls: string; label: string }> = {
  online: { cls: 'badge--success', label: 'Online' },
  offline: { cls: 'badge--warning', label: 'Offline' },
  indisponivel: { cls: 'badge--muted', label: 'Não implementado' },
  verificando: { cls: '', label: 'Verificando…' },
}

function Setting({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="setting">
      <div className="setting__text">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      {children}
    </div>
  )
}

function ThemePicker({ value }: { value: ThemePref }) {
  const opts: { id: ThemePref; label: string; icon: typeof Sun; pv: string }[] = [
    { id: 'light', label: 'Claro', icon: Sun, pv: 'pv-light' },
    { id: 'dark', label: 'Escuro', icon: Moon, pv: 'pv-dark' },
    { id: 'system', label: 'Sistema', icon: Laptop, pv: 'pv-system' },
  ]
  return (
    <div className="theme-cards" role="radiogroup" aria-label="Tema">
      {opts.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="theme-card" onClick={() => updateSettings({ theme: o.id })}>
          <div className={`theme-card__preview ${o.pv}`}>
            <div className="sb">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="ct">
              <i />
              <i style={{ width: '70%' }} />
              <i style={{ width: '85%' }} />
            </div>
          </div>
          <div className="theme-card__label">
            <o.icon size={16} /> {o.label}
          </div>
          {value === o.id && (
            <motion.span className="theme-card__check" layoutId="theme-check" transition={{ type: 'spring', stiffness: 500, damping: 34 }}>
              <Check size={14} strokeWidth={3} />
            </motion.span>
          )}
        </button>
      ))}
    </div>
  )
}

function CitySearch({ value }: { value: CityPref | null }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<CityPref[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) return setRes([])
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        setRes(await searchCities(q))
      } catch {
        setRes([])
      } finally {
        setBusy(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div style={{ display: 'grid', gap: 10, width: 'min(100%, 380px)' }}>
      <Segmented
        label="Origem da localização"
        value={value ? 'manual' : 'auto'}
        onChange={(v) => v === 'auto' && updateSettings({ city: null })}
        options={[
          { value: 'auto', label: 'Automática' },
          { value: 'manual', label: value ? value.name : 'Escolher cidade' },
        ]}
      />
      <div className="combo search">
        {busy ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
        <input className="input" placeholder="Buscar cidade (ex.: Recife)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cidade" />
        {res.length > 0 && (
          <div className="combo__list" role="listbox">
            {res.map((c) => (
              <button
                key={`${c.lat},${c.lon}`}
                type="button"
                role="option"
                aria-selected={false}
                className="combo__opt"
                onClick={() => {
                  updateSettings({ city: c })
                  setQ('')
                  setRes([])
                }}
              >
                <MapPin size={16} />
                <span>
                  {c.name}
                  <small>{[c.admin, c.country].filter(Boolean).join(' · ')}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Configuracoes() {
  const s = useSettings()
  const conn = useConnection()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('aparencia')
  const [apiUrl, setApiUrl] = useState(s.apiUrl)
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)
  const testing = Object.values(conn.recursos).includes('verificando')

  async function testar() {
    await probeApi()
    toast.info('Diagnóstico concluído', 'Status dos endpoints atualizado.')
  }

  function salvarUrl() {
    const v = apiUrl.trim() || DEFAULT_SETTINGS.apiUrl
    updateSettings({ apiUrl: v })
    setApiUrl(v)
    probeApi()
  }

  function setMode(m: DataMode) {
    updateSettings({ dataMode: m })
    probeApi()
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Sistema" icon={<SettingsIcon size={15} />} title="Configurações" description="Personalize a aparência, o relógio, a integração com a API e conheça o projeto." />

      <div className="settings">
        <nav className="card tabs-v" role="tablist" aria-label="Seções">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab-v" onClick={() => setTab(t.id)}>
              {tab === t.id && <motion.span layoutId="tab-bg" className="tab-v__bg" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </nav>

        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          {tab === 'aparencia' && (
            <>
              <section className="card setting-group">
                <h3 className="setting-group__title">Tema</h3>
                <p className="setting-group__desc">Escolha entre modo claro, escuro ou seguir o sistema operacional.</p>
                <ThemePicker value={s.theme} />
              </section>
              <section className="card setting-group">
                <h3 className="setting-group__title">Interface</h3>
                <Setting title="Fundo animado na tela inicial" text="Shader gradient em movimento. Desative para economizar bateria.">
                  <Switch checked={s.animatedBackground} onChange={(v) => updateSettings({ animatedBackground: v })} label="Fundo animado" />
                </Setting>
                <Setting title="Menu lateral recolhido" text="Exibe apenas os ícones na barra lateral.">
                  <Switch checked={s.sidebarCollapsed} onChange={(v) => updateSettings({ sidebarCollapsed: v })} label="Menu recolhido" />
                </Setting>
                <Setting title="Nome da clínica" text="Exibido abaixo da marca no menu lateral.">
                  <input className="input" style={{ maxWidth: 280 }} value={s.clinicName} maxLength={40} onChange={(e) => updateSettings({ clinicName: e.target.value })} aria-label="Nome da clínica" />
                </Setting>
              </section>
            </>
          )}

          {tab === 'clima' && (
            <section className="card setting-group">
              <h3 className="setting-group__title">Relógio e clima</h3>
              <p className="setting-group__desc">Dados meteorológicos fornecidos pela Open-Meteo, sem necessidade de chave.</p>
              <Setting title="Exibir segundos" text="Mostra os segundos no relógio da tela inicial e dos cabeçalhos.">
                <Switch checked={s.showSeconds} onChange={(v) => updateSettings({ showSeconds: v })} label="Exibir segundos" />
              </Setting>
              <Setting title="Unidade de temperatura" text="Celsius ou Fahrenheit.">
                <Segmented
                  label="Unidade"
                  value={s.tempUnit}
                  onChange={(v) => updateSettings({ tempUnit: v })}
                  options={[
                    { value: 'C', label: '°C' },
                    { value: 'F', label: '°F' },
                  ]}
                />
              </Setting>
              <Setting title="Localização" text="Automática usa a geolocalização do navegador. Se negada, utiliza São Paulo.">
                <CitySearch value={s.city} />
              </Setting>
            </section>
          )}

          {tab === 'integracao' && (
            <>
              <section className="card setting-group">
                <h3 className="setting-group__title">Conexão</h3>
                <p className="setting-group__desc">
                  Em desenvolvimento, <span className="kbd">/api</span> é encaminhado pelo Vite para <span className="kbd">http://localhost:8080</span>, evitando CORS.
                </p>
                <Setting title="URL base da API" text="Use /api (proxy) ou um endereço com CORS habilitado.">
                  <div className="row" style={{ width: 'min(100%, 380px)' }}>
                    <input className="input mono" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvarUrl()} aria-label="URL base da API" />
                    <button className="btn btn--ghost" onClick={salvarUrl} disabled={apiUrl === s.apiUrl}>
                      Salvar
                    </button>
                  </div>
                </Setting>
                <Setting title="Fonte de dados" text="Automático usa a API quando o endpoint responde e o modo local nos demais casos.">
                  <Segmented
                    label="Fonte de dados"
                    value={s.dataMode}
                    onChange={setMode}
                    options={[
                      { value: 'auto', label: <><Zap size={14} /> Auto</> },
                      { value: 'api', label: 'Só API' },
                      { value: 'local', label: 'Local' },
                    ]}
                  />
                </Setting>
              </section>

              <section className="card setting-group">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div>
                    <h3 className="setting-group__title">Endpoints</h3>
                    <p className="setting-group__desc">
                      {conn.verificadoEm ? `Última verificação às ${conn.verificadoEm.toLocaleTimeString('pt-BR')}` : 'Ainda não verificado'}
                    </p>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={testar} disabled={testing}>
                    <RefreshCw size={15} className={testing ? 'spin' : ''} /> Testar conexão
                  </button>
                </div>
                {(
                  [
                    { key: 'medicos', path: '/medicos', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
                    { key: 'pacientes', path: '/pacientes', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
                    { key: 'consultas', path: '/consultas', methods: ['POST', 'DELETE'] },
                  ] as const
                ).map((e) => {
                  const st = ESTADO[conn.recursos[e.key]]
                  return (
                    <div key={e.key} className="endpoint">
                      <span className="mono" style={{ fontWeight: 600 }}>
                        {e.path}
                      </span>
                      <span className="method">
                        {e.methods.map((m) => (
                          <b key={m}>{m}</b>
                        ))}
                      </span>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                  )
                })}
              </section>
            </>
          )}

          {tab === 'dados' && (
            <section className="card setting-group">
              <h3 className="setting-group__title">Dados locais</h3>
              <p className="setting-group__desc">Registros salvos neste navegador quando a API não está disponível, além da agenda de consultas.</p>
              <Setting title="Restaurar dados de demonstração" text="Recria médicos, pacientes e consultas de exemplo.">
                <button className="btn btn--ghost" onClick={() => setConfirm('reset')}>
                  <RotateCcw size={16} /> Restaurar
                </button>
              </Setting>
              <Setting title="Apagar dados locais" text="Remove todos os registros salvos neste navegador. Não afeta a API.">
                <button className="btn btn--ghost" style={{ color: 'var(--danger)' }} onClick={() => setConfirm('clear')}>
                  <Trash2 size={16} /> Apagar
                </button>
              </Setting>
              <Setting title="Restaurar preferências" text="Volta tema, relógio e integração para o padrão.">
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    updateSettings(DEFAULT_SETTINGS)
                    setApiUrl(DEFAULT_SETTINGS.apiUrl)
                    probeApi()
                    toast.success('Preferências restauradas')
                  }}
                >
                  <RotateCcw size={16} /> Padrão
                </button>
              </Setting>
            </section>
          )}

          {tab === 'sobre' && (
            <>
              <section className="card about">
                <img src={logoMark} alt="" />
                <div>
                  <h2>MedVoll</h2>
                  <p>Gestão de clínica: cadastro de médicos e pacientes e agenda de consultas. Front-end da API REST MedVoll (Spring Boot).</p>
                </div>
              </section>

              <section className="card setting-group">
                <h3 className="setting-group__title">Detalhes</h3>
                <dl className="kv">
                  <dt>Versão</dt>
                  <dd>1.0.0</dd>
                  <dt>Funcionalidades</dt>
                  <dd>Médicos (CRM e especialidade), pacientes com busca de endereço por CEP, agenda com horário de funcionamento, conflitos e cancelamento com motivo.</dd>
                  <dt>Dados</dt>
                  <dd>Usa a API quando ela responde; caso contrário, salva neste navegador.</dd>
                  <dt>Tecnologias</dt>
                  <dd>React, TypeScript, Vite, Framer Motion, ShaderGradient, Lucide, Open-Meteo, ViaCEP</dd>
                </dl>
                <Setting title="Atalhos" text="Pressione Esc para fechar janelas; use Tab para navegar pelos campos.">
                  <span className="kbd">Esc</span>
                </Setting>
              </section>
            </>
          )}
        </motion.div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'reset' ? 'Restaurar dados de demonstração?' : 'Apagar dados locais?'}
        description={
          confirm === 'reset'
            ? 'Os registros locais atuais serão substituídos pelos dados de exemplo.'
            : 'Todos os médicos, pacientes e consultas salvos neste navegador serão removidos.'
        }
        confirmLabel={confirm === 'reset' ? 'Restaurar' : 'Apagar tudo'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'reset') localDb.reset()
          else localDb.clear()
          ;['medicos', 'pacientes', 'consultas'].forEach((k) => dataBus.emit(k))
          toast.success(confirm === 'reset' ? 'Dados de demonstração restaurados' : 'Dados locais apagados')
          setConfirm(null)
        }}
      />
    </div>
  )
}
