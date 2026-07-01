// Помощники по форматированию сроков. Данные (сроки) выводятся
// моноширинным шрифтом, поэтому держим форматы короткими и ровными.

const DAY = 24 * 60 * 60 * 1000

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** Абсолютная короткая дата: «12 июл». Для сроков в карточке и истории. */
export function formatDateShort(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Дата и время: «12 июл, 14:30». Для ленты истории. */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${formatDateShort(ts)}, ${hh}:${mm}`
}

/** Значение поля <input type="date"> (ГГГГ-ММ-ДД) → метка времени. */
export function dateInputToTs(value: string): number | undefined {
  if (!value) return undefined
  const d = new Date(value + 'T18:00:00') // условный «конец рабочего дня»
  return Number.isNaN(d.getTime()) ? undefined : d.getTime()
}

/** Метка времени → значение поля <input type="date"> (ГГГГ-ММ-ДД). */
export function tsToDateInput(ts: number | undefined): string {
  if (ts == null) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Начало суток для метки времени. */
function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Разница в календарных днях между `ts` и `now` (может быть отрицательной). */
export function dayDiff(ts: number, now: number): number {
  return Math.round((startOfDay(ts) - startOfDay(now)) / DAY)
}

/**
 * Короткая подпись срока для строки пункта, например:
 *  «−2д» (просрочено на 2 дня), «сегодня», «завтра», «+3д», «12 июл».
 */
export function formatDue(dueAt: number | undefined, now: number): string {
  if (dueAt == null) return ''
  const diff = dayDiff(dueAt, now)
  if (diff < -1) return `−${Math.abs(diff)}д`
  if (diff === -1) return 'вчера'
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'завтра'
  if (diff <= 6) return `+${diff}д`
  return formatDateShort(dueAt)
}
