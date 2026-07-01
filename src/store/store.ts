// ─────────────────────────────────────────────────────────────
//  СЛОЙ ХРАНИЛИЩА
//  Данные лежат за интерфейсом Store. Сейчас реализация — на
//  IndexedDB (браузерная база, работает офлайн). В будущем можно
//  подставить другую реализацию (например, с синхронизацией),
//  не трогая ядро и экраны.
// ─────────────────────────────────────────────────────────────

import { openDB, type IDBPDatabase } from 'idb'
import type { Item, Op, Person } from '../types'

/** Контракт хранилища — то, что нужно ядру приложения. */
export interface Store {
  allItems(): Promise<Item[]>
  putItem(item: Item): Promise<void>
  removeItem(id: string): Promise<void>
  allOps(): Promise<Op[]>
  putOp(op: Op): Promise<void>
  allPeople(): Promise<Person[]>
  putPerson(person: Person): Promise<void>
  removePerson(name: string): Promise<void>
}

const DB_NAME = 'pult'
const DB_VERSION = 2
const ITEMS = 'items'
const OPS = 'ops'
const PEOPLE = 'people'

let dbPromise: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(ITEMS)) {
          database.createObjectStore(ITEMS, { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains(OPS)) {
          const ops = database.createObjectStore(OPS, { keyPath: 'id' })
          ops.createIndex('by-ts', 'ts')
        }
        // Добавлено во 2-й версии: люди (роль команда/исполнитель).
        if (!database.objectStoreNames.contains(PEOPLE)) {
          database.createObjectStore(PEOPLE, { keyPath: 'name' })
        }
      },
    })
  }
  return dbPromise
}

/** Реализация Store поверх IndexedDB. */
export const idbStore: Store = {
  async allItems() {
    return (await db()).getAll(ITEMS) as Promise<Item[]>
  },
  async putItem(item) {
    await (await db()).put(ITEMS, item)
  },
  async removeItem(id) {
    await (await db()).delete(ITEMS, id)
  },
  async allOps() {
    return (await db()).getAllFromIndex(OPS, 'by-ts') as Promise<Op[]>
  },
  async putOp(op) {
    await (await db()).put(OPS, op)
  },
  async allPeople() {
    return (await db()).getAll(PEOPLE) as Promise<Person[]>
  },
  async putPerson(person) {
    await (await db()).put(PEOPLE, person)
  },
  async removePerson(name) {
    await (await db()).delete(PEOPLE, name)
  },
}
