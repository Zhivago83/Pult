// Плашка «Отменить» — появляется после любого действия и живёт
// несколько секунд. Undo вместо диалогов «вы уверены?».

import { useEffect, useRef, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { subscribe, getOps, lastUndoable, undo } from '../core/engine'
import type { OpType } from '../types'

const MESSAGES: Record<OpType, string> = {
  create: 'Пункт добавлен',
  close: 'Выполнено',
  reopen: 'Снова открыт',
  trash: 'Удалено',
  restore: 'Восстановлено',
  edit: 'Изменено',
}

const VISIBLE_MS = 6000

export function UndoToast() {
  // Перерисовываемся при любом изменении журнала.
  useSyncExternalStore(subscribe, getOps, getOps)
  const op = lastUndoable()

  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const activeId = op && op.id !== dismissedId ? op.id : null

  useEffect(() => {
    if (!activeId) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDismissedId(activeId), VISIBLE_MS)
    return () => window.clearTimeout(timer.current)
  }, [activeId])

  if (!op || !activeId) return null

  return (
    <div className="toast">
      <span className="toast-msg">{MESSAGES[op.type]}</span>
      <button
        onClick={() => {
          undo(op.id)
          setDismissedId(op.id)
        }}
      >
        Отменить
      </button>
    </div>
  )
}
