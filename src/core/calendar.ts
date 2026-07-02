// ─────────────────────────────────────────────────────────────
//  ЯДРО: производственный календарь
//  Рабочие дни считаются так: суббота/воскресенье — выходные,
//  основные праздники РФ (список ниже) — нерабочие, а отметки
//  пользователя (CalEntry) сильнее всего: 'work' делает день
//  рабочим (перенос), 'off' — нерабочим (свой праздник/отгул).
//  Чистые функции.
// ─────────────────────────────────────────────────────────────

import type { CalEntry } from '../types'

/**
 * Разумная основа: основные праздники РФ, повторяющиеся ежегодно
 * (ММ-ДД). Точные переносы конкретного года добавляются вручную
 * на экране «Календарь».
 */
export const ANNUAL_HOLIDAYS = [
  '01-01',
  '01-02',
  '01-03',
  '01-04',
  '01-05',
  '01-06',
  '01-07',
  '01-08',
  '02-23',
  '03-08',
  '05-01',
  '05-09',
  '06-12',
  '11-04',
]

/** Человекочитаемое описание основы (для экрана календаря). */
export const BASE_NOTE =
  'База: суббота и воскресенье — выходные; праздники РФ: 1–8 января, 23 февраля, 8 марта, 1 и 9 мая, 12 июня, 4 ноября.'

/** Метка времени → ключ даты ГГГГ-ММ-ДД (локальное время). */
export function dateKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * Собрать функцию «рабочий ли день» из отметок пользователя.
 * Порядок силы: отметка пользователя → выходной → праздник → рабочий.
 */
export function makeIsWorkday(entries: CalEntry[]): (ts: number) => boolean {
  const map = new Map(entries.map((e) => [e.date, e.kind]))
  return (ts: number) => {
    const key = dateKey(ts)
    const marked = map.get(key)
    if (marked === 'work') return true
    if (marked === 'off') return false
    const wd = new Date(ts).getDay() // 0 — вс, 6 — сб
    if (wd === 0 || wd === 6) return false
    if (ANNUAL_HOLIDAYS.includes(key.slice(5))) return false
    return true
  }
}
