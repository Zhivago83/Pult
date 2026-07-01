import { useEngine } from '../state/engine'

/** Плашка «Отменить» — появляется на любое действие вместо диалогов. */
export function UndoToast() {
  const { pending, undo } = useEngine()
  if (!pending) return null
  return (
    <div className="toast" role="status">
      <span className="toast__label">{pending.label}</span>
      <button className="toast__undo" onClick={undo}>
        Отменить
      </button>
    </div>
  )
}
