import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudOff,
  Plus,
  Stethoscope,
  XCircle,
} from 'lucide-react'
import { Avatar, EmptyState, PageHeader, SPEC_META, SpecBadge } from '../components/ui'
import { ConsultaForm } from '../components/ConsultaForm'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { useData } from '../hooks/useData'
import { useNow } from '../hooks/useNow'
import { medicosService, pacientesService } from '../services/cadastros'
import { consultasService } from '../services/consultas'
import { addDays, CLINICA, horariosDoDia, startOfWeek } from '../lib/time'
import { fmtLongDate, fmtShortDate, fmtTime, pad, parseLocalIso, sameDay, toDateKey } from '../lib/format'
import { MOTIVOS, type Consulta, type MotivoCancelamento } from '../lib/types'

const DOW = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function Agenda() {
  const now = useNow(30_000)
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const consultas = useData(() => consultasService.listar(), ['consultas'])
  const medicos = useData(() => medicosService.listar(), ['medicos'])
  const pacientes = useData(() => pacientesService.listar(), ['pacientes'])

  const [selecionado, setSelecionado] = useState(() => new Date())
  const [semana, setSemana] = useState(() => startOfWeek(new Date()))
  const [form, setForm] = useState<{ open: boolean; inicial?: { data?: string; hora?: number } }>({ open: false })
  const [cancelar, setCancelar] = useState<Consulta | null>(null)
  const [motivo, setMotivo] = useState<MotivoCancelamento>('PACIENTE_DESISTIU')
  const [cancelBusy, setCancelBusy] = useState(false)

  useEffect(() => {
    if (params.get('novo')) {
      setForm({ open: true })
      params.delete('novo')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const lista = consultas.data ?? []
  const ativas = lista.filter((c) => c.status === 'AGENDADA')
  const dias = Array.from({ length: 7 }, (_, i) => addDays(semana, i))

  const doDia = useMemo(
    () => lista.filter((c) => sameDay(parseLocalIso(c.data), selecionado)).sort((a, b) => a.data.localeCompare(b.data)),
    [lista, selecionado],
  )

  const proximas = useMemo(
    () => ativas.filter((c) => parseLocalIso(c.data).getTime() + CLINICA.duracaoMin * 60_000 > now.getTime()).slice(0, 8),
    [ativas, now],
  )

  const stats = useMemo(() => {
    const ini = startOfWeek(now)
    const fim = addDays(ini, 7)
    return {
      hoje: ativas.filter((c) => sameDay(parseLocalIso(c.data), now)).length,
      semana: ativas.filter((c) => {
        const d = parseLocalIso(c.data)
        return d >= ini && d < fim
      }).length,
      proxima: proximas[0],
      canceladas: lista.filter((c) => c.status === 'CANCELADA').length,
    }
  }, [ativas, lista, now, proximas])

  const irPara = (d: Date) => {
    setSelecionado(d)
    setSemana(startOfWeek(d))
  }

  async function confirmarCancelamento() {
    if (!cancelar) return
    setCancelBusy(true)
    try {
      await consultasService.cancelar(cancelar.id, motivo)
      toast.success('Consulta cancelada', `${cancelar.pacienteNome} · ${fmtShortDate(parseLocalIso(cancelar.data))} às ${fmtTime(parseLocalIso(cancelar.data))}`)
      setCancelar(null)
    } catch (e) {
      toast.error('Não foi possível cancelar', e instanceof Error ? e.message : undefined)
    } finally {
      setCancelBusy(false)
    }
  }

  const isToday = sameDay(selecionado, now)
  const isSunday = selecionado.getDay() === 0

  return (
    <div className="page">
      <PageHeader
        eyebrow="Agenda da clínica"
        icon={<CalendarClock size={15} />}
        title="Agendamentos"
        description="Visualize a agenda diária, marque novas consultas e gerencie cancelamentos."
        actions={
          <button className="btn btn--primary" onClick={() => setForm({ open: true, inicial: { data: toDateKey(selecionado) } })}>
            <CalendarPlus size={18} /> Nova consulta
          </button>
        }
      />

      <div className="stats">
        {[
          { icon: CalendarCheck2, value: stats.hoje, label: 'Consultas hoje' },
          { icon: CalendarDays, value: stats.semana, label: 'Nesta semana' },
          {
            icon: Clock3,
            value: stats.proxima ? fmtTime(parseLocalIso(stats.proxima.data)) : '—',
            label: stats.proxima ? `Próxima · ${sameDay(parseLocalIso(stats.proxima.data), now) ? 'hoje' : fmtShortDate(parseLocalIso(stats.proxima.data))}` : 'Sem próximas consultas',
          },
          { icon: CalendarX2, value: stats.canceladas, label: 'Canceladas' },
        ].map((s, i) => (
          <motion.div
            key={s.label + i}
            className="card stat"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="stat__icon">
              <s.icon size={22} />
            </div>
            <div>
              <div className="stat__value">{s.value}</div>
              <div className="stat__label">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="agenda">
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <div className="card week">
            <button className="icon-btn" onClick={() => setSemana((s) => addDays(s, -7))} aria-label="Semana anterior">
              <ChevronLeft size={20} />
            </button>
            <div className="week__days" role="tablist" aria-label="Dias da semana">
              {dias.map((d, i) => {
                const sel = sameDay(d, selecionado)
                const qtd = ativas.filter((c) => sameDay(parseLocalIso(c.data), d)).length
                return (
                  <button
                    key={toDateKey(d)}
                    role="tab"
                    aria-selected={sel}
                    className={`day ${sel ? 'is-selected' : ''} ${sameDay(d, now) ? 'is-today' : ''} ${d.getDay() === 0 ? 'is-closed' : ''}`}
                    onClick={() => setSelecionado(d)}
                    aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${qtd} consultas`}
                  >
                    {sel && <motion.span layoutId="day-sel" className="day__bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <span className="day__dow">{DOW[i]}</span>
                    <span className="day__num">{d.getDate()}</span>
                    {qtd > 0 && (
                      <span className="day__count" aria-hidden>
                        {Array.from({ length: Math.min(qtd, 4) }).map((_, k) => (
                          <i key={k} />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <button className="icon-btn" onClick={() => setSemana((s) => addDays(s, 7))} aria-label="Próxima semana">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <h2 className="card__title">{fmtLongDate(selecionado)}</h2>
                <div className="muted" style={{ fontSize: 13 }}>
                  {isSunday ? 'Clínica fechada' : `${doDia.filter((c) => c.status === 'AGENDADA').length} consulta(s) · 07:00 às 19:00`}
                </div>
              </div>
              {!isToday && (
                <button className="btn btn--ghost btn--sm" onClick={() => irPara(new Date())}>
                  Hoje
                </button>
              )}
            </div>

            {isSunday ? (
              <EmptyState icon={<CalendarX2 size={30} />} title="Domingo sem atendimento" text="A clínica funciona de segunda a sábado. Escolha outro dia para agendar." />
            ) : (
              <div className="timeline">
                {horariosDoDia().map((h) => {
                  const slotDate = new Date(selecionado)
                  slotDate.setHours(h, 0, 0, 0)
                  const doSlot = doDia.filter((c) => parseLocalIso(c.data).getHours() === h)
                  const passado = slotDate.getTime() - now.getTime() < CLINICA.antecedenciaMin * 60_000
                  return (
                    <div key={h} className={`slot ${passado ? 'is-past' : ''}`}>
                      {isToday && now.getHours() === h && (
                        <div className="now-line" style={{ top: `${(now.getMinutes() / 60) * 100}%` }} aria-label={`Agora, ${fmtTime(now)}`} />
                      )}
                      <div className="slot__time">{pad(h)}:00</div>
                      <div className="slot__body">
                        <AnimatePresence initial={false}>
                          {doSlot.map((c) => (
                            <motion.div
                              key={c.id}
                              layout
                              className={`appt ${c.status === 'CANCELADA' ? 'is-cancelled' : ''}`}
                              style={{ ['--c' as string]: SPEC_META[c.especialidade]?.color }}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: c.status === 'CANCELADA' ? 0.6 : 1, x: 0 }}
                              exit={{ opacity: 0 }}
                            >
                              <Avatar name={c.pacienteNome} size={38} />
                              <div className="appt__main">
                                <div className="appt__title">{c.pacienteNome}</div>
                                <div className="appt__sub">
                                  <span className="row" style={{ gap: 5 }}>
                                    <Stethoscope size={13} /> {c.medicoNome}
                                  </span>
                                  <span>
                                    {fmtTime(parseLocalIso(c.data))}–{fmtTime(new Date(parseLocalIso(c.data).getTime() + CLINICA.duracaoMin * 60_000))}
                                  </span>
                                  {!c.sincronizada && c.status === 'AGENDADA' && (
                                    <span className="row" style={{ gap: 4 }} title="Salva apenas neste navegador">
                                      <CloudOff size={12} /> local
                                    </span>
                                  )}
                                </div>
                              </div>
                              {c.status === 'CANCELADA' ? (
                                <span className="badge badge--danger">Cancelada</span>
                              ) : (
                                <>
                                  <SpecBadge value={c.especialidade} />
                                  <button className="icon-btn icon-btn--danger" onClick={() => { setMotivo('PACIENTE_DESISTIU'); setCancelar(c) }} aria-label={`Cancelar consulta de ${c.pacienteNome}`} title="Cancelar consulta">
                                    <XCircle size={18} />
                                  </button>
                                </>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {!passado && doSlot.every((c) => c.status === 'CANCELADA') && (
                          <button className="slot__free" onClick={() => setForm({ open: true, inicial: { data: toDateKey(selecionado), hora: h } })}>
                            <Plus size={15} /> Agendar às {pad(h)}:00
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="card" style={{ position: 'sticky', top: 24 }}>
          <div className="card__head" style={{ paddingBottom: 8 }}>
            <h2 className="card__title">Próximas consultas</h2>
            <span className="badge">{proximas.length}</span>
          </div>
          {proximas.length === 0 ? (
            <EmptyState icon={<CalendarCheck2 size={28} />} title="Agenda livre" text="Nenhuma consulta futura agendada." />
          ) : (
            <div className="upcoming">
              {proximas.map((c) => {
                const d = parseLocalIso(c.data)
                return (
                  <button key={c.id} className="upcoming__item" onClick={() => irPara(d)}>
                    <div className="datebox">
                      <b>{d.getDate()}</b>
                      <span>{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.pacienteNome}</div>
                      <div className="muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fmtTime(d)} · {c.medicoNome}
                      </div>
                    </div>
                    <span className="dot" style={{ background: SPEC_META[c.especialidade]?.color }} />
                  </button>
                )
              })}
            </div>
          )}
        </aside>
      </div>

      <ConsultaForm
        open={form.open}
        inicial={form.inicial}
        onClose={() => setForm({ open: false })}
        medicos={medicos.data ?? []}
        pacientes={pacientes.data ?? []}
        consultas={lista}
      />

      <Modal
        open={!!cancelar}
        onClose={cancelBusy ? () => {} : () => setCancelar(null)}
        title="Cancelar consulta"
        description={`Cancelamentos exigem ${CLINICA.cancelamentoHoras}h de antecedência e um motivo.`}
        icon={<CalendarX2 size={20} />}
        tone="danger"
        width={500}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setCancelar(null)} disabled={cancelBusy}>
              Voltar
            </button>
            <button className="btn btn--danger" onClick={confirmarCancelamento} disabled={cancelBusy}>
              <XCircle size={16} /> Cancelar consulta
            </button>
          </>
        }
      >
        {cancelar && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div className="row" style={{ gap: 14 }}>
              <Avatar name={cancelar.pacienteNome} />
              <div style={{ minWidth: 0 }}>
                <strong>{cancelar.pacienteNome}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {fmtLongDate(parseLocalIso(cancelar.data))} às {fmtTime(parseLocalIso(cancelar.data))} · {cancelar.medicoNome}
                </div>
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="motivo">
                Motivo <span className="req">*</span>
              </label>
              <select id="motivo" className="select" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoCancelamento)} data-autofocus>
                {MOTIVOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
