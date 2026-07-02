// ─────────────────────────────────────────────────────────────
//  ЯДРО: гибкое правило повтора
//  Правило = частота + «какой день брать» (якорь) + сдвиг с
//  выходного + окончание. Следующий период считается от срока
//  закрываемого пункта; «рабочие дни» — по производственному
//  календарю (передаётся функцией isWork). Чистые функции.
// ─────────────────────────────────────────────────────────────

/** День недели: 1 — понедельник … 7 — воскресенье. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Якорь: какой день периода (месяца/квартала/года) брать. */
export type Anchor =
  | { type: 'dom'; day: number } // N-й календарный день периода; -1 — последний
  | { type: 'workday'; n: number } // N-й рабочий день; -1 — последний рабочий
  | { type: 'nthWeekday'; n: number; weekday: Weekday } // «первый вторник»; n: 1..4 | -1
  | { type: 'fromStart'; days: number; business: boolean } // через N дней от начала
  | { type: 'fromEnd'; days: number; business: boolean } // за N дней до конца

/** Окончание повторения. */
export type RepeatEnd =
  | { type: 'never' }
  | { type: 'until'; date: number }
  | { type: 'count'; times: number }

export interface RepeatRule {
  freq: 'day' | 'week' | 'month' | 'quarter' | 'year'
  /** Для недели: какие дни (пусто — тот же день, что у срока). */
  weekdays?: Weekday[]
  /** Для месяца/квартала/года: какой день брать. */
  anchor?: Anchor
  /** Если дата попала на выходной: сдвинуть назад/вперёд/не двигать. */
  shift?: 'none' | 'back' | 'forward'
  end?: RepeatEnd
  /** Сколько повторов уже создано (для окончания «N раз»). */
  done?: number
}

type IsWork = (ts: number) => boolean

// ── Мелкие помощники дат (локальное время) ─────────────────

function at18(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0, 0).getTime()
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** День недели ISO: пн=1 … вс=7. */
export function isoWeekday(d: Date): Weekday {
  return (((d.getDay() + 6) % 7) + 1) as Weekday
}

function prevWork(d: Date, isWork: IsWork): Date {
  let cur = d
  for (let i = 0; i < 60 && !isWork(cur.getTime()); i++) cur = addDays(cur, -1)
  return cur
}

function nextWork(d: Date, isWork: IsWork): Date {
  let cur = d
  for (let i = 0; i < 60 && !isWork(cur.getTime()); i++) cur = addDays(cur, 1)
  return cur
}

/** Границы периода (месяц/квартал/год), в котором лежит дата. */
function periodOf(freq: 'month' | 'quarter' | 'year', d: Date): { start: Date; end: Date } {
  const y = d.getFullYear()
  if (freq === 'month') {
    return { start: new Date(y, d.getMonth(), 1), end: new Date(y, d.getMonth() + 1, 0) }
  }
  if (freq === 'quarter') {
    const qm = Math.floor(d.getMonth() / 3) * 3
    return { start: new Date(y, qm, 1), end: new Date(y, qm + 3, 0) }
  }
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) }
}

/** Начало следующего периода после того, где лежит дата. */
function nextPeriodStart(freq: 'month' | 'quarter' | 'year', d: Date): Date {
  const y = d.getFullYear()
  if (freq === 'month') return new Date(y, d.getMonth() + 1, 1)
  if (freq === 'quarter') return new Date(y, Math.floor(d.getMonth() / 3) * 3 + 3, 1)
  return new Date(y + 1, 0, 1)
}

/** Дата по якорю внутри периода [start, end]. */
function anchorDate(anchor: Anchor, start: Date, end: Date, isWork: IsWork): Date {
  switch (anchor.type) {
    case 'dom': {
      if (anchor.day === -1) return end
      const d = addDays(start, anchor.day - 1)
      return d > end ? end : d
    }
    case 'workday': {
      if (anchor.n === -1) return prevWork(end, isWork)
      let cur = start
      let count = isWork(cur.getTime()) ? 1 : 0
      while (count < anchor.n && cur < end) {
        cur = addDays(cur, 1)
        if (isWork(cur.getTime())) count++
      }
      return cur
    }
    case 'nthWeekday': {
      if (anchor.n === -1) {
        let cur = end
        while (isoWeekday(cur) !== anchor.weekday) cur = addDays(cur, -1)
        return cur
      }
      let cur = start
      while (isoWeekday(cur) !== anchor.weekday) cur = addDays(cur, 1)
      const shifted = addDays(cur, 7 * (anchor.n - 1))
      return shifted > end ? cur : shifted
    }
    case 'fromStart': {
      if (!anchor.business) {
        const d = addDays(start, anchor.days)
        return d > end ? end : d
      }
      let cur = nextWork(start, isWork)
      for (let i = 0; i < anchor.days; i++) cur = nextWork(addDays(cur, 1), isWork)
      return cur > end ? prevWork(end, isWork) : cur
    }
    case 'fromEnd': {
      if (!anchor.business) {
        const d = addDays(end, -anchor.days)
        return d < start ? start : d
      }
      let cur = prevWork(end, isWork)
      for (let i = 0; i < anchor.days; i++) cur = prevWork(addDays(cur, -1), isWork)
      return cur < start ? nextWork(start, isWork) : cur
    }
  }
}

/**
 * Следующий срок по правилу. `baseTs` — срок закрываемого пункта
 * (или момент закрытия, если срока не было). Возвращает дату и
 * обновлённое правило (счётчик повторов), либо null — повторение кончилось.
 */
export function nextOccurrence(
  rule: RepeatRule,
  baseTs: number,
  isWork: IsWork,
): { date: number; rule: RepeatRule } | null {
  // Окончание «N раз»: считаем уже созданные повторы.
  if (rule.end?.type === 'count' && (rule.done ?? 0) >= rule.end.times) return null

  const base = new Date(baseTs)
  let cand: Date

  if (rule.freq === 'day') {
    cand = addDays(base, 1)
  } else if (rule.freq === 'week') {
    const wds = rule.weekdays?.length ? rule.weekdays : [isoWeekday(base)]
    cand = addDays(base, 1)
    for (let i = 0; i < 14 && !wds.includes(isoWeekday(cand)); i++) cand = addDays(cand, 1)
  } else {
    const start = nextPeriodStart(rule.freq, base)
    const { end } = periodOf(rule.freq, start)
    const anchor: Anchor = rule.anchor ?? { type: 'dom', day: base.getDate() }
    cand = anchorDate(anchor, start, end, isWork)
  }

  // Сдвиг, если попали на выходной.
  if (rule.shift === 'back') cand = prevWork(cand, isWork)
  else if (rule.shift === 'forward') cand = nextWork(cand, isWork)

  // Окончание «до даты».
  if (rule.end?.type === 'until' && at18(cand) > rule.end.date) return null

  const updated: RepeatRule =
    rule.end?.type === 'count' ? { ...rule, done: (rule.done ?? 0) + 1 } : rule
  return { date: at18(cand), rule: updated }
}

// ── Человекочитаемая строка правила ─────────────────────────

const WD_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const WD_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
const ORDINAL: Record<number, string> = { 1: 'первый', 2: 'второй', 3: 'третий', 4: 'четвёртый' }

/** «день/дня/дней» по числу. */
function daysWord(n: number): string {
  const d10 = n % 10
  const d100 = n % 100
  if (d10 === 1 && d100 !== 11) return 'день'
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'дня'
  return 'дней'
}

function anchorLabel(anchor: Anchor, freq: 'month' | 'quarter' | 'year'): string {
  switch (anchor.type) {
    case 'dom':
      if (freq === 'month') {
        return anchor.day === -1 ? 'последнее число' : `${anchor.day}-е число`
      }
      return anchor.day === -1 ? 'последний день' : `${anchor.day}-й день`
    case 'workday':
      return anchor.n === -1 ? 'последний рабочий день' : `${anchor.n}-й рабочий день`
    case 'nthWeekday':
      return `${anchor.n === -1 ? 'последний' : ORDINAL[anchor.n] ?? `${anchor.n}-й`} ${
        WD_FULL[anchor.weekday - 1]
      }`
    case 'fromStart':
      return `через ${anchor.days} ${anchor.business ? 'рабочих ' : ''}${daysWord(anchor.days)} от начала`
    case 'fromEnd':
      return `за ${anchor.days} ${anchor.business ? 'рабочих ' : ''}${daysWord(anchor.days)} до конца`
  }
}

const FREQ_LABEL: Record<RepeatRule['freq'], string> = {
  day: 'Каждый день',
  week: 'Каждую неделю',
  month: 'Каждый месяц',
  quarter: 'Каждый квартал',
  year: 'Каждый год',
}

/**
 * Правило словами: «Каждый месяц · 5-й рабочий день».
 * `short` — без хвостов про сдвиг и окончание (для строки пункта).
 */
export function ruleLabel(
  rule: RepeatRule,
  opts?: { short?: boolean; formatDate?: (ts: number) => string },
): string {
  let s = FREQ_LABEL[rule.freq]
  if (rule.freq === 'week' && rule.weekdays?.length) {
    s += ' · ' + rule.weekdays.map((w) => WD_SHORT[w - 1]).join(', ')
  }
  if ((rule.freq === 'month' || rule.freq === 'quarter' || rule.freq === 'year') && rule.anchor) {
    s += ' · ' + anchorLabel(rule.anchor, rule.freq)
  }
  if (!opts?.short) {
    if (rule.shift === 'back') s += ' · с выходного назад'
    if (rule.shift === 'forward') s += ' · с выходного вперёд'
    if (rule.end?.type === 'until' && opts?.formatDate) s += ` · до ${opts.formatDate(rule.end.date)}`
    if (rule.end?.type === 'count') s += ` · ${rule.end.times} раз`
  }
  return s
}
