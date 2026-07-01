// Помощники по форматированию сроков. Данные (сроки) выводятся
// моноширинным шрифтом, поэтому держим форматы короткими и ровными.

const DAY = 24 * 60 * 60 * 1000

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
  const d = new Date(dueAt)
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${d.getDate()} ${months[d.getMonth()]}`
}
