// ── Хранилище (Store) на IndexedDB ──────────────────────────────
// IndexedDB — встроенная в браузер база данных. Работает офлайн и
// сохраняет данные между запусками. Всё общение с базой спрятано
// здесь, за простыми функциями. Остальной код не знает про детали.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Item, Op } from '../types'

interface PultDB extends DBSchema {
  items: {
    key: string
    value: Item
    indexes: { 'by-status': string }
  }
  ops: {
    key: string
    value: Op
    indexes: { 'by-at': number }
  }
}

const DB_NAME = 'pult'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<PultDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const items = db.createObjectStore('items', { keyPath: 'id' })
        items.createIndex('by-status', 'status')
        const ops = db.createObjectStore('ops', { keyPath: 'id' })
        ops.createIndex('by-at', 'at')
      },
    })
  }
  return dbPromise
}

// ── Пункты (Items) ──────────────────────────────────────────────

export async function getAllItems(): Promise<Item[]> {
  const db = await getDB()
  return db.getAll('items')
}

export async function getItem(id: string): Promise<Item | undefined> {
  const db = await getDB()
  return db.get('items', id)
}

export async function putItem(item: Item): Promise<void> {
  const db = await getDB()
  await db.put('items', item)
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('items', id)
}

// ── Журнал операций (Ops) ───────────────────────────────────────

export async function getAllOps(): Promise<Op[]> {
  const db = await getDB()
  const ops = await db.getAllFromIndex('ops', 'by-at')
  return ops
}

export async function putOp(op: Op): Promise<void> {
  const db = await getDB()
  await db.put('ops', op)
}

/** Полностью очистить базу — нужно только для отладки/сброса. */
export async function clearAll(): Promise<void> {
  const db = await getDB()
  await db.clear('items')
  await db.clear('ops')
}
