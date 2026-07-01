// Короткое человекочитаемое представление срока.
// Возвращает строку для показа моноширинным шрифтом.

export function formatDue(due: number | undefined, now: number): string {
  if (due === undefined) return ''
  const dayMs = 24 * 60 * 60 * 1000
  const startOf = (t: number) => {
    const d = new Date(t)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const days = Math.round((startOf(due) - startOf(now)) / dayMs)

  if (due < now) {
    // Просрочено — считаем на сколько.
    if (days === 0) return 'сегодня'
    if (days === -1) return 'вчера'
    return `−${Math.abs(days)} дн`
  }
  if (days === 0) return 'сегодня'
  if (days === 1) return 'завтра'
  if (days < 7) return `+${days} дн`

  const d = new Date(due)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}
