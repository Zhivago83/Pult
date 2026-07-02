// Демо-пункты для первого запуска: чтобы Сводка не была пустой
// и сразу показывала все секции. Засеваются один раз (когда база
// пуста) и дальше живут как обычные данные — их можно закрыть/удалить.

import type { Item, Person } from '../types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export function seedItems(now: number): Item[] {
  // `ago` — сколько времени назад создан пункт. Считаем createdAt ПОСЛЕ
  // спреда, чтобы ничто его не затёрло (раньше тут была ошибка: в базу
  // попадало «сырое» смещение, и даты создания показывались как 1970 год).
  const base = ({ ago, ...over }: Partial<Item> & { ago: number }): Item => ({
    id: over.id!,
    kind: over.kind!,
    title: over.title!,
    status: 'open',
    ...over,
    createdAt: now - ago,
    updatedAt: now,
  })

  return [
    base({
      id: 'seed-1',
      kind: 'mine',
      title: 'Согласовать бюджет отдела на квартал',
      project: 'Бюджет',
      dueAt: now - 6 * HOUR, // просрочено → «горит» (красное)
      ago: 3 * DAY,
    }),
    base({
      id: 'seed-2',
      kind: 'waiting',
      title: 'Отчёт по продажам за июнь',
      who: 'Марина',
      project: 'Отчётность',
      dueAt: now + 2 * DAY, // ожидание на подходе → «пора пнуть»
      ago: 4 * DAY,
    }),
    base({
      id: 'seed-3',
      kind: 'mine',
      title: 'Подготовить план найма на III квартал',
      dueAt: now + 5 * DAY, // спокойное «моё»
      ago: 1 * DAY,
    }),
    base({
      id: 'seed-4',
      kind: 'waiting',
      title: 'Правки в презентацию для правления',
      who: 'Игорь',
      // без срока, свежее → спокойное «Ожидания»
      ago: 4 * HOUR,
    }),
    base({
      id: 'seed-5',
      kind: 'waiting',
      title: 'Смета на ремонт офиса',
      who: 'Марина',
      project: 'Ремонт офиса',
      dueAt: now + 6 * DAY,
      ago: 2 * DAY,
    }),
    base({
      id: 'seed-6',
      kind: 'waiting',
      title: 'Договор с подрядчиком',
      who: 'Пётр',
      project: 'Ремонт офиса',
      dueAt: now - 1 * DAY, // просрочено → у Петра «срывал срок» (красное)
      ago: 5 * DAY,
    }),
    base({
      id: 'seed-7',
      kind: 'mine',
      title: 'Выбрать подрядчика на ремонт',
      project: 'Ремонт офиса',
      status: 'done', // уже сделано → у «Ремонта офиса» виден прогресс 1/3
      closedAt: now - 2 * DAY,
      ago: 6 * DAY,
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
