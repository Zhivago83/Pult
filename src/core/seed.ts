// Демо-пункты для первого запуска: чтобы Сводка не была пустой
// и сразу показывала все секции. Засеваются один раз (когда база
// пуста) и дальше живут как обычные данные — их можно закрыть/удалить.

import type { Item, Person } from '../types'

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
      project: 'Бюджет',
      dueAt: now - 6 * HOUR, // просрочено → «горит» (красное)
      createdAt: 3 * DAY,
    }),
    base({
      id: 'seed-2',
      kind: 'waiting',
      title: 'Отчёт по продажам за июнь',
      who: 'Марина',
      project: 'Отчётность',
      dueAt: now + 2 * DAY,
      nextTouchAt: now + 3 * DAY, // касание запланировано, пинать пока рано
      createdAt: 4 * DAY,
    }),
    base({
      id: 'seed-3',
      kind: 'mine',
      title: 'Подготовить план найма на III квартал',
      project: 'Найм',
      dueAt: now + 5 * DAY, // спокойное «моё»
      createdAt: 1 * DAY,
    }),
    base({
      id: 'seed-4',
      kind: 'waiting',
      title: 'Правки в презентацию для правления',
      who: 'Игорь',
      // без срока, но пора коснуться → попадёт в «Пора пнуть»
      nextTouchAt: now - 2 * HOUR,
      createdAt: 4 * HOUR,
    }),
    base({
      id: 'seed-5',
      kind: 'mine',
      title: 'Смета на ремонт офиса',
      project: 'Ремонт офиса',
      dueAt: now + 6 * DAY,
      createdAt: 2 * DAY,
    }),
    base({
      id: 'seed-6',
      kind: 'waiting',
      title: 'Договор с подрядчиком',
      who: 'Пётр',
      project: 'Ремонт офиса',
      dueAt: now - 1 * DAY, // просрочено → у Петра «срывал срок» (красное)
      createdAt: 5 * DAY,
    }),
  ]
}

/**
 * Демо-роли людей для первого запуска: Марина — команда, Игорь и Пётр —
 * исполнители. Так на экране «Жду → По людям» сразу видно обе группы.
 */
export function seedPeople(): Person[] {
  return [
    { name: 'Марина', role: 'team' },
    { name: 'Игорь', role: 'contractor' },
    { name: 'Пётр', role: 'contractor' },
  ]
}
