import { ApiError, http } from '../lib/http'
import { fonteDe, markOffline, type Recurso } from '../lib/connection'
import { localDb, mergeEndereco } from '../lib/localdb'
import { settingsStore } from '../lib/settings'
import { dataBus } from '../lib/store'
import type { Atualizacao, Medico, MedicoCadastro, Page, Paciente, PacienteCadastro } from '../lib/types'

type Entidade = Medico | Paciente

/**
 * Serviço genérico para os cadastros (médicos e pacientes).
 * Contrato da API:
 *   GET    /{recurso}?size&sort  -> Page<DadosListagem>
 *   POST   /{recurso}            -> DadosCadastro
 *   PUT    /{recurso}            -> DadosAtualizacao { id, nome?, telefone?, endereco? }
 *   DELETE /{recurso}/{id}       -> exclusão lógica (ativo = false)
 */
function criarServico<T extends Entidade, C extends object>(recurso: Extract<Recurso, 'medicos' | 'pacientes'>) {
  const path = `/${recurso}`

  async function viaApi<R>(fn: () => Promise<R>): Promise<R> {
    try {
      return await fn()
    } catch (e) {
      if (e instanceof ApiError && e.offline && settingsStore.get().dataMode === 'auto') {
        markOffline(recurso)
        throw new ApiError('A API ficou indisponível. O sistema passou a usar os dados locais.', 0, true)
      }
      throw e
    }
  }

  return {
    async listar(): Promise<T[]> {
      if ((await fonteDe(recurso)) === 'local') return [...(localDb.read(recurso) as T[])]
      try {
        const page = await http<Page<T>>(`${path}?size=500&sort=nome`)
        // Registros sem o campo "ativo" (ex.: pacientes) são considerados ativos.
        return page.content.map((x) => ({ ...x, ativo: x.ativo ?? true }))
      } catch (e) {
        if (e instanceof ApiError && e.offline && settingsStore.get().dataMode === 'auto') {
          markOffline(recurso)
          return [...(localDb.read(recurso) as T[])]
        }
        throw e
      }
    },

    async cadastrar(dados: C) {
      if ((await fonteDe(recurso)) === 'api') {
        await viaApi(() => http(path, { method: 'POST', body: dados }))
      } else {
        const lista = localDb.read(recurso) as T[]
        const email = (dados as { email?: string }).email?.toLowerCase()
        if (lista.some((x) => x.email.toLowerCase() === email)) throw new ApiError('Já existe um cadastro com este e-mail.', 409)
        const crm = (dados as { crm?: string }).crm
        if (crm && (lista as Medico[]).some((x) => x.crm === crm)) throw new ApiError('Já existe um médico com este CRM.', 409)
        localDb.write(recurso, [...lista, { ...dados, id: localDb.nextId(), ativo: true } as unknown as T] as never)
      }
      dataBus.emit(recurso)
    },

    async atualizar(dados: Atualizacao) {
      if ((await fonteDe(recurso)) === 'api') {
        await viaApi(() => http(path, { method: 'PUT', body: dados }))
      } else {
        const lista = localDb.read(recurso) as T[]
        localDb.write(
          recurso,
          lista.map((x) =>
            x.id !== dados.id
              ? x
              : {
                  ...x,
                  nome: dados.nome ?? x.nome,
                  telefone: dados.telefone ?? x.telefone,
                  endereco: mergeEndereco(x.endereco, dados.endereco),
                },
          ) as never,
        )
      }
      dataBus.emit(recurso)
    },

    async excluir(id: number) {
      if ((await fonteDe(recurso)) === 'api') {
        await viaApi(() => http(`${path}/${id}`, { method: 'DELETE' }))
      } else {
        const lista = localDb.read(recurso) as T[]
        localDb.write(recurso, lista.map((x) => (x.id === id ? { ...x, ativo: false } : x)) as never)
      }
      dataBus.emit(recurso)
    },
  }
}

export const medicosService = criarServico<Medico, MedicoCadastro>('medicos')
export const pacientesService = criarServico<Paciente, PacienteCadastro>('pacientes')
