import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Save, Search, Stethoscope, UserRound } from 'lucide-react'
import { Modal } from './Modal'
import { Field } from './ui'
import { useToast } from './Toast'
import { maskCep, maskPhone, onlyDigits, UFS } from '../lib/format'
import { ESPECIALIDADES, type Atualizacao, type Endereco, type Especialidade, type Medico, type Paciente } from '../lib/types'

export type Tipo = 'medico' | 'paciente'

interface FormState {
  nome: string
  email: string
  telefone: string
  crm: string
  especialidade: Especialidade | ''
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

const EMPTY: FormState = {
  nome: '', email: '', telefone: '', crm: '', especialidade: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  tipo: Tipo
  open: boolean
  registro: Medico | Paciente | null
  onClose: () => void
  onCreate: (dados: Record<string, unknown>) => Promise<void>
  onUpdate: (dados: Atualizacao) => Promise<void>
}

export function PessoaForm({ tipo, open, registro, onClose, onCreate, onUpdate }: Props) {
  const toast = useToast()
  const editing = !!registro
  const [f, setF] = useState<FormState>(EMPTY)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cepBusy, setCepBusy] = useState(false)
  const lastCep = useRef('')

  useEffect(() => {
    if (!open) return
    const e = registro?.endereco
    setF({
      ...EMPTY,
      nome: registro?.nome ?? '',
      email: registro?.email ?? '',
      telefone: registro ? maskPhone(registro.telefone ?? '') : '',
      crm: (registro as Medico | null)?.crm ?? '',
      especialidade: (registro as Medico | null)?.especialidade ?? '',
      cep: e ? maskCep(e.cep) : '',
      logradouro: e?.logradouro ?? '',
      numero: e?.numero ?? '',
      complemento: e?.complemento ?? '',
      bairro: e?.bairro ?? '',
      cidade: e?.cidade ?? '',
      uf: e?.uf ?? '',
    })
    setTouched({})
    setSubmitted(false)
    lastCep.current = e?.cep ?? ''
  }, [open, registro])

  // Na edição via API o endereço não vem na listagem: os campos ficam opcionais e só o que for preenchido é enviado.
  const enderecoOpcional = editing && !registro?.endereco
  const algumEndereco = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].some((k) => f[k as keyof FormState])

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!f.nome.trim()) e.nome = 'Informe o nome completo.'
    else if (f.nome.trim().length < 3) e.nome = 'Nome muito curto.'
    if (!editing) {
      if (!f.email.trim()) e.email = 'Informe o e-mail.'
      else if (!EMAIL_RE.test(f.email.trim())) e.email = 'E-mail inválido.'
    }
    const tel = onlyDigits(f.telefone)
    if (!tel) e.telefone = 'Informe o telefone.'
    else if (tel.length < 10) e.telefone = 'Telefone incompleto.'
    if (tipo === 'medico' && !editing) {
      if (!/^\d{4,6}$/.test(f.crm)) e.crm = 'O CRM deve ter de 4 a 6 dígitos.'
      if (!f.especialidade) e.especialidade = 'Selecione a especialidade.'
    }
    const exigirEndereco = !enderecoOpcional
    const cep = onlyDigits(f.cep)
    if ((exigirEndereco || cep) && cep.length !== 8) e.cep = 'O CEP deve ter 8 dígitos.'
    if (exigirEndereco) {
      if (!f.logradouro.trim()) e.logradouro = 'Informe o logradouro.'
      if (!f.bairro.trim()) e.bairro = 'Informe o bairro.'
      if (!f.cidade.trim()) e.cidade = 'Informe a cidade.'
      if (!f.uf) e.uf = 'Selecione a UF.'
    }
    return e
  }, [f, editing, tipo, enderecoOpcional])

  const show = (k: keyof FormState) => (submitted || touched[k] ? errors[k] : undefined)
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))
  const blur = (k: keyof FormState) => () => setTouched((t) => ({ ...t, [k]: true }))

  async function buscarCep(valor: string) {
    const cep = onlyDigits(valor)
    if (cep.length !== 8 || cep === lastCep.current) return
    lastCep.current = cep
    setCepBusy(true)
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const j = await r.json()
      if (j.erro) {
        toast.info('CEP não encontrado', 'Preencha o endereço manualmente.')
        return
      }
      setF((s) => ({
        ...s,
        logradouro: j.logradouro || s.logradouro,
        bairro: j.bairro || s.bairro,
        cidade: j.localidade || s.cidade,
        uf: j.uf || s.uf,
      }))
    } catch {
      /* consulta de CEP é apenas uma conveniência */
    } finally {
      setCepBusy(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) return
    setBusy(true)
    const nn = (v: string) => (v.trim() ? v.trim() : null)
    try {
      if (editing) {
        let endereco: Partial<Endereco> | null = null
        if (algumEndereco) {
          endereco = {
            logradouro: nn(f.logradouro) ?? undefined,
            bairro: nn(f.bairro) ?? undefined,
            cep: nn(onlyDigits(f.cep)) ?? undefined,
            cidade: nn(f.cidade) ?? undefined,
            uf: nn(f.uf) ?? undefined,
            numero: nn(f.numero),
            complemento: nn(f.complemento),
          }
        }
        await onUpdate({ id: registro!.id, nome: f.nome.trim(), telefone: onlyDigits(f.telefone), endereco })
      } else {
        const endereco: Endereco = {
          logradouro: f.logradouro.trim(),
          bairro: f.bairro.trim(),
          cep: onlyDigits(f.cep),
          cidade: f.cidade.trim(),
          uf: f.uf,
          numero: nn(f.numero),
          complemento: nn(f.complemento),
        }
        const base = { nome: f.nome.trim(), email: f.email.trim().toLowerCase(), telefone: onlyDigits(f.telefone), endereco }
        await onCreate(tipo === 'medico' ? { ...base, crm: f.crm, especialidade: f.especialidade } : base)
      }
      onClose()
    } catch (err) {
      toast.error('Não foi possível salvar', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const label = tipo === 'medico' ? 'médico' : 'paciente'
  const req = !enderecoOpcional

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={editing ? `Editar ${label}` : `Novo ${label}`}
      description={
        editing
          ? 'Atualize os dados permitidos pela API: nome, telefone e endereço.'
          : `Preencha os dados para cadastrar o ${label}. Campos com * são obrigatórios.`
      }
      icon={tipo === 'medico' ? <Stethoscope size={20} /> : <UserRound size={20} />}
      width={720}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="pessoa-form" className="btn btn--primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {editing ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <form id="pessoa-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="form-section">Dados {tipo === 'medico' ? 'profissionais' : 'pessoais'}</div>

        <Field label="Nome completo" required error={show('nome')} className="col-12" htmlFor="f-nome">
          <input id="f-nome" className="input" value={f.nome} onChange={set('nome')} onBlur={blur('nome')} aria-invalid={!!show('nome')} placeholder={tipo === 'medico' ? 'Ex.: Dra. Helena Martins' : 'Ex.: Mariana Costa'} autoComplete="name" maxLength={100} />
        </Field>

        <Field label="E-mail" required={!editing} error={show('email')} hint={editing ? 'O e-mail não pode ser alterado.' : undefined} className="col-6" htmlFor="f-email">
          <input id="f-email" type="email" className="input" value={f.email} onChange={set('email')} onBlur={blur('email')} aria-invalid={!!show('email')} disabled={editing} placeholder="nome@email.com" autoComplete="email" maxLength={100} />
        </Field>

        <Field label="Telefone" required error={show('telefone')} className="col-6" htmlFor="f-tel">
          <input id="f-tel" className="input" inputMode="tel" value={f.telefone} onChange={(e) => setF((s) => ({ ...s, telefone: maskPhone(e.target.value) }))} onBlur={blur('telefone')} aria-invalid={!!show('telefone')} placeholder="(11) 98765-4321" autoComplete="tel" />
        </Field>

        {tipo === 'medico' && (
          <>
            <Field label="CRM" required={!editing} error={show('crm')} hint={editing ? 'O CRM não pode ser alterado.' : '4 a 6 dígitos'} className="col-6" htmlFor="f-crm">
              <input id="f-crm" className="input mono" inputMode="numeric" value={f.crm} onChange={(e) => setF((s) => ({ ...s, crm: onlyDigits(e.target.value).slice(0, 6) }))} onBlur={blur('crm')} aria-invalid={!!show('crm')} disabled={editing} placeholder="123456" />
            </Field>
            <Field label="Especialidade" required={!editing} error={show('especialidade')} hint={editing ? 'A especialidade não pode ser alterada.' : undefined} className="col-6" htmlFor="f-esp">
              <select id="f-esp" className="select" value={f.especialidade} onChange={set('especialidade')} onBlur={blur('especialidade')} aria-invalid={!!show('especialidade')} disabled={editing}>
                <option value="">Selecione…</option>
                {ESPECIALIDADES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <div className="form-section">Endereço</div>
        {enderecoOpcional && (
          <div className="col-12 field__hint" style={{ marginTop: -6 }}>
            A API não retorna o endereço na listagem. Preencha apenas os campos que deseja alterar — os demais serão mantidos.
          </div>
        )}

        <Field label="CEP" required={req} error={show('cep')} className="col-4" htmlFor="f-cep">
          <div style={{ position: 'relative' }}>
            <input id="f-cep" className="input mono" inputMode="numeric" value={f.cep} onChange={(e) => { const v = maskCep(e.target.value); setF((s) => ({ ...s, cep: v })); if (onlyDigits(v).length === 8) buscarCep(v) }} onBlur={blur('cep')} aria-invalid={!!show('cep')} placeholder="00000-000" autoComplete="postal-code" />
            <span style={{ position: 'absolute', right: 14, top: '50%', translate: '0 -50%', color: 'var(--muted)', display: 'grid' }} aria-hidden>
              {cepBusy ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
            </span>
          </div>
        </Field>
        <Field label="Logradouro" required={req} error={show('logradouro')} className="col-8" htmlFor="f-log">
          <input id="f-log" className="input" value={f.logradouro} onChange={set('logradouro')} onBlur={blur('logradouro')} aria-invalid={!!show('logradouro')} placeholder="Rua, avenida…" autoComplete="address-line1" maxLength={100} />
        </Field>
        <Field label="Número" className="col-3" htmlFor="f-num">
          <input id="f-num" className="input" value={f.numero} onChange={set('numero')} placeholder="123" maxLength={20} />
        </Field>
        <Field label="Complemento" className="col-4" htmlFor="f-comp">
          <input id="f-comp" className="input" value={f.complemento} onChange={set('complemento')} placeholder="Sala, apto…" maxLength={100} />
        </Field>
        <Field label="Bairro" required={req} error={show('bairro')} className="col-5" htmlFor="f-bairro" >
          <input id="f-bairro" className="input" value={f.bairro} onChange={set('bairro')} onBlur={blur('bairro')} aria-invalid={!!show('bairro')} maxLength={100} />
        </Field>
        <Field label="Cidade" required={req} error={show('cidade')} className="col-8" htmlFor="f-cidade">
          <input id="f-cidade" className="input" value={f.cidade} onChange={set('cidade')} onBlur={blur('cidade')} aria-invalid={!!show('cidade')} autoComplete="address-level2" maxLength={100} />
        </Field>
        <Field label="UF" required={req} error={show('uf')} className="col-4" htmlFor="f-uf">
          <select id="f-uf" className="select" value={f.uf} onChange={set('uf')} onBlur={blur('uf')} aria-invalid={!!show('uf')}>
            <option value="">—</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  )
}
