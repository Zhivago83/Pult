// ─────────────────────────────────────────────────────────────
//  ЯДРО: повторяющиеся дела
//  При закрытии повторяющегося пункта создаётся следующий такой же
//  со сдвинутым сроком. Чистые функции + подписи для интерфейса.
// ─────────────────────────────────────────────────────────────

import type { Item, Repeat } from '../types'

/** Сдвинуть метку времени на один период повтора. */
function addPeriod(ts: number, repeat: Repeat): number {
  const d = new Date(ts)
  if (repeat === 'daily') d.setDate(d.getDate() + 1)
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d.getTime()
}

/** Следующий срок: сдвигаем от базовой даты, пока не окажется в будущем. */
export function nextDue(base: number, repeat: Repeat, now: number): number {
  let ts = addPeriod(base, repeat)
  let guard = 0
  while (ts <= now && guard++ < 1000) ts = addPeriod(ts, repeat)
  return ts
}

/** Собрать следующий пункт из закрываемого повторяющегося. */
export function spawnNext(item: Item, id: string, now: number): Item {
  const base = item.dueAt ?? now
  return {
    ...item,
    id,
    status: 'open',
    dueAt: item.dueAt != null ? nextDue(base, item.repeat!, now) : undefined,
    nextTouchAt: undefined,
    closedAt: undefined,
    graceUntil: undefined,
    createdAt: now,
    updatedAt: now,
  }
}

/** Полная подпись повтора (для пилюли и истории). */
export function repeatLabel(repeat: Repeat | undefined): string {
  switch (repeat) {
    case 'daily':
      return 'каждый день'
    case 'weekly':
      return 'каждую неделю'
    case 'monthly':
      return 'каждый месяц'
    default:
      return 'нет'
  }
}

/** Короткая подпись повтора (для значения пилюли). */
export function repeatShort(repeat: Repeat | undefined): string {
  switch (repeat) {
    case 'daily':
      return 'день'
    case 'weekly':
      return 'неделя'
    case 'monthly':
      return 'месяц'
    default:
      return '—'
  }
}
