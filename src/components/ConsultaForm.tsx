import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CalendarPlus, Check, Info, Loader2, Search } from 'lucide-react'
import { Modal } from './Modal'
import { Avatar, Field, SpecBadge } from './ui'
import { useToast } from './Toast'
import { consultasService, escolherMedicoLivre, validarAgendamento } from '../services/consultas'
import { CLINICA, horariosDoDia } from '../lib/time'
import { normalize, pad, parseLocalIso, sameDay, toDateKey } from '../lib/format'
import { ESPECIALIDADES, type Consulta, type Especialidade, type Medico, type Paciente } from '../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  medicos: Medico[]
  pacientes: Paciente[]
  consultas: Consulta[]
  inicial?: { data?: string; hora?: number }
}

function PacienteCombo({ pacientes, value, onChange }: { pacientes: Paciente[]; value: Paciente | null; onChange: (p: Paciente | null) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hl, setHl] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const lista = useMemo(() => {
    const n = normalize(q)
    return pacientes.filter((p) => p.ativo && (!n || normalize(`${p.nome} ${p.email}`).includes(n))).slice(0, 30)
  }, [pacientes, q])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (p: Paciente) => {
    onChange(p)
    setQ('')
    setOpen(false)
  }

  if (value)
    return (
      <div className="input row" style={{ height: 'auto', minHeight: 46, padding: '8px 8px 8px 10px' }}>
        <Avatar name={value.nome} size={30} />
        <div style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{value.nome}</div>
          <div className="muted" style={{ fontSize: 12 }}>{value.email}</div>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(null)}>
          Trocar
        </button>
      </div>
    )

  return (
    <div className="combo search" ref={ref}>
      <Search size={18} />
      <input
        id="c-paciente"
        className="input"
        placeholder="Buscar paciente por nome ou e-mail…"
        value={q}
        role="combobox"
        aria-expanded={open}
        aria-controls="c-paciente-list"
        aria-autocomplete="list"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setHl(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHl((h) => Math.min(h + 1, lista.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHl((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter' && open && lista[hl]) {
            e.preventDefault()
            pick(lista[hl]!)
          }
        }}
      />
      {open && (
        <div className="combo__list" role="listbox" id="c-paciente-list">
          {lista.length === 0 ? (
            <div className="combo__empty">Nenhum paciente ativo encontrado.</div>
          ) : (
            lista.map((p, i) => (
              <button type="button" key={p.id} role="option" aria-selected={i === hl} className="combo__opt" onMouseEnter={() => setHl(i)} onClick={() => pick(p)}>
                <Avatar name={p.nome} size={30} />
                <span>
                  {p.nome}
                  <small>{p.email}</small>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function ConsultaForm({ open, onClose, medicos, pacientes, consultas, inicial }: Props) {
  const toast = useToast()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [especialidade, setEspecialidade] = useState<Especialidade | ''>('')
  const [medicoId, setMedicoId] = useState<string>('')
  const [data, setData] = useState(toDateKey(new Date()))
  const [hora, setHora] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setPaciente(null)
    setEspecialidade('')
    setMedicoId('')
    setData(inicial?.data ?? toDateKey(new Date()))
    setHora(inicial?.hora ?? null)
    setErro(null)
  }, [open, inicial])

  const medicosAtivos = useMemo(
    () => medicos.filter((m) => m.ativo && (!especialidade || m.especialidade === especialidade)).sort((a, b) => a.nome.localeCompare(b.nome)),
    [medicos, especialidade],
  )
  const medico = medicos.find((m) => String(m.id) === medicoId) ?? null

  useEffect(() => {
    if (medico && especialidade && medico.especialidade !== especialidade) setMedicoId('')
  }, [especialidade, medico])

  const dia = useMemo(() => {
    const [y, m, d] = data.split('-').map(Number)
    return new Date(y!, m! - 1, d!)
  }, [data])

  const slotStatus = (h: number): string | null => {
    const dt = new Date(dia)
    dt.setHours(h, 0, 0, 0)
    if (dia.getDay() === 0) return 'Domingo'
    if (dt.getTime() - Date.now() < CLINICA.antecedenciaMin * 60_000) return 'Indisponível'
    const ag = consultas.filter((c) => c.status === 'AGENDADA')
    if (paciente && ag.some((c) => c.idPaciente === paciente.id && sameDay(parseLocalIso(c.data), dt))) return 'Paciente já agendado no dia'
    if (medico && ag.some((c) => c.idMedico === medico.id && parseLocalIso(c.data).getTime() === dt.getTime())) return 'Médico ocupado'
    if (!medico && especialidade && !escolherMedicoLivre(medicos, especialidade, dt, consultas)) return 'Sem médicos livres'
    return null
  }

  useEffect(() => {
    if (hora !== null && slotStatus(hora)) setHora(null)
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!paciente) return setErro('Selecione o paciente.')
    if (!medico && !especialidade) return setErro('Selecione um médico ou, ao menos, a especialidade desejada.')
    if (hora === null) return setErro('Escolha um horário disponível.')
    const dt = new Date(dia)
    dt.setHours(hora, 0, 0, 0)
    const escolhido = medico ?? escolherMedicoLivre(medicos, especialidade, dt, consultas)
    if (!escolhido) return setErro('Nenhum médico da especialidade está disponível neste horário.')
    const msg = validarAgendamento({ data: dt, medico: escolhido, paciente, consultas })
    if (msg) return setErro(msg)

    setBusy(true)
    try {
      const nova = await consultasService.agendar(
        { idMedico: escolhido.id, idPaciente: paciente.id, data: `${data}T${pad(hora)}:00`, especialidade: escolhido.especialidade },
        escolhido,
        paciente,
      )
      toast.success('Consulta agendada', `${paciente.nome} com ${escolhido.nome} em ${dt.toLocaleDateString('pt-BR')} às ${pad(hora)}:00.`)
      if (!nova.sincronizada) toast.info('Agenda salva localmente', 'A API não respondeu; o agendamento foi salvo neste navegador.')
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível agendar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Nova consulta"
      description="Atendimento de segunda a sábado, das 07:00 às 19:00. Consultas de 1 hora."
      icon={<CalendarPlus size={20} />}
      width={720}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="consulta-form" className="btn btn--primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            Confirmar agendamento
          </button>
        </>
      }
    >
      <form id="consulta-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Paciente" required className="col-12" htmlFor="c-paciente">
          <PacienteCombo pacientes={pacientes} value={paciente} onChange={setPaciente} />
        </Field>

        <Field label="Especialidade" className="col-6" htmlFor="c-esp" hint="Opcional se escolher o médico">
          <select id="c-esp" className="select" value={especialidade} onChange={(e) => setEspecialidade(e.target.value as Especialidade | '')}>
            <option value="">Todas</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Médico" className="col-6" htmlFor="c-med" hint={!medicoId && especialidade ? 'Um médico livre será escolhido automaticamente' : undefined}>
          <select id="c-med" className="select" value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
            <option value="">{especialidade ? 'Qualquer médico disponível' : 'Selecione…'}</option>
            {medicosAtivos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} — {ESPECIALIDADES.find((x) => x.value === m.especialidade)?.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data" required className="col-4" htmlFor="c-data">
          <input id="c-data" type="date" className="input" value={data} min={toDateKey(new Date())} onChange={(e) => e.target.value && setData(e.target.value)} />
        </Field>

        <div className="field col-8">
          <span className="field__label">
            Horário <span className="req">*</span>
          </span>
          <div className="slots-pick" role="group" aria-label="Horários">
            {horariosDoDia().map((h) => {
              const st = slotStatus(h)
              return (
                <button key={h} type="button" className="slot-chip" aria-pressed={hora === h} disabled={!!st} title={st ?? 'Disponível'} onClick={() => setHora(h)}>
                  {pad(h)}:00
                </button>
              )
            })}
          </div>
          {dia.getDay() === 0 && <span className="field__error">A clínica não funciona aos domingos.</span>}
        </div>

        {(medico || (especialidade && !medico)) && (
          <div className="col-12 alert" style={{ marginBottom: 0 }}>
            <Info size={18} />
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              {medico ? (
                <>
                  <strong>{medico.nome}</strong> <SpecBadge value={medico.especialidade} />
                </>
              ) : (
                <>
                  Será escolhido um médico livre de <SpecBadge value={especialidade as Especialidade} />
                </>
              )}
            </div>
          </div>
        )}

        {erro && (
          <div className="col-12 alert alert--danger" role="alert" style={{ marginBottom: 0 }}>
            <AlertTriangle size={18} />
            <div>{erro}</div>
          </div>
        )}
      </form>
    </Modal>
  )
}
