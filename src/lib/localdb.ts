// Banco local (localStorage) usado quando a API não está disponível ou no modo demonstração.
// Reproduz as mesmas regras da API: exclusão lógica (ativo = false) e atualização parcial.

import { addDays } from './time'
import { readJson, writeJson } from './store'
import type { Consulta, Endereco, Medico, Paciente } from './types'
import { toLocalIso } from './format'

interface Db {
  version: 1
  seq: number
  medicos: Medico[]
  pacientes: Paciente[]
  consultas: Consulta[]
}

const KEY = 'medvoll:db'

const end = (logradouro: string, bairro: string, cidade: string, uf: string, cep: string, numero = ''): Endereco => ({
  logradouro, bairro, cidade, uf, cep, numero, complemento: '',
})

function seed(): Db {
  const medicos: Medico[] = [
    { id: 1, nome: 'Dra. Helena Martins', email: 'helena.martins@voll.med', crm: '123456', telefone: '11987654321', especialidade: 'CARDIOLOGIA', ativo: true, endereco: end('Av. Paulista', 'Bela Vista', 'São Paulo', 'SP', '01310100', '1578') },
    { id: 2, nome: 'Dr. Rafael Albuquerque', email: 'rafael.albuquerque@voll.med', crm: '204518', telefone: '11991234567', especialidade: 'ORTOPEDIA', ativo: true, endereco: end('Rua Augusta', 'Consolação', 'São Paulo', 'SP', '01305000', '210') },
    { id: 3, nome: 'Dra. Camila Duarte', email: 'camila.duarte@voll.med', crm: '58921', telefone: '11999887766', especialidade: 'DERMATOLOGIA', ativo: true, endereco: end('Rua Oscar Freire', 'Jardins', 'São Paulo', 'SP', '01426001', '88') },
    { id: 4, nome: 'Dra. Beatriz Nogueira', email: 'beatriz.nogueira@voll.med', crm: '77410', telefone: '11988776655', especialidade: 'GINECOLOGIA', ativo: true, endereco: end('Rua Haddock Lobo', 'Cerqueira César', 'São Paulo', 'SP', '01414001', '595') },
    { id: 5, nome: 'Dr. Thiago Fontes', email: 'thiago.fontes@voll.med', crm: '33019', telefone: '11977665544', especialidade: 'CARDIOLOGIA', ativo: true, endereco: end('Av. Brigadeiro Faria Lima', 'Itaim Bibi', 'São Paulo', 'SP', '04538132', '3477') },
    { id: 6, nome: 'Dr. Lucas Prado', email: 'lucas.prado@voll.med', crm: '9087', telefone: '11966554433', especialidade: 'ORTOPEDIA', ativo: false, endereco: end('Rua Vergueiro', 'Paraíso', 'São Paulo', 'SP', '04101000', '1000') },
  ]
  const pacientes: Paciente[] = [
    { id: 101, nome: 'Mariana Costa', email: 'mariana.costa@email.com', telefone: '11912345678', ativo: true, endereco: end('Rua das Flores', 'Centro', 'São Paulo', 'SP', '01001000', '45') },
    { id: 102, nome: 'João Pedro Lima', email: 'joao.lima@email.com', telefone: '11923456789', ativo: true, endereco: end('Av. Rebouças', 'Pinheiros', 'São Paulo', 'SP', '05402000', '1200') },
    { id: 103, nome: 'Ana Clara Souza', email: 'ana.souza@email.com', telefone: '11934567890', ativo: true, endereco: end('Rua Teodoro Sampaio', 'Pinheiros', 'São Paulo', 'SP', '05405000', '300') },
    { id: 104, nome: 'Carlos Eduardo Ramos', email: 'carlos.ramos@email.com', telefone: '11945678901', ativo: true, endereco: end('Rua Domingos de Morais', 'Vila Mariana', 'São Paulo', 'SP', '04010100', '820') },
    { id: 105, nome: 'Fernanda Ribeiro', email: 'fernanda.ribeiro@email.com', telefone: '11956789012', ativo: true, endereco: end('Alameda Santos', 'Jardim Paulista', 'São Paulo', 'SP', '01418000', '1100') },
  ]

  // Algumas consultas futuras para a agenda não começar vazia.
  const consultas: Consulta[] = []
  const plan: [number, number, number, number][] = [
    // [diasAFrente, hora, medicoIdx, pacienteIdx]
    [0, 15, 0, 0], [0, 17, 2, 1], [1, 9, 1, 2], [1, 10, 3, 3], [1, 14, 4, 4], [2, 8, 0, 1], [3, 11, 2, 0], [4, 16, 1, 3],
  ]
  const now = new Date()
  plan.forEach(([dd, h, mi, pi], idx) => {
    const d = addDays(now, dd)
    d.setHours(h, 0, 0, 0)
    // Pula datas no passado ou em domingos para respeitar as regras da clínica.
    if (d.getTime() < now.getTime() + 30 * 60_000 || d.getDay() === 0) return
    const m = medicos[mi]!
    const p = pacientes[pi]!
    consultas.push({
      id: `c${idx + 1}`,
      idMedico: m.id,
      idPaciente: p.id,
      medicoNome: m.nome,
      pacienteNome: p.nome,
      especialidade: m.especialidade,
      data: toLocalIso(d),
      status: 'AGENDADA',
      criadaEm: new Date().toISOString(),
      sincronizada: false,
    })
  })

  return { version: 1, seq: 1000, medicos, pacientes, consultas }
}

let cache: Db | null = null

function load(): Db {
  if (cache) return cache
  const stored = readJson<Db | null>(KEY, null)
  cache = stored && stored.version === 1 ? stored : seed()
  if (!stored) writeJson(KEY, cache)
  return cache
}

export const localDb = {
  read: <K extends 'medicos' | 'pacientes' | 'consultas'>(k: K): Db[K] => load()[k],
  write<K extends 'medicos' | 'pacientes' | 'consultas'>(k: K, value: Db[K]) {
    const db = load()
    db[k] = value
    writeJson(KEY, db)
  },
  nextId() {
    const db = load()
    db.seq += 1
    writeJson(KEY, db)
    return db.seq
  },
  reset() {
    cache = seed()
    writeJson(KEY, cache)
  },
  clear() {
    cache = { version: 1, seq: 1000, medicos: [], pacientes: [], consultas: [] }
    writeJson(KEY, cache)
  },
}

/** Aplica a semântica de atualização parcial da API: campos nulos/vazios são mantidos. */
export function mergeEndereco(atual: Endereco | undefined, patch: Partial<Endereco> | null | undefined): Endereco | undefined {
  if (!patch) return atual
  const base: Endereco = atual ?? { logradouro: '', bairro: '', cep: '', cidade: '', uf: '' }
  const out = { ...base }
  ;(Object.keys(patch) as (keyof Endereco)[]).forEach((k) => {
    const v = patch[k]
    if (v !== null && v !== undefined) (out as Record<string, unknown>)[k] = v
  })
  return out
}
