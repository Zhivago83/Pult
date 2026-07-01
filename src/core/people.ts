// ─────────────────────────────────────────────────────────────
//  ЯДРО: люди и надёжность
//  Людей узнаём по имени (поле `who` у ожиданий). Роль (команда/
//  исполнитель) берём из хранилища, надёжность считаем из истории.
//  Всё — чистые функции, их легко проверять.
// ─────────────────────────────────────────────────────────────

import type { Item, Op, Person, Role } from '../types'

/** Надёжность словами: только «срывал срок» — красная. */
export type Reliability = 'reliable' | 'slow' | 'missed'

export interface PersonRow {
  name: string
  role: Role
  /** Сколько открытых ожиданий от человека. */
  waiting: number
  /** Сколько из них просрочено. */
  overdue: number
  reliability: Reliability
}

export interface PeopleGroups {
  team: PersonRow[]
  contractors: PersonRow[]
}

/** Роль человека из хранилища; по умолчанию — «команда». */
export function roleOf(people: Person[], name: string): Role {
  return people.find((p) => p.name === name)?.role ?? 'team'
}

export function reliabilityWords(r: Reliability): string {
  switch (r) {
    case 'missed':
      return 'срывал срок'
    case 'slow':
      return 'тянет с ответом'
    case 'reliable':
      return 'обычно вовремя'
  }
}

/**
 * Надёжность из истории (просто):
 *  • «срывал срок» — есть просроченное открытое ожидание либо закрытое
 *    уже после срока;
 *  • «тянет с ответом» — переносил срок на попозже (правка срока);
 *  • иначе «обычно вовремя».
 */
export function personReliability(name: string, items: Item[], ops: Op[], now: number): Reliability {
  const mine = items.filter((it) => it.kind === 'waiting' && it.who === name)
  const ids = new Set(mine.map((it) => it.id))

  const missed = mine.some(
    (it) =>
      (it.dueAt != null && it.status === 'open' && it.dueAt < now) ||
      (it.dueAt != null && it.closedAt != null && it.closedAt > it.dueAt),
  )
  if (missed) return 'missed'

  const postponed = ops.some(
    (op) =>
      op.type === 'edit' &&
      !op.undone &&
      ids.has(op.itemId) &&
      op.before?.dueAt != null &&
      op.after?.dueAt != null &&
      op.after.dueAt > op.before.dueAt,
  )
  if (postponed) return 'slow'

  return 'reliable'
}

/** Открытые ожидания от человека — для его карточки. Раньше срок — выше. */
export function personWaitingItems(items: Item[], name: string): Item[] {
  return items
    .filter((it) => it.kind === 'waiting' && it.status === 'open' && it.who === name)
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))
}

/** Собрать людей, сгруппированных по роли, из открытых ожиданий. */
export function buildPeople(items: Item[], ops: Op[], people: Person[], now: number): PeopleGroups {
  const waitingByName = new Map<string, Item[]>()
  for (const it of items) {
    if (it.kind !== 'waiting' || it.status !== 'open' || !it.who) continue
    const arr = waitingByName.get(it.who) ?? []
    arr.push(it)
    waitingByName.set(it.who, arr)
  }

  const rows: PersonRow[] = []
  for (const [name, arr] of waitingByName) {
    const overdue = arr.filter((it) => it.dueAt != null && it.dueAt < now).length
    rows.push({
      name,
      role: roleOf(people, name),
      waiting: arr.length,
      overdue,
      reliability: personReliability(name, items, ops, now),
    })
  }

  // Тревожные — выше: сначала с просрочкой, потом по числу ожиданий, потом имя.
  rows.sort(
    (a, b) => b.overdue - a.overdue || b.waiting - a.waiting || a.name.localeCompare(b.name),
  )

  return {
    team: rows.filter((r) => r.role === 'team'),
    contractors: rows.filter((r) => r.role === 'contractor'),
  }
}
