// ── Ядро приложения (engine) ────────────────────────────────────
// Здесь живёт вся логика изменений. Правила простые:
//   1. Любое изменение проходит через одну из функций ниже.
//   2. Каждое изменение записывается в журнал (Op) — со снимками
//      «до» и «после», чтобы его можно было отменить (Undo).
//   3. UI не трогает базу напрямую — только зовёт эти функции.
//
// Внутри держим копию всех пунктов в памяти (кэш) и оповещаем
// экраны об изменениях. Это делает интерфейс мгновенным, а база
// обновляется в фоне.

import type { Item, ItemKind, Op } from '../types'
import { newId } from './ids'
import * as store from '../store/store'

/** Сколько длится «период благодати» после закрытия пункта (мс). */
export const GRACE_MS = 6000

// ── Внутреннее состояние ────────────────────────────────────────

let items: Item[] = []
let ops: Op[] = []
let ready = false

const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

/** Подписка на изменения (для React через useSyncExternalStore). */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Текущий снимок всех пунктов (стабильная ссылка между emit). */
export function getItems(): Item[] {
  return items
}

export function getOps(): Op[] {
  return ops
}

export function isReady(): boolean {
  return ready
}

/** Загрузка данных из базы при старте. */
export async function init(): Promise<void> {
  items = await store.getAllItems()
  ops = await store.getAllOps()
  ready = true
  emit()
}

// ── Вспомогательное ─────────────────────────────────────────────

function upsertLocal(item: Item) {
  const i = items.findIndex((x) => x.id === item.id)
  if (i === -1) items = [...items, item]
  else {
    const next = items.slice()
    next[i] = item
    items = next
  }
}

async function record(op: Op) {
  ops = [...ops, op]
  await store.putOp(op)
}

// ── Операции над пунктами ───────────────────────────────────────

export async function createItem(input: {
  kind: ItemKind
  title: string
  who?: string
  due?: number
}): Promise<Item> {
  const now = Date.now()
  const item: Item = {
    id: newId(),
    kind: input.kind,
    title: input.title.trim(),
    who: input.who?.trim() || undefined,
    due: input.due,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  }
  upsertLocal(item)
  await store.putItem(item)
  await record({
    id: newId(),
    type: 'create',
    itemId: item.id,
    at: now,
    after: item,
  })
  emit()
  return item
}

/** Закрыть пункт (выполнено). Начинается «период благодати». */
export async function closeItem(id: string): Promise<void> {
  const before = items.find((x) => x.id === id)
  if (!before || before.status !== 'open') return
  const now = Date.now()
  const after: Item = { ...before, status: 'done', doneAt: now, updatedAt: now }
  upsertLocal(after)
  await store.putItem(after)
  await record({ id: newId(), type: 'close', itemId: id, at: now, before, after })
  emit()
}

/** Снова открыть закрытый пункт. */
export async function reopenItem(id: string): Promise<void> {
  const before = items.find((x) => x.id === id)
  if (!before || before.status !== 'done') return
  const now = Date.now()
  const after: Item = { ...before, status: 'open', doneAt: undefined, updatedAt: now }
  upsertLocal(after)
  await store.putItem(after)
  await record({ id: newId(), type: 'reopen', itemId: id, at: now, before, after })
  emit()
}

/** Мягкое удаление — в корзину. */
export async function trashItem(id: string): Promise<void> {
  const before = items.find((x) => x.id === id)
  if (!before || before.status === 'trashed') return
  const now = Date.now()
  const after: Item = { ...before, status: 'trashed', trashedAt: now, updatedAt: now }
  upsertLocal(after)
  await store.putItem(after)
  await record({ id: newId(), type: 'trash', itemId: id, at: now, before, after })
  emit()
}

/** Восстановить из корзины. */
export async function restoreItem(id: string): Promise<void> {
  const before = items.find((x) => x.id === id)
  if (!before || before.status !== 'trashed') return
  const now = Date.now()
  const after: Item = { ...before, status: 'open', trashedAt: undefined, updatedAt: now }
  upsertLocal(after)
  await store.putItem(after)
  await record({ id: newId(), type: 'restore', itemId: id, at: now, before, after })
  emit()
}

// ── Undo (отмена последней операции) ────────────────────────────

/** Последняя ещё не отменённая операция (для плашки «Отменить»). */
export function lastUndoable(): Op | undefined {
  for (let i = ops.length - 1; i >= 0; i--) {
    if (!ops[i].undone) return ops[i]
  }
  return undefined
}

/** Отменить конкретную операцию: вернуть пункт в состояние «до». */
export async function undo(opId: string): Promise<void> {
  const op = ops.find((o) => o.id === opId)
  if (!op || op.undone) return

  if (op.type === 'create') {
    // Отмена создания = удалить пункт полностью.
    items = items.filter((x) => x.id !== op.itemId)
    await store.deleteItem(op.itemId)
  } else if (op.before) {
    // Вернуть снимок «до».
    upsertLocal(op.before)
    await store.putItem(op.before)
  }

  const marked: Op = { ...op, undone: true }
  const i = ops.findIndex((o) => o.id === op.id)
  const next = ops.slice()
  next[i] = marked
  ops = next
  await store.putOp(marked)
  emit()
}
