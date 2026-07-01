// ─────────────────────────────────────────────────────────────
//  ЯДРО: умный разбор захвата
//  Из свободной фразы вытаскиваем имя, срок, проект и вид пункта,
//  а в заголовке оставляем очищенный текст. Всё офлайн, без сети.
//  Пример: «отчёт от Марины до пятницы #Отчётность»
//    → title «отчёт», who «Марина», dueAt (ближайшая пятница),
//      project «Отчётность», kind «waiting».
// ─────────────────────────────────────────────────────────────

import type { Kind } from '../types'

export interface ParsedCapture {
  title: string
  kind: Kind
  who?: string
  project?: string
  /** Срок как метка времени, если распознан. */
  dueAt?: number
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** Метка времени на N дней вперёд от «сегодня», время 18:00. */
function dayAt(now: number, addDays: number): number {
  const d = new Date(now)
  d.setHours(18, 0, 0, 0)
  d.setDate(d.getDate() + addDays)
  return d.getTime()
}

/** Конкретная дата (день, месяц 0..11, год), время 18:00. */
function dateAt(year: number, month: number, day: number): number {
  const d = new Date(year, month, day, 18, 0, 0, 0)
  return d.getTime()
}

// Дни недели: стем регулярки → номер дня (JS getDay: вс=0 … сб=6).
// Важно: \w и \b в JS не понимают кириллицу, поэтому окончания —
// через [а-яё]*, а границы/предлоги — через пробелы.
const WEEKDAYS: Array<[RegExp, number]> = [
  [/понедельник[а-яё]*/iu, 1],
  [/вторник[а-яё]*/iu, 2],
  [/сред[ауые][а-яё]*/iu, 3],
  [/четверг[а-яё]*/iu, 4],
  [/пятниц[ауые][а-яё]*/iu, 5],
  [/суббот[ауые][а-яё]*/iu, 6],
  [/воскресень[еяю][а-яё]*/iu, 0],
]

/** Убрать подстроку по совпадению и схлопнуть пробелы. */
function cut(s: string, match: RegExpMatchArray): string {
  return (s.slice(0, match.index) + s.slice(match.index! + match[0].length))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Необязательный предлог перед датой (до, к, ко, на, в) — включаем в вырез.
// Границу берём как начало строки/пробел: \b не работает с кириллицей.
const PREP = '(?:(?:^|\\s)(?:до|ко?|на|в)\\s+)?'

/** Найти и вырезать срок. Возвращает [оставшийся текст, метка|undefined]. */
function extractDue(s: string, now: number): [string, number | undefined] {
  // сегодня / завтра / послезавтра
  const rel: Array<[RegExp, number]> = [
    [new RegExp(PREP + 'послезавтра', 'iu'), 2],
    [new RegExp(PREP + 'завтра', 'iu'), 1],
    [new RegExp(PREP + 'сегодня', 'iu'), 0],
  ]
  for (const [re, add] of rel) {
    const m = s.match(re)
    if (m) return [cut(s, m), dayAt(now, add)]
  }

  // через N дней / недель / месяц
  let m = s.match(/через\s+(\d+)\s+(дн[а-яё]*|недел[а-яё]*|месяц[а-яё]*)/iu)
  if (m) {
    const n = parseInt(m[1], 10)
    const unit = m[2].toLowerCase()
    const days = unit.startsWith('нед') ? n * 7 : unit.startsWith('мес') ? n * 30 : n
    return [cut(s, m), dayAt(now, days)]
  }
  m = s.match(/через\s+(недел[а-яё]*|месяц[а-яё]*)/iu)
  if (m) {
    const days = m[1].toLowerCase().startsWith('нед') ? 7 : 30
    return [cut(s, m), dayAt(now, days)]
  }

  // день недели (ближайший будущий; если сегодня — сегодня)
  for (const [re, dow] of WEEKDAYS) {
    const full = new RegExp(PREP + re.source, 'iu')
    const wm = s.match(full)
    if (wm) {
      const today = new Date(now).getDay()
      const delta = (dow - today + 7) % 7
      return [cut(s, wm), dayAt(now, delta)]
    }
  }

  // «12 июля» / «12 июл»
  m = s.match(new RegExp(PREP + '(\\d{1,2})\\s+([а-яё]{3,})', 'iu'))
  if (m) {
    const day = parseInt(m[1], 10)
    const monWord = m[2].toLowerCase()
    const month = MONTHS.findIndex((mm) => monWord.startsWith(mm))
    if (month >= 0 && day >= 1 && day <= 31) {
      const y = new Date(now).getFullYear()
      let ts = dateAt(y, month, day)
      if (ts < dayAt(now, -1)) ts = dateAt(y + 1, month, day) // прошло — значит след. год
      return [cut(s, m), ts]
    }
  }

  // «15.07» или «15.07.2026»
  m = s.match(new RegExp(PREP + '(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{2,4}))?', 'u'))
  if (m) {
    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10) - 1
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const now4 = new Date(now).getFullYear()
      let year = m[3] ? parseInt(m[3], 10) : now4
      if (year < 100) year += 2000
      let ts = dateAt(year, month, day)
      if (!m[3] && ts < dayAt(now, -1)) ts = dateAt(year + 1, month, day)
      return [cut(s, m), ts]
    }
  }

  return [s, undefined]
}

/** Найти и вырезать человека («от Имя» или «@Имя»). */
function extractWho(s: string): [string, string | undefined] {
  let m = s.match(/(?:^|\s)@([А-ЯЁ][A-Za-zА-Яа-яЁё-]*)/u)
  if (m) return [cut(s, m), m[1]]
  m = s.match(/(?:^|\s)от\s+([А-ЯЁ][А-Яа-яЁё-]+)/u)
  if (m) return [cut(s, m), m[1]]
  return [s, undefined]
}

/** Разобрать фразу захвата. */
export function parseCapture(text: string, now: number): ParsedCapture {
  let s = text.trim()
  let kind: Kind = 'mine'

  // Проект «#…»
  let project: string | undefined
  const pm = s.match(/(?:^|\s)#([^\s#]+)/u)
  if (pm) {
    project = pm[1]
    s = cut(s, pm)
  }

  // Ведущее «жду …» → ожидание
  const zm = s.match(/^жду\s+/iu)
  if (zm) {
    kind = 'waiting'
    s = s.slice(zm[0].length)
  }

  // Человек
  const [afterWho, who] = extractWho(s)
  s = afterWho
  if (who) kind = 'waiting'

  // Срок
  const [afterDue, dueAt] = extractDue(s, now)
  s = afterDue

  // Чистим заголовок от висячих предлогов/знаков по краям.
  const title = s.replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/gu, '').replace(/\s{2,}/g, ' ').trim()

  return {
    title: title || text.trim(),
    kind,
    who,
    project,
    dueAt,
  }
}
