// Демо-наполнение при самом первом запуске (если база пуста).
// Пункты подобраны так, чтобы Сводка показала все секции:
// одно горящее, одно «пора пнуть», одно «моё», одно «ожидание».

import type { Item } from './types'
import { getAllItems, putItem } from './store/store'
import { newId } from './core/ids'

export async function seedIfEmpty(): Promise<void> {
  const existing = await getAllItems()
  if (existing.length > 0) return

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const demo: Array<Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'status'>> = [
    // Горит: срок был вчера.
    { kind: 'mine', title: 'Согласовать бюджет отдела на квартал', due: now - day },
    // Пора пнуть: ждём отчёт, срок сегодня.
    { kind: 'waiting', title: 'Отчёт по продажам', who: 'Марина', due: now + day / 2 },
    // Моё без срока.
    { kind: 'mine', title: 'Подготовить повестку планёрки' },
    // Ожидание без срока.
    { kind: 'waiting', title: 'Правки в договоре', who: 'Юрист' },
  ]

  for (const d of demo) {
    const item: Item = {
      ...d,
      id: newId(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }
    await putItem(item)
  }
}
