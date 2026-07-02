// ─────────────────────────────────────────────────────────────
//  ЯДРО: производная логика Сводки
//  Из плоского списка пунктов вычисляем: что «горит», что «пора
//  пнуть», что просто «моё» / «ожидания», и цифры для термометра.
//  Чистые функции — их легко проверять и переиспользовать.
// ─────────────────────────────────────────────────────────────

import type { Item } from '../types'
import { thresholds } from './settings'

/** Идентификаторы секций Сводки в порядке тревожности (сверху вниз). */
export type SectionId = 'burning' | 'nudge' | 'mine' | 'waiting'

export interface Section {
  id: SectionId
  title: string
  items: VisibleItem[]
}

/** Пункт, подготовленный к показу: с флагом «в процессе закрытия». */
export interface VisibleItem {
  item: Item
  /** true — пункт закрыт и доживает «период благодати» (зачёркнут). */
  closing: boolean
}

export interface Thermometer {
  burning: number // «N горят»
  waiting: number // «M ждут»
  mine: number // «K моих»
  total: number // сколько активных всего (для полосы)
}

export interface Summary {
  sections: Section[]
  thermometer: Thermometer
}

/** «Горит»: есть срок и он уже прошёл или наступит в ближайшие часы. */
function isBurning(item: Item, now: number): boolean {
  return item.dueAt != null && item.dueAt <= now + thresholds().soonMs
}

/**
 * «Пора пнуть»: пора коснуться снова.
 *  • если задана дата следующего касания — она уже наступила;
 *  • иначе — ожидание на подходе к сроку либо давно висит без срока.
 */
function isNudge(item: Item, now: number): boolean {
  if (item.kind !== 'waiting') return false
  if (item.nextTouchAt != null) return item.nextTouchAt <= now
  const t = thresholds()
  if (item.dueAt != null) return item.dueAt <= now + t.nudgeMs
  return now - item.createdAt >= t.staleMs
}

/** Виден ли пункт в Сводке: активен или доживает период благодати. */
function isVisible(item: Item, now: number): boolean {
  if (item.status === 'open') return true
  if (item.status === 'done' && item.graceUntil != null && item.graceUntil > now) return true
  return false
}

/** Сортировка внутри секции: у кого раньше срок — тот выше; без срока — ниже. */
function bySoonest(a: VisibleItem, b: VisibleItem): number {
  const da = a.item.dueAt ?? Number.POSITIVE_INFINITY
  const db = b.item.dueAt ?? Number.POSITIVE_INFINITY
  if (da !== db) return da - db
  return a.item.createdAt - b.item.createdAt
}

const TITLES: Record<SectionId, string> = {
  burning: 'Просрочено и горит',
  nudge: 'Пора пнуть',
  mine: 'Моё',
  waiting: 'Ожидания',
}

/** Главная функция: собрать Сводку из всех пунктов на момент `now`. */
export function buildSummary(all: Item[], now: number): Summary {
  const buckets: Record<SectionId, VisibleItem[]> = {
    burning: [],
    nudge: [],
    mine: [],
    waiting: [],
  }

  let burning = 0
  let waiting = 0
  let mine = 0

  for (const item of all) {
    if (!isVisible(item, now)) continue
    const closing = item.status === 'done'
    const vi: VisibleItem = { item, closing }

    // Раскладываем по секциям по убыванию тревожности.
    let section: SectionId
    if (isBurning(item, now)) section = 'burning'
    else if (isNudge(item, now)) section = 'nudge'
    else if (item.kind === 'mine') section = 'mine'
    else section = 'waiting'
    buckets[section].push(vi)

    // Счётчики термометра — только по-настоящему активные (не закрывающиеся).
    if (!closing) {
      if (section === 'burning') burning++
      if (item.kind === 'waiting') waiting++
      if (item.kind === 'mine') mine++
    }
  }

  const order: SectionId[] = ['burning', 'nudge', 'mine', 'waiting']
  const sections: Section[] = order
    .map((id) => ({ id, title: TITLES[id], items: buckets[id].sort(bySoonest) }))
    .filter((s) => s.items.length > 0)

  return {
    sections,
    thermometer: { burning, waiting, mine, total: burning + waiting + mine },
  }
}
