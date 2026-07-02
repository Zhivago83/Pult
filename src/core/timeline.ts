// ─────────────────────────────────────────────────────────────
//  ЯДРО: лента истории пункта
//  «История касаний» строится прямо из журнала операций (op-log):
//  системные события (создано, срок изменён, выполнено…) и
//  комментарии — вперемешку, по времени. Чистая функция.
// ─────────────────────────────────────────────────────────────

import type { Item, Op } from '../types'
import { formatDateShort } from './time'

export interface TimelineEntry {
  id: string
  ts: number
  /** comment — реплика человека; остальное — системная запись. */
  kind: 'comment' | 'remind' | 'system'
  text: string
}

function dueLabel(dueAt: number | undefined): string {
  return dueAt == null ? '—' : formatDateShort(dueAt)
}

/** Описать, что поменяла операция редактирования (сравнивая до/после). */
function describeEdit(before: Item | null, after: Item | null): string {
  if (!before || !after) return 'изменено'
  const parts: string[] = []
  if (before.title !== after.title) parts.push('переименовано')
  if (before.kind !== after.kind) parts.push(`вид: ${after.kind === 'mine' ? 'моё' : 'жду'}`)
  if (before.who !== after.who) parts.push(`владелец: ${after.who || '—'}`)
  if (before.project !== after.project) parts.push(`проект: ${after.project || '—'}`)
  if (before.dueAt !== after.dueAt) parts.push(`срок: ${dueLabel(after.dueAt)}`)
  return parts.length ? parts.join(' · ') : 'изменено'
}

/** Собрать ленту истории для одного пункта из всех операций журнала. */
export function buildTimeline(ops: Op[], item: Item): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  let hasCreate = false

  for (const op of ops) {
    if (op.itemId !== item.id || op.undone) continue
    if (op.type === 'create' || op.type === 'capture') hasCreate = true

    let kind: TimelineEntry['kind'] = 'system'
    let text: string

    switch (op.type) {
      case 'create':
        text = 'Создано'
        break
      case 'capture':
        text = 'Записано во Входящие'
        break
      case 'triage':
        text = 'Разложено'
        break
      case 'attachDoc':
        text = `Привязан документ: ${op.text ?? 'документ'}`
        break
      case 'detachDoc':
        text = `Отвязан документ: ${op.text ?? 'документ'}`
        break
      case 'edit':
        text = describeEdit(op.before, op.after)
        break
      case 'close':
        text = 'Выполнено'
        break
      case 'reopen':
        text = 'Открыто заново'
        break
      case 'trash':
        text = 'Убрано в корзину'
        break
      case 'restore':
        text = 'Восстановлено'
        break
      case 'remind':
        kind = 'remind'
        text = 'Напомнил'
        break
      case 'comment':
        kind = 'comment'
        text = op.text ?? ''
        break
      default:
        text = 'Изменено'
    }

    entries.push({ id: op.id, ts: op.ts, kind, text })
  }

  // Старые демо-пункты засевались без записи в журнал — покажем «Создано»
  // хотя бы по времени создания, чтобы история не была пустой.
  if (!hasCreate) {
    entries.push({ id: `synth-create-${item.id}`, ts: item.createdAt, kind: 'system', text: 'Создано' })
  }

  // Свежие — сверху.
  return entries.sort((a, b) => b.ts - a.ts)
}
