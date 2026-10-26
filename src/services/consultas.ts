import { ApiError, http } from '../lib/http'
import { fonteDe, markOffline } from '../lib/connection'
import { localDb } from '../lib/localdb'
import { settingsStore } from '../lib/settings'
import { dataBus } from '../lib/store'
import { CLINICA } from '../lib/time'
import { parseLocalIso, sameDay } from '../lib/format'
import type { Consulta, ConsultaCadastro, Especialidade, Medico, MotivoCancelamento, Page, Paciente } from '../lib/types'

/**
 * Agendamentos.
 * Com a API disponível, a agenda vem dela; o navegador guarda só uma cópia e as consultas
 * criadas enquanto a API estava fora do ar (essas continuam aparecendo, marcadas como locais).
 *   GET    /consultas?size&sort -> Page<DadosDetalhamentoConsulta>
 *   POST   /consultas  { idMedico, idPaciente, data, especialidade } -> DadosDetalhamentoConsulta
 *   DELETE /consultas  { idConsulta, motivo }
 */

const ativas = (l: Consulta[]) => l.filter((c) => c.status === 'AGENDADA')

export interface ValidacaoAgenda {
  data: Date
  medico?: Medico | null
  paciente: Paciente
  consultas: Consulta[]
}

/** Regras de negócio da clínica. Retorna a mensagem de erro ou null. */
export function validarAgendamento({ data, medico, paciente, consultas }: ValidacaoAgenda): string | null {
  const now = new Date()
  if (Number.isNaN(data.getTime())) return 'Informe uma data e horário válidos.'
  if (data.getDay() === 0) return 'A clínica não funciona aos domingos.'
  const h = data.getHours()
  if (h < CLINICA.abertura || h >= CLINICA.fechamento) return 'Horário fora do funcionamento da clínica (07:00 às 19:00).'
  if (data.getTime() - now.getTime() < CLINICA.antecedenciaMin * 60_000)
    return `A consulta deve ser agendada com no mínimo ${CLINICA.antecedenciaMin} minutos de antecedência.`
  if (!paciente.ativo) return 'Paciente inativo não pode ter consultas agendadas.'
  if (medico && !medico.ativo) return 'Médico inativo não pode receber consultas.'
  const lista = ativas(consultas)
  if (lista.some((c) => c.idPaciente === paciente.id && sameDay(parseLocalIso(c.data), data)))
    return 'Este paciente já possui uma consulta neste dia.'
  if (medico && lista.some((c) => c.idMedico === medico.id && conflita(parseLocalIso(c.data), data)))
    return 'O médico já possui outra consulta neste horário.'
  return null
}

const conflita = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) < CLINICA.duracaoMin * 60_000

/** Escolhe aleatoriamente um médico livre da especialidade (regra quando o médico não é informado). */
export function escolherMedicoLivre(medicos: Medico[], especialidade: string, data: Date, consultas: Consulta[]) {
  const ocupados = new Set(ativas(consultas).filter((c) => conflita(parseLocalIso(c.data), data)).map((c) => c.idMedico))
  const livres = medicos.filter((m) => m.ativo && m.especialidade === especialidade && !ocupados.has(m.id))
  return livres.length ? livres[Math.floor(Math.random() * livres.length)]! : null
}

/** DadosDetalhamentoConsulta da API */
interface ConsultaApi {
  id: number
  idMedico: number
  medicoNome: string
  idPaciente: number
  pacienteNome: string
  especialidade: Especialidade
  /** yyyy-MM-ddTHH:mm:ss */
  data: string
  ativo: boolean
  motivoCancelamento: MotivoCancelamento | null
}

const daApi = (c: ConsultaApi): Consulta => ({
  id: `api-${c.id}`,
  idApi: c.id,
  idMedico: c.idMedico,
  idPaciente: c.idPaciente,
  medicoNome: c.medicoNome,
  pacienteNome: c.pacienteNome,
  especialidade: c.especialidade,
  data: c.data.slice(0, 16),
  status: c.ativo ? 'AGENDADA' : 'CANCELADA',
  motivoCancelamento: c.motivoCancelamento ?? undefined,
  criadaEm: '',
  sincronizada: true,
})

async function listarDaApi(): Promise<Consulta[]> {
  const todas: Consulta[] = []
  for (let pagina = 0; ; pagina++) {
    const page = await http<Page<ConsultaApi>>(`/consultas?size=500&sort=data&page=${pagina}`)
    todas.push(...page.content.map(daApi))
    if (pagina + 1 >= page.totalPages) return todas
  }
}

const porData = (l: Consulta[]) => l.sort((a, b) => a.data.localeCompare(b.data))

export const consultasService = {
  /** Agenda completa: as consultas da API (quando online) mais as que só existem neste navegador. */
  async listar(): Promise<Consulta[]> {
    const locais = localDb.read('consultas')
    if ((await fonteDe('consultas')) === 'local') return porData([...locais])
    try {
      const daApi = await listarDaApi()
      return porData([...daApi, ...locais.filter((c) => c.idApi == null)])
    } catch (e) {
      if (e instanceof ApiError && e.offline && settingsStore.get().dataMode === 'auto') {
        markOffline('consultas')
        return porData([...locais])
      }
      throw e
    }
  },

  async agendar(dados: ConsultaCadastro, medico: Medico, paciente: Paciente): Promise<Consulta> {
    // valida contra a agenda inteira (API + locais), não só a cópia deste navegador
    const consultas = await consultasService.listar()
    const erro = validarAgendamento({ data: parseLocalIso(dados.data), medico, paciente, consultas })
    if (erro) throw new ApiError(erro, 400)

    let sincronizada = false
    let idApi: number | undefined
    if ((await fonteDe('consultas')) === 'api') {
      try {
        const criada = await http<{ id?: number } | undefined>('/consultas', {
          method: 'POST',
          body: { idMedico: medico.id, idPaciente: paciente.id, data: dados.data, especialidade: medico.especialidade },
        })
        sincronizada = true
        idApi = criada?.id
      } catch (e) {
        if (e instanceof ApiError && !e.offline && !e.unsupported) throw e
      }
    }

    const nova: Consulta = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      idMedico: medico.id,
      idPaciente: paciente.id,
      medicoNome: medico.nome,
      pacienteNome: paciente.nome,
      especialidade: medico.especialidade,
      data: dados.data,
      status: 'AGENDADA',
      criadaEm: new Date().toISOString(),
      sincronizada,
      idApi,
    }
    localDb.write('consultas', [...localDb.read('consultas'), nova])
    dataBus.emit('consultas')
    return nova
  },

  async cancelar(id: string, motivo: MotivoCancelamento) {
    // a consulta pode ter vindo da API sem existir neste navegador (criada em outro computador)
    const alvo = (await consultasService.listar()).find((c) => c.id === id)
    if (!alvo) throw new ApiError('Consulta não encontrada.', 404)
    const horas = (parseLocalIso(alvo.data).getTime() - Date.now()) / 3_600_000
    if (horas < CLINICA.cancelamentoHoras)
      throw new ApiError(`Cancelamentos exigem antecedência mínima de ${CLINICA.cancelamentoHoras} horas.`, 400)

    // Consulta registrada na API: cancela lá primeiro, para as duas agendas não divergirem.
    if (alvo.idApi != null) {
      try {
        await http('/consultas', { method: 'DELETE', body: { idConsulta: alvo.idApi, motivo } })
      } catch (e) {
        if (e instanceof ApiError && e.offline) throw new ApiError('API indisponível. Tente cancelar novamente quando ela voltar.', 0, true)
        throw e
      }
    }
    const mesma = (c: Consulta) => c.id === id || (alvo.idApi != null && c.idApi === alvo.idApi)
    localDb.write(
      'consultas',
      localDb.read('consultas').map((c) => (mesma(c) ? { ...c, status: 'CANCELADA' as const, motivoCancelamento: motivo } : c)),
    )
    dataBus.emit('consultas')
  },
}
