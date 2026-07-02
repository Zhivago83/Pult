// ─────────────────────────────────────────────────────────────
//  ЯДРО (движок): op-log, Undo, период благодати, корзина
//  Здесь живёт вся логика изменений. Каждое действие:
//    1) вычисляет снимок «до» и «после»,
//    2) сохраняет пункт и запись Op в хранилище (журнал),
//    3) показывает плашку «Отменить».
//  Undo возвращает состояние «до» из последней записи журнала.
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Item, Kind, Op, OpType, Person, Role } from '../types'
import { idbStore, type Store } from '../store/store'
import { newId } from '../core/id'
import { GRACE_MS } from '../core/constants'
import { seedItems, seedPeople } from '../core/seed'

/** Сколько миллисекунд висит плашка «Отменить». */
const TOAST_MS = 7000

/** Ввод при захвате нового пункта. */
export interface CaptureInput {
  kind: Kind
  title: string
  who?: string
  dueAt?: number
}

/** Что можно поправить в карточке пункта. */
export type EditPatch = Partial<Pick<Item, 'title' | 'who' | 'project' | 'dueAt'>>

/** Плашка Undo: что именно предлагаем отменить. */
export interface Pending {
  op: Op
  label: string
}

export interface Engine {
  ready: boolean
  items: Item[]
  trashed: Item[]
  /** Весь журнал операций (для истории пункта). */
  ops: Op[]
  /** Люди с ролями (команда/исполнитель). */
  people: Person[]
  pending: Pending | null
  capture(input: CaptureInput): void
  close(id: string): void
  trash(id: string): void
  restore(id: string): void
  /** Поправить поля пункта (заголовок, владелец, проект, срок). */
  edit(id: string, patch: EditPatch): void
  /** Добавить комментарий в историю пункта. */
  addComment(id: string, text: string): void
  /** Отметка «напомнил» — запись в историю (для «жду от кого-то»). */
  markReminded(id: string): void
  /** Сменить роль человека (команда/исполнитель). */
  setRole(name: string, role: Role): void
  undo(): void
  dismissToast(): void
}

const EngineContext = createContext<Engine | null>(null)

// Ярлыки действий для плашки Undo — простыми словами.
const OP_LABELS: Record<OpType, string> = {
  create: 'Пункт создан',
  close: 'Пункт закрыт',
  reopen: 'Пункт открыт',
  trash: 'Пункт удалён',
  restore: 'Пункт восстановлен',
  edit: 'Пункт изменён',
  comment: 'Комментарий добавлен',
  remind: 'Отмечено: напомнил',
  setRole: 'Роль изменена',
}

export function EngineProvider({
  children,
  store = idbStore,
  now = () => Date.now(),
}: {
  children: ReactNode
  store?: Store
  now?: () => number
}) {
  const [ready, setReady] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [ops, setOps] = useState<Op[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const toastTimer = useRef<number | null>(null)

  // Загрузка из хранилища при старте. Если пусто — засеваем демо-данные.
  useEffect(() => {
    let alive = true
    ;(async () => {
      let loaded = await store.allItems()
      if (loaded.length === 0) {
        loaded = seedItems(now())
        for (const it of loaded) await store.putItem(it)
      }
      let loadedPeople = await store.allPeople()
      if (loadedPeople.length === 0) {
        loadedPeople = seedPeople()
        for (const p of loadedPeople) await store.putPerson(p)
      }
      const loadedOps = await store.allOps()
      if (!alive) return
      setItems(loaded)
      setOps(loadedOps)
      setPeople(loadedPeople)
      setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [store, now])

  // ── Внутренняя кухня ──────────────────────────────────────

  function scheduleToastHide() {
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setPending(null), TOAST_MS)
  }

  /** Применить снимок к состоянию: заменить, добавить или убрать пункт. */
  function applySnapshot(id: string, snapshot: Item | null) {
    setItems((prev) => {
      const without = prev.filter((it) => it.id !== id)
      return snapshot ? [...without, snapshot] : without
    })
  }

  /** Записать операцию: сохранить пункт + запись журнала + показать Undo. */
  async function commit(type: OpType, before: Item | null, after: Item | null, text?: string) {
    const itemId = (after ?? before)!.id
    const op: Op = { id: newId(), ts: now(), type, itemId, before, after, text }
    if (after) await store.putItem(after)
    else await store.removeItem(itemId)
    await store.putOp(op)
    applySnapshot(itemId, after)
    setOps((prev) => [...prev, op])
    setPending({ op, label: OP_LABELS[type] })
    scheduleToastHide()
  }

  // ── Публичные действия ────────────────────────────────────

  function capture(input: CaptureInput) {
    const t = now()
    const item: Item = {
      id: newId(),
      kind: input.kind,
      title: input.title.trim(),
      who: input.who?.trim() || undefined,
      dueAt: input.dueAt,
      status: 'open',
      createdAt: t,
      updatedAt: t,
    }
    void commit('create', null, item)
  }

  function close(id: string) {
    const before = items.find((it) => it.id === id)
    if (!before || before.status !== 'open') return
    const t = now()
    const after: Item = {
      ...before,
      status: 'done',
      closedAt: t,
      graceUntil: t + GRACE_MS, // period благодати: 6 секунд зачёркнут
      updatedAt: t,
    }
    void commit('close', before, after)
  }

  function trash(id: string) {
    const before = items.find((it) => it.id === id)
    if (!before) return
    const t = now()
    const after: Item = {
      ...before,
      status: 'trashed',
      trashedAt: t,
      graceUntil: undefined,
      updatedAt: t,
    }
    void commit('trash', before, after)
  }

  function restore(id: string) {
    const before = items.find((it) => it.id === id)
    if (!before) return
    const t = now()
    const after: Item = {
      ...before,
      status: 'open',
      trashedAt: undefined,
      closedAt: undefined,
      graceUntil: undefined,
      updatedAt: t,
    }
    void commit('restore', before, after)
  }

  /** Поправить поля пункта. Пустые строки очищают значение. */
  function edit(id: string, patch: EditPatch) {
    const before = items.find((it) => it.id === id)
    if (!before) return
    const clean: EditPatch = {}
    if (patch.title !== undefined) clean.title = patch.title.trim()
    if (patch.who !== undefined) clean.who = patch.who.trim() || undefined
    if (patch.project !== undefined) clean.project = patch.project.trim() || undefined
    // Для даты важно наличие ключа: `dueAt: undefined` означает «очистить срок».
    if ('dueAt' in patch) clean.dueAt = patch.dueAt
    // Заголовок не может стать пустым.
    if (clean.title !== undefined && clean.title === '') delete clean.title

    const after: Item = { ...before, ...clean, updatedAt: now() }
    // Ничего не поменялось — не засоряем журнал.
    if (
      after.title === before.title &&
      after.who === before.who &&
      after.project === before.project &&
      after.dueAt === before.dueAt
    ) {
      return
    }
    void commit('edit', before, after)
  }

  /** Добавить комментарий в историю пункта (пункт не меняется). */
  function addComment(id: string, text: string) {
    const item = items.find((it) => it.id === id)
    const trimmed = text.trim()
    if (!item || !trimmed) return
    void commit('comment', item, { ...item, updatedAt: now() }, trimmed)
  }

  /** Отметка «напомнил»: запись в историю (для «жду от кого-то»). */
  function markReminded(id: string) {
    const item = items.find((it) => it.id === id)
    if (!item) return
    void commit('remind', item, { ...item, updatedAt: now() })
  }

  /** Применить снимок человека к состоянию (заменить/добавить/убрать). */
  function applyPerson(name: string, snapshot: Person | null) {
    setPeople((prev) => {
      const without = prev.filter((p) => p.name !== name)
      return snapshot ? [...without, snapshot] : without
    })
  }

  /** Сменить роль человека. Идёт через журнал, отменяется как и всё. */
  function setRole(name: string, role: Role) {
    const before = people.find((p) => p.name === name) ?? null
    if (before && before.role === role) return
    const after: Person = { name, role }
    const op: Op = {
      id: newId(),
      ts: now(),
      type: 'setRole',
      itemId: name,
      before: null,
      after: null,
      personBefore: before,
      personAfter: after,
    }
    ;(async () => {
      await store.putPerson(after)
      await store.putOp(op)
      applyPerson(name, after)
      setOps((prev) => [...prev, op])
      setPending({ op, label: OP_LABELS.setRole })
      scheduleToastHide()
    })()
  }

  /** Отменить последнее действие: вернуть снимок «до». */
  function undo() {
    if (!pending) return
    const op = pending.op
    const undoneOp: Op = { ...op, undone: true }
    ;(async () => {
      if (op.type === 'setRole') {
        // Операция про человека — откатываем роль.
        if (op.personBefore) await store.putPerson(op.personBefore)
        else await store.removePerson(op.itemId)
        applyPerson(op.itemId, op.personBefore ?? null)
      } else {
        // Операция про пункт — возвращаем снимок «до».
        const { before, after } = op
        const id = (after ?? before)!.id
        if (before) await store.putItem(before)
        else await store.removeItem(id)
        applySnapshot(id, before)
      }
      await store.putOp(undoneOp)
      setOps((prev) => prev.map((o) => (o.id === undoneOp.id ? undoneOp : o)))
      setPending(null)
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    })()
  }

  function dismissToast() {
    setPending(null)
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
  }

  const trashed = useMemo(() => items.filter((it) => it.status === 'trashed'), [items])
  const active = useMemo(() => items.filter((it) => it.status !== 'trashed'), [items])

  const engine: Engine = {
    ready,
    items: active,
    trashed,
    ops,
    people,
    pending,
    capture,
    close,
    trash,
    restore,
    edit,
    addComment,
    markReminded,
    setRole,
    undo,
    dismissToast,
  }

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>
}

export function useEngine(): Engine {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useEngine нужно вызывать внутри <EngineProvider>')
  return ctx
}
