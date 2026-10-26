import { useState, type ReactNode } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Modal } from './Modal'

interface Props {
  open: boolean
  title: string
  description?: string
  children?: ReactNode
  confirmLabel?: string
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

export function ConfirmDialog({ open, title, description, children, confirmLabel = 'Excluir', onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState(false)
  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      icon={<Trash2 size={20} />}
      tone="danger"
      width={480}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn btn--danger" onClick={confirm} disabled={busy} data-autofocus>
            {busy ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
