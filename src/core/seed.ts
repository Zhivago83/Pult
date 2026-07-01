// Демо-пункты для первого запуска: чтобы Сводка не была пустой
// и сразу показывала все секции. Засеваются один раз (когда база
// пуста) и дальше живут как обычные данные — их можно закрыть/удалить.

import type { Item } from '../types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export function seedItems(now: number): Item[] {
  const base = (over: Partial<Item>): Item => ({
    id: over.id!,
    kind: over.kind!,
    title: over.title!,
    status: 'open',
    createdAt: now - over.createdAt! * 1,
    updatedAt: now,
    ...over,
  })

  return [
    base({
      id: 'seed-1',
      kind: 'mine',
      title: 'Согласовать бюджет отдела на квартал',
      dueAt: now - 6 * HOUR, // просрочено → «горит» (красное)
      createdAt: 3 * DAY,
    }),
    base({
      id: 'seed-2',
      kind: 'waiting',
      title: 'Отчёт по продажам за июнь',
      who: 'Марина',
      dueAt: now + 2 * DAY, // ожидание на подходе → «пора пнуть»
      createdAt: 4 * DAY,
    }),
    base({
      id: 'seed-3',
      kind: 'mine',
      title: 'Подготовить план найма на III квартал',
      dueAt: now + 5 * DAY, // спокойное «моё»
      createdAt: 1 * DAY,
    }),
    base({
      id: 'seed-4',
      kind: 'waiting',
      title: 'Правки в презентацию для правления',
      who: 'Игорь',
      // без срока, свежее → спокойное «Ожидания»
      createdAt: 4 * HOUR,
    }),
  ]
}
