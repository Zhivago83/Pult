// ─────────────────────────────────────────────────────────────
//  ЯДРО: поиск по пунктам
//  Ищем подстроку в заголовке, имени и проекте — по всем пунктам,
//  включая архив и корзину. Чистая функция.
// ─────────────────────────────────────────────────────────────

import type { Item, Status } from '../types'

/** Где находится пункт — словами, для пометки в результатах. */
export function statusLabel(status: Status): string {
  switch (status) {
    case 'open':
      return 'в работе'
    case 'done':
      return 'выполнено'
    case 'trashed':
      return 'в корзине'
  }
}

/** Найти пункты по запросу. Пустой запрос — пустой результат. */
export function searchItems(items: Item[], query: string): Item[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matched = items.filter((it) => {
    const hay = `${it.title} ${it.who ?? ''} ${it.project ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
  // Сначала «в работе», потом выполненные, потом корзина; внутри — свежие выше.
  const rank = (it: Item) => (it.status === 'open' ? 0 : it.status === 'done' ? 1 : 2)
  return matched.sort((a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt)
}
