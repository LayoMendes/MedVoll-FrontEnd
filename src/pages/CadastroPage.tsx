import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
  UserX,
  Users,
} from 'lucide-react'
import { Avatar, EmptyState, PageHeader, Segmented, SourceNotice, SpecBadge } from '../components/ui'
import { PessoaForm, type Tipo } from '../components/PessoaForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { useData } from '../hooks/useData'
import { useConnection, useSettings } from '../hooks/useStores'
import { medicosService, pacientesService } from '../services/cadastros'
import { fonteAtual } from '../lib/connection'
import { maskPhone, normalize } from '../lib/format'
import { ESPECIALIDADES, type Atualizacao, type Especialidade, type Medico, type Paciente } from '../lib/types'

type Pessoa = Medico | Paciente
type Filtro = 'ativos' | 'inativos' | 'todos'

const CONFIG = {
  medico: {
    recurso: 'medicos' as const,
    service: medicosService,
    eyebrow: 'Corpo clínico',
    title: 'Médicos',
    description: 'Gerencie os profissionais da clínica: cadastre, edite dados de contato e inative registros.',
    novo: 'Novo médico',
    icon: Stethoscope,
    vazio: 'Nenhum médico encontrado',
  },
  paciente: {
    recurso: 'pacientes' as const,
    service: pacientesService,
    eyebrow: 'Atendimento',
    title: 'Pacientes',
    description: 'Mantenha a base de pacientes atualizada para agilizar os agendamentos.',
    novo: 'Novo paciente',
    icon: Users,
    vazio: 'Nenhum paciente encontrado',
  },
}

export default function CadastroPage({ tipo }: { tipo: Tipo }) {
  const cfg = CONFIG[tipo]
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  useSettings()
  useConnection() // re-renderiza quando a fonte de dados muda
  const fonte = fonteAtual(cfg.recurso)

  const { data, loading, error, reload } = useData<Pessoa[]>(() => cfg.service.listar(), [cfg.recurso])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const [esp, setEsp] = useState<Especialidade | ''>('')
  const [form, setForm] = useState<{ open: boolean; registro: Pessoa | null }>({ open: false, registro: null })
  const [excluir, setExcluir] = useState<Pessoa | null>(null)

  // Atalho vindo da tela inicial: /pacientes?novo=1
  useEffect(() => {
    if (params.get('novo')) {
      setForm({ open: true, registro: null })
      params.delete('novo')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const lista = useMemo(() => {
    const q = normalize(busca.trim())
    return (data ?? [])
      .filter((p) => (filtro === 'todos' ? true : filtro === 'ativos' ? p.ativo : !p.ativo))
      .filter((p) => (tipo === 'medico' && esp ? (p as Medico).especialidade === esp : true))
      .filter((p) => !q || normalize(`${p.nome} ${p.email} ${(p as Medico).crm ?? ''} ${p.telefone}`).includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [data, busca, filtro, esp, tipo])

  const totais = useMemo(() => {
    const all = data ?? []
    return { ativos: all.filter((x) => x.ativo).length, inativos: all.filter((x) => !x.ativo).length, todos: all.length }
  }, [data])

  async function criar(dados: Record<string, unknown>) {
    await cfg.service.cadastrar(dados as never)
    toast.success(`${tipo === 'medico' ? 'Médico' : 'Paciente'} cadastrado`, `${dados.nome} foi adicionado com sucesso.`)
  }

  async function atualizar(dados: Atualizacao) {
    await cfg.service.atualizar(dados)
    toast.success('Alterações salvas', `Os dados de ${dados.nome} foram atualizados.`)
  }

  async function confirmarExclusao() {
    if (!excluir) return
    try {
      await cfg.service.excluir(excluir.id)
      toast.success('Registro excluído', `${excluir.nome} foi inativado.`)
      setExcluir(null)
    } catch (e) {
      toast.error('Não foi possível excluir', e instanceof Error ? e.message : undefined)
    }
  }

  const Icon = cfg.icon

  return (
    <div className="page">
      <PageHeader
        eyebrow={cfg.eyebrow}
        icon={<Icon size={15} />}
        title={cfg.title}
        description={cfg.description}
        actions={
          <button className="btn btn--primary" onClick={() => setForm({ open: true, registro: null })}>
            <Plus size={18} /> {cfg.novo}
          </button>
        }
      />

      <SourceNotice fonte={fonte} recurso={cfg.title.toLowerCase()} />

      <div className="card toolbar">
        <div className="search">
          <Search size={18} />
          <input
            className="input"
            placeholder={tipo === 'medico' ? 'Buscar por nome, e-mail ou CRM…' : 'Buscar por nome, e-mail ou telefone…'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar"
          />
        </div>
        {tipo === 'medico' && (
          <select className="select" style={{ width: 200 }} value={esp} onChange={(e) => setEsp(e.target.value as Especialidade | '')} aria-label="Filtrar por especialidade">
            <option value="">Todas especialidades</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        )}
        <Segmented
          label="Situação"
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'ativos', label: <>Ativos <span className="muted">{totais.ativos}</span></> },
            { value: 'inativos', label: <>Inativos <span className="muted">{totais.inativos}</span></> },
            { value: 'todos', label: 'Todos' },
          ]}
        />
        <button className="icon-btn" onClick={reload} aria-label="Recarregar" title="Recarregar">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="alert alert--danger" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Falha ao carregar.</strong> {error}
          </div>
        </div>
      )}

      {loading && !data ? (
        <div className="people">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card person">
              <div className="person__top">
                <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 16 }} />
                <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '70%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 12, width: '85%' }} />
              <div className="skeleton" style={{ height: 12, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={busca || esp ? <Search size={30} /> : <Icon size={30} />}
            title={cfg.vazio}
            text={
              busca || esp
                ? 'Nenhum registro corresponde aos filtros aplicados. Tente outros termos.'
                : filtro === 'inativos'
                  ? 'Não há registros inativos.'
                  : `Comece cadastrando o primeiro ${tipo === 'medico' ? 'médico' : 'paciente'} da clínica.`
            }
            action={
              !busca && !esp && filtro !== 'inativos' ? (
                <button className="btn btn--primary" onClick={() => setForm({ open: true, registro: null })}>
                  <Plus size={18} /> {cfg.novo}
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <motion.div className="people" layout>
          <AnimatePresence initial={false}>
            {lista.map((p, i) => (
              <motion.article
                key={p.id}
                layout
                className={`card person ${p.ativo ? '' : 'is-inactive'}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.03, 0.3), duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              >
                <div className="person__top">
                  <Avatar name={p.nome} size={52} />
                  <div style={{ minWidth: 0 }}>
                    <h3 className="person__name" title={p.nome}>
                      {p.nome}
                    </h3>
                    <div className="person__sub">
                      {tipo === 'medico' ? (
                        <span className="row" style={{ gap: 6 }}>
                          <IdCard size={14} /> CRM <span className="mono">{(p as Medico).crm}</span>
                        </span>
                      ) : (
                        <span>Paciente #{p.id}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="person__meta">
                  <div>
                    <Mail size={15} />
                    <span title={p.email}>{p.email}</span>
                  </div>
                  <div>
                    <Phone size={15} />
                    <span>{maskPhone(p.telefone ?? '') || '—'}</span>
                  </div>
                  {p.endereco?.cidade && (
                    <div>
                      <MapPin size={15} />
                      <span>
                        {p.endereco.bairro ? `${p.endereco.bairro} · ` : ''}
                        {p.endereco.cidade}/{p.endereco.uf}
                      </span>
                    </div>
                  )}
                </div>

                <div className="person__foot">
                  {tipo === 'medico' ? (
                    <SpecBadge value={(p as Medico).especialidade} />
                  ) : p.ativo ? (
                    <span className="badge badge--success">
                      <BadgeCheck size={14} /> Ativo
                    </span>
                  ) : null}
                  {!p.ativo && (
                    <span className="badge badge--muted">
                      <UserX size={14} /> Inativo
                    </span>
                  )}
                  {p.ativo && (
                    <div className="person__actions">
                      <button className="icon-btn" onClick={() => setForm({ open: true, registro: p })} aria-label={`Editar ${p.nome}`} title="Editar">
                        <Pencil size={17} />
                      </button>
                      <button className="icon-btn icon-btn--danger" onClick={() => setExcluir(p)} aria-label={`Excluir ${p.nome}`} title="Excluir">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <PessoaForm
        tipo={tipo}
        open={form.open}
        registro={form.registro}
        onClose={() => setForm((s) => ({ ...s, open: false }))}
        onCreate={criar}
        onUpdate={atualizar}
      />

      <ConfirmDialog
        open={!!excluir}
        title={`Excluir ${tipo === 'medico' ? 'médico' : 'paciente'}?`}
        description="A exclusão é lógica: o registro fica inativo e deixa de aparecer nas listagens e agendamentos."
        onClose={() => setExcluir(null)}
        onConfirm={confirmarExclusao}
      >
        {excluir && (
          <div className="row" style={{ gap: 14 }}>
            <Avatar name={excluir.nome} />
            <div style={{ minWidth: 0 }}>
              <strong>{excluir.nome}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {excluir.email}
              </div>
            </div>
            {tipo === 'medico' ? (
              <span style={{ marginLeft: 'auto' }}>
                <SpecBadge value={(excluir as Medico).especialidade} />
              </span>
            ) : (
              <UserRound size={18} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
