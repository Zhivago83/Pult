// ── Правила Сводки ──────────────────────────────────────────────
// Здесь решаем: какие пункты показывать, в какой секции, и что
// написать в «термометре дня». Никаких изменений данных — только
// чтение и раскладка.

import type { Item } from '../types'
import { GRACE_MS } from './engine'

/** Порог «пора пнуть»: ожидание со сроком в ближайшие сутки. */
const NUDGE_WINDOW_MS = 24 * 60 * 60 * 1000

export type SectionKey = 'burning' | 'nudge' | 'mine' | 'waiting'

export interface Section {
  key: SectionKey
  title: string
  items: Item[]
}

export interface Thermometer {
  burning: number
  waiting: number
  mine: number
  /** Доля «жара» 0..1 для полосы (сколько горит от всего активного). */
  heat: number
}

/** Горит ли пункт: активен и срок уже прошёл. */
export function isBurning(item: Item, now: number): boolean {
  return item.due !== undefined && item.due < now
}

/** Виден ли пункт в Сводке прямо сейчас (учёт периода благодати). */
function isVisible(item: Item, now: number): boolean {
  if (item.status === 'open') return true
  if (item.status === 'done' && item.doneAt !== undefined) {
    return now - item.doneAt < GRACE_MS // ещё в «периоде благодати»
  }
  return false
}

/** В какую секцию попадает пункт. */
function sectionOf(item: Item, now: number): SectionKey {
  if (isBurning(item, now)) return 'burning'
  if (
    item.kind === 'waiting' &&
    item.due !== undefined &&
    item.due - now < NUDGE_WINDOW_MS
  ) {
    return 'nudge'
  }
  return item.kind === 'mine' ? 'mine' : 'waiting'
}

const TITLES: Record<SectionKey, string> = {
  burning: 'Просрочено и горит',
  nudge: 'Пора пнуть',
  mine: 'Моё',
  waiting: 'Ожидания',
}

const ORDER: SectionKey[] = ['burning', 'nudge', 'mine', 'waiting']

/** Разложить пункты по секциям (пустые секции опускаем). */
export function buildSections(allItems: Item[], now: number): Section[] {
  const visible = allItems.filter((it) => isVisible(it, now))
  const buckets: Record<SectionKey, Item[]> = {
    burning: [],
    nudge: [],
    mine: [],
    waiting: [],
  }
  for (const it of visible) buckets[sectionOf(it, now)].push(it)

  // Внутри секции: сперва со сроком (ближе — выше), потом новые сверху.
  const sortFn = (a: Item, b: Item) => {
    if (a.due !== undefined && b.due !== undefined) return a.due - b.due
    if (a.due !== undefined) return -1
    if (b.due !== undefined) return 1
    return b.createdAt - a.createdAt
  }

  return ORDER.map((key) => ({
    key,
    title: TITLES[key],
    items: buckets[key].sort(sortFn),
  })).filter((s) => s.items.length > 0)
}

/** Посчитать «термометр дня» по активным (открытым) пунктам. */
export function buildThermometer(allItems: Item[], now: number): Thermometer {
  const open = allItems.filter((it) => it.status === 'open')
  const burning = open.filter((it) => isBurning(it, now)).length
  const waiting = open.filter((it) => it.kind === 'waiting').length
  const mine = open.filter((it) => it.kind === 'mine').length
  const total = open.length
  return {
    burning,
    waiting,
    mine,
    heat: total === 0 ? 0 : burning / total,
  }
}
