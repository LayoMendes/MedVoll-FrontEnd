// Tipos espelhando os records/DTOs da API Spring MedVoll.

export type Especialidade = 'ORTOPEDIA' | 'CARDIOLOGIA' | 'GINECOLOGIA' | 'DERMATOLOGIA'

export const ESPECIALIDADES: { value: Especialidade; label: string }[] = [
  { value: 'CARDIOLOGIA', label: 'Cardiologia' },
  { value: 'DERMATOLOGIA', label: 'Dermatologia' },
  { value: 'GINECOLOGIA', label: 'Ginecologia' },
  { value: 'ORTOPEDIA', label: 'Ortopedia' },
]

export const especialidadeLabel = (e?: Especialidade | null) =>
  ESPECIALIDADES.find((x) => x.value === e)?.label ?? '—'

/** DadosEndereco */
export interface Endereco {
  logradouro: string
  bairro: string
  cep: string
  cidade: string
  uf: string
  complemento?: string | null
  numero?: string | null
}

/** DadosListagemMedico */
export interface Medico {
  id: number
  nome: string
  email: string
  crm: string
  telefone: string
  especialidade: Especialidade
  ativo: boolean
  endereco?: Endereco
}

/** DadosCadastroMedico */
export interface MedicoCadastro {
  nome: string
  email: string
  telefone: string
  crm: string
  especialidade: Especialidade
  endereco: Endereco
}

/** DadosAtualizacaoMedico / DadosAtualizacaoPaciente (campos nulos são mantidos pela API) */
export interface Atualizacao {
  id: number
  nome?: string | null
  telefone?: string | null
  endereco?: Partial<Endereco> | null
}

export interface Paciente {
  id: number
  nome: string
  email: string
  telefone: string
  ativo: boolean
  endereco?: Endereco
}

/** DadosCadastroPaciente */
export interface PacienteCadastro {
  nome: string
  email: string
  telefone: string
  endereco: Endereco
}

export type MotivoCancelamento = 'PACIENTE_DESISTIU' | 'MEDICO_CANCELOU' | 'OUTROS'

export const MOTIVOS: { value: MotivoCancelamento; label: string }[] = [
  { value: 'PACIENTE_DESISTIU', label: 'Paciente desistiu' },
  { value: 'MEDICO_CANCELOU', label: 'Médico cancelou' },
  { value: 'OUTROS', label: 'Outros' },
]

export interface Consulta {
  id: string
  idMedico: number
  idPaciente: number
  medicoNome: string
  pacienteNome: string
  especialidade: Especialidade
  /** ISO local: yyyy-MM-ddTHH:mm */
  data: string
  status: 'AGENDADA' | 'CANCELADA'
  motivoCancelamento?: MotivoCancelamento
  criadaEm: string
  sincronizada: boolean
  /** id da consulta na API, quando ela foi registrada lá */
  idApi?: number
}

export interface ConsultaCadastro {
  idMedico?: number | null
  idPaciente: number
  data: string
  especialidade?: Especialidade | null
}

/** Formato Page<T> do Spring Data */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export type FonteDados = 'api' | 'local'
