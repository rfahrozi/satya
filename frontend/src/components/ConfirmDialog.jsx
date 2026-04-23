import { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

/**
 * ConfirmDialog — Accessible replacement for window.confirm().
 *
 * Usage:
 *   const [dialog, setDialog] = useState({ open: false, payload: null });
 *
 *   <ConfirmDialog
 *     isOpen={dialog.open}
 *     title="Hapus Data"
 *     message="Tindakan ini tidak dapat dibatalkan."
 *     variant="danger"
 *     onConfirm={() => { doDelete(dialog.payload); setDialog({ open: false, payload: null }); }}
 *     onCancel={() => setDialog({ open: false, payload: null })}
 *   />
 *
 * Props:
 *   isOpen       {boolean}   — Controls visibility
 *   title        {string}    — Dialog heading (announced as label)
 *   message      {string}    — Descriptive message
 *   confirmLabel {string}    — Confirm button text (default: "Ya, Lanjutkan")
 *   cancelLabel  {string}    — Cancel button text  (default: "Batal")
 *   variant      {string}    — "danger" | "warning" | "info"
 *   onConfirm    {function}  — Called when user clicks confirm
 *   onCancel     {function}  — Called when user clicks cancel, presses Escape, or clicks backdrop
 */

const VARIANT_STYLES = {
  danger: {
    iconColor: 'text-red-400',
    confirmBtn: 'bg-red-600 hover:bg-red-500 text-white',
    Icon: AlertTriangle,
  },
  warning: {
    iconColor: 'text-amber-400',
    confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white',
    Icon: AlertTriangle,
  },
  info: {
    iconColor: 'text-blue-400',
    confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white',
    Icon: Info,
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const containerRef = useFocusTrap(isOpen);
  const { iconColor, confirmBtn, Icon } = VARIANT_STYLES[variant] ?? VARIANT_STYLES.danger;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    /* Backdrop — aria-hidden so screen readers only read the dialog */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      {/* Dialog panel */}
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-sm mx-4 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <Icon size={24} className={`${iconColor} shrink-0 mt-0.5`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-white leading-snug"
            >
              {title}
            </h2>
            {message && (
              <p id="confirm-dialog-message" className="text-sm text-slate-400 mt-1 leading-relaxed">
                {message}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            aria-label="Tutup dialog"
            className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors shrink-0"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
