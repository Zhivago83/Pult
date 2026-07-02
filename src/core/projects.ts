// ─────────────────────────────────────────────────────────────
//  ЯДРО: проекты
//  Проекты узнаём по полю `project` у пунктов. Здесь — группировка
//  и счётчики для экрана «Проекты». Чистые функции.
// ─────────────────────────────────────────────────────────────

import type { Item } from '../types'
import { thresholds } from './settings'
import type { VisibleItem } from './derive'

/** Ключ «без проекта» — у пункта не задан project. */
export const NO_PROJECT = ''

export interface ProjectRow {
  /** Ключ проекта (само название либо '' для «без проекта»). */
  name: string
  /** Как показывать: название или «Без проекта». */
  display: string
  /** Сколько открытых пунктов в проекте. */
  total: number
  /** Сколько из них горит (срок близко или прошёл). */
  burning: number
  /** Сколько из них — ожидания. */
  waiting: number
}

function isBurning(it: Item, now: number): boolean {
  return it.dueAt != null && it.dueAt <= now + thresholds().soonMs
}

export function projectDisplay(name: string): string {
  return name || 'Без проекта'
}

/** Собрать список проектов из открытых пунктов. */
export function buildProjects(items: Item[], now: number): ProjectRow[] {
  const byProject = new Map<string, Item[]>()
  for (const it of items) {
    if (it.status !== 'open') continue
    const key = it.project ?? NO_PROJECT
    const arr = byProject.get(key) ?? []
    arr.push(it)
    byProject.set(key, arr)
  }

  const rows: ProjectRow[] = []
  for (const [name, arr] of byProject) {
    rows.push({
      name,
      display: projectDisplay(name),
      total: arr.length,
      burning: arr.filter((it) => isBurning(it, now)).length,
      waiting: arr.filter((it) => it.kind === 'waiting').length,
    })
  }

  // Тревожные — выше: сначала где горит, потом по числу дел, потом название.
  // «Без проекта» всегда в конце.
  rows.sort((a, b) => {
    if (a.name === NO_PROJECT) return 1
    if (b.name === NO_PROJECT) return -1
    return b.burning - a.burning || b.total - a.total || a.display.localeCompare(b.display)
  })
  return rows
}

/** Видимые пункты проекта (открытые + доживающие период благодати). */
export function projectVisibleItems(items: Item[], name: string, now: number): VisibleItem[] {
  return items
    .filter(
      (it) =>
        (it.project ?? NO_PROJECT) === name &&
        (it.status === 'open' ||
          (it.status === 'done' && it.graceUntil != null && it.graceUntil > now)),
    )
    .map((it) => ({ item: it, closing: it.status === 'done' }))
    .sort((a, b) => {
      const ba = isBurning(a.item, now) ? 0 : 1
      const bb = isBurning(b.item, now) ? 0 : 1
      if (ba !== bb) return ba - bb
      return (a.item.dueAt ?? Infinity) - (b.item.dueAt ?? Infinity)
    })
}
