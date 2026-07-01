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
import type { Item, Kind, Op, OpType } from '../types'
import { idbStore, type Store } from '../store/store'
import { newId } from '../core/id'
import { GRACE_MS } from '../core/constants'
import { seedItems } from '../core/seed'

/** Сколько миллисекунд висит плашка «Отменить». */
const TOAST_MS = 7000

/** Ввод при захвате нового пункта. */
export interface CaptureInput {
  kind: Kind
  title: string
  who?: string
  dueAt?: number
}

/** Плашка Undo: что именно предлагаем отменить. */
export interface Pending {
  op: Op
  label: string
}

export interface Engine {
  ready: boolean
  items: Item[]
  trashed: Item[]
  pending: Pending | null
  capture(input: CaptureInput): void
  close(id: string): void
  trash(id: string): void
  restore(id: string): void
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
  const [pending, setPending] = useState<Pending | null>(null)
  const toastTimer = useRef<number | null>(null)

  // Загрузка из хранилища при старте. Если пусто — засеваем демо-пункты.
  useEffect(() => {
    let alive = true
    ;(async () => {
      let loaded = await store.allItems()
      if (loaded.length === 0) {
        loaded = seedItems(now())
        for (const it of loaded) await store.putItem(it)
      }
      if (!alive) return
      setItems(loaded)
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
  async function commit(type: OpType, before: Item | null, after: Item | null) {
    const itemId = (after ?? before)!.id
    const op: Op = { id: newId(), ts: now(), type, itemId, before, after }
    if (after) await store.putItem(after)
    else await store.removeItem(itemId)
    await store.putOp(op)
    applySnapshot(itemId, after)
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

  /** Отменить последнее действие: вернуть снимок «до». */
  function undo() {
    if (!pending) return
    const { before, after } = pending.op
    const id = (after ?? before)!.id
    ;(async () => {
      if (before) await store.putItem(before)
      else await store.removeItem(id)
      const undoneOp: Op = { ...pending.op, undone: true }
      await store.putOp(undoneOp)
      applySnapshot(id, before)
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
    pending,
    capture,
    close,
    trash,
    restore,
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
