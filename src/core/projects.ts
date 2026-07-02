// ─────────────────────────────────────────────────────────────
//  ЯДРО: проекты
//  Проекты выводятся из поля `project` у пунктов — отдельной
//  сущности нет, поэтому и миграций не нужно. Здесь: сводка по
//  проектам (прогресс «сделано из всех»), группировка пунктов
//  раскрытого проекта и списки имён. Чистые функции.
// ─────────────────────────────────────────────────────────────

import type { Item } from '../types'

export interface ProjectRow {
  name: string
  /** Всего пунктов в проекте (открытые + сделанные, без корзины). */
  total: number
  /** Сколько из них сделано. */
  closed: number
  /** Сколько открытых просрочено (тревожные проекты — выше). */
  overdue: number
}

/** Пункт учитывается в проектах: есть проект и он не в корзине. */
function counts(it: Item): boolean {
  return !!it.project && it.status !== 'trashed'
}

/** Список проектов со счётчиками прогресса. */
export function buildProjects(items: Item[], now: number): ProjectRow[] {
  const map = new Map<string, ProjectRow>()
  for (const it of items) {
    if (!counts(it)) continue
    const row = map.get(it.project!) ?? { name: it.project!, total: 0, closed: 0, overdue: 0 }
    row.total++
    if (it.status === 'done') row.closed++
    else if (it.dueAt != null && it.dueAt < now) row.overdue++
    map.set(it.project!, row)
  }
  // Порядок: сначала с просрочкой, затем где больше открытых;
  // полностью сделанные — вниз; при равенстве — по алфавиту.
  return [...map.values()].sort((a, b) => {
    const aFinished = a.closed === a.total ? 1 : 0
    const bFinished = b.closed === b.total ? 1 : 0
    if (aFinished !== bFinished) return aFinished - bFinished
    if (a.overdue !== b.overdue) return b.overdue - a.overdue
    const aOpen = a.total - a.closed
    const bOpen = b.total - b.closed
    if (aOpen !== bOpen) return bOpen - aOpen
    return a.name.localeCompare(b.name)
  })
}

export interface ProjectGroups {
  /** Открытые с прошедшим сроком — самые тревожные. */
  overdue: Item[]
  /** Остальные открытые. */
  inWork: Item[]
  /** Сделанные, свежие сверху (показываются свёрнуто). */
  done: Item[]
}

/** Пункты раскрытого проекта по группам. */
export function projectGroups(items: Item[], name: string, now: number): ProjectGroups {
  const mine = items.filter((it) => it.project === name && it.status !== 'trashed')
  const isOverdue = (it: Item) => it.dueAt != null && it.dueAt < now
  return {
    overdue: mine
      .filter((it) => it.status === 'open' && isOverdue(it))
      .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0)),
    inWork: mine
      .filter((it) => it.status === 'open' && !isOverdue(it))
      .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)),
    done: mine
      .filter((it) => it.status === 'done')
      .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0)),
  }
}

/** Имена всех проектов — для выбора в карточке пункта. */
export function projectNames(items: Item[]): string[] {
  const set = new Set<string>()
  for (const it of items) if (counts(it)) set.add(it.project!)
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Проекты «в движении»: есть хотя бы один открытый пункт. */
export function activeProjects(items: Item[]): string[] {
  const set = new Set<string>()
  for (const it of items) if (it.project && it.status === 'open') set.add(it.project)
  return [...set].sort((a, b) => a.localeCompare(b))
}
