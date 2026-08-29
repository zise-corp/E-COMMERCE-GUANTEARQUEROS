"use client";

import { TrashIcon } from "./Icons";
import { Modal } from "./Modal";

export function ConfirmModal({ open, title, description, confirmLabel = "Eliminar", busy = false, onClose, onConfirm }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} width={430}>
      <div className="flex justify-end gap-2.5">
        <button type="button" onClick={onClose} disabled={busy} className="border border-line-strong px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-content-muted transition-colors hover:border-content-dim disabled:opacity-50">Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex items-center gap-2 bg-alert px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white transition-colors hover:bg-alert-soft hover:text-ink-950 disabled:opacity-50">
          <TrashIcon size={14} />{busy ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
