// Демо-пункты для первого запуска: чтобы Сводка не была пустой
// и сразу показывала все секции. Засеваются один раз (когда база
// пуста) и дальше живут как обычные данные — их можно закрыть/удалить.

import type { Doc, Item, Person } from '../types'

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
      // Повтор из брифа: «Каждый квартал · 5-й рабочий день»
      repeat: { freq: 'quarter', anchor: { type: 'workday', n: 5 }, shift: 'none', end: { type: 'never' } },
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
    base({
      id: 'seed-8',
      kind: 'mine',
      title: 'Перезвонить банку про эквайринг',
      status: 'inbox', // запись во «Входящих» — ждёт разбора
      ago: 1 * HOUR,
    }),
  ]
}

/**
 * Демо-документы для первого запуска (сеются вместе с демо-пунктами):
 * договор привязан к пункту «Договор с подрядчиком», а входящее письмо
 * с контрольным сроком — не привязано, чтобы показать кнопку «Отработать».
 */
export function seedDocs(now: number): Doc[] {
  return [
    {
      id: 'seed-doc-1',
      docType: 'договор',
      number: '42-П',
      docDate: now - 6 * DAY,
      correspondent: 'Пётр',
      description: 'Договор подряда на ремонт офиса',
      createdAt: now - 6 * DAY,
      updatedAt: now - 6 * DAY,
    },
    {
      id: 'seed-doc-2',
      docType: 'входящее',
      number: '118',
      docDate: now - 1 * DAY,
      correspondent: 'Игорь',
      description: 'Запрос допматериалов к презентации',
      controlAt: now + 3 * DAY, // не привязан → предложим «Отработать № 118»
      createdAt: now - 1 * DAY,
      updatedAt: now - 1 * DAY,
    },
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
