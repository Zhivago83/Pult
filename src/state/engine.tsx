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
import type { Backup, DayNote, Item, Kind, Op, OpType, Person, Role } from '../types'
import { idbStore, type Store } from '../store/store'
import { newId } from '../core/id'
import { tsToDateInput } from '../core/time'
import { GRACE_MS, REMIND_SNOOZE_MS, PURGE_AFTER_MS } from '../core/constants'
import { seedItems, seedPeople } from '../core/seed'
import { spawnNext } from '../core/recur'

/** Сколько миллисекунд висит плашка «Отменить». */
const TOAST_MS = 7000

/** Версия формата бэкапа. */
const BACKUP_VERSION = 1

/** Ввод при захвате нового пункта. */
export interface CaptureInput {
  kind: Kind
  title: string
  who?: string
  project?: string
  dueAt?: number
}

/** Что можно поправить в карточке пункта. */
export type EditPatch = Partial<
  Pick<Item, 'title' | 'who' | 'project' | 'dueAt' | 'nextTouchAt' | 'repeat'>
>

/** Плашка Undo: что именно предлагаем отменить. */
export interface Pending {
  op: Op
  label: string
}

export interface Engine {
  ready: boolean
  items: Item[]
  trashed: Item[]
  /** Выполненные (закрытые) пункты — для архива. */
  done: Item[]
  /** Весь журнал операций (для истории пункта). */
  ops: Op[]
  /** Люди с ролями (команда/исполнитель). */
  people: Person[]
  /** Заметка дня на сегодня (пустая строка — не задана). */
  dayNote: string
  /** Изменить заметку дня. */
  setDayNote(text: string): void
  /** Найти пункт по id среди всех (в работе / выполнено / корзина). */
  findItem(id: string): Item | undefined
  /** Собрать полный снимок данных (для скачивания). */
  exportData(): Promise<Backup>
  /** Заменить все данные из бэкапа. */
  importData(backup: Backup): Promise<void>
  pending: Pending | null
  capture(input: CaptureInput): void
  close(id: string): void
  trash(id: string): void
  restore(id: string): void
  /** Вернуть выполненный пункт в работу. */
  reopen(id: string): void
  /** Удалить пункт из корзины навсегда (обратимо, пока висит «Отменить»). */
  purge(id: string): void
  /** Очистить всю корзину (обратимо, пока висит «Отменить»). */
  clearTrash(): void
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
  purge: 'Удалено навсегда',
  clearTrash: 'Корзина очищена',
  setNote: 'Заметка дня изменена',
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
  const [note, setNote] = useState<DayNote | null>(null)
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
      } else {
        // Авто-уборка: пункты, пролежавшие в корзине дольше срока, удаляем.
        const cutoff = now() - PURGE_AFTER_MS
        const stale = loaded.filter(
          (it) => it.status === 'trashed' && it.trashedAt != null && it.trashedAt < cutoff,
        )
        if (stale.length > 0) {
          for (const it of stale) await store.removeItem(it.id)
          const staleIds = new Set(stale.map((it) => it.id))
          loaded = loaded.filter((it) => !staleIds.has(it.id))
        }
      }
      let loadedPeople = await store.allPeople()
      if (loadedPeople.length === 0) {
        loadedPeople = seedPeople()
        for (const p of loadedPeople) await store.putPerson(p)
      }
      const loadedOps = await store.allOps()
      const loadedNote = await store.getDayNote()
      if (!alive) return
      setItems(loaded)
      setOps(loadedOps)
      setPeople(loadedPeople)
      setNote(loadedNote ?? null)
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
      project: input.project?.trim() || undefined,
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
    // Повторяющийся — сразу создаём следующий такой же пункт.
    const spawned = before.repeat ? spawnNext(before, newId(), t) : undefined
    const op: Op = { id: newId(), ts: t, type: 'close', itemId: id, before, after, spawned }
    ;(async () => {
      await store.putItem(after)
      if (spawned) await store.putItem(spawned)
      await store.putOp(op)
      setItems((prev) => {
        const updated = prev.map((it) => (it.id === id ? after : it))
        return spawned ? [...updated, spawned] : updated
      })
      setOps((prev) => [...prev, op])
      setPending({ op, label: OP_LABELS.close })
      scheduleToastHide()
    })()
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

  /** Вернуть выполненный пункт в работу. */
  function reopen(id: string) {
    const before = items.find((it) => it.id === id)
    if (!before || before.status !== 'done') return
    const t = now()
    const after: Item = {
      ...before,
      status: 'open',
      closedAt: undefined,
      graceUntil: undefined,
      updatedAt: t,
    }
    void commit('reopen', before, after)
  }

  /** Удалить пункт из корзины навсегда (обратимо через «Отменить»). */
  function purge(id: string) {
    const before = items.find((it) => it.id === id)
    if (!before || before.status !== 'trashed') return
    void commit('purge', before, null)
  }

  /** Очистить всю корзину одним действием (обратимо через «Отменить»). */
  function clearTrash() {
    const removed = items.filter((it) => it.status === 'trashed')
    if (removed.length === 0) return
    const op: Op = {
      id: newId(),
      ts: now(),
      type: 'clearTrash',
      itemId: '',
      before: null,
      after: null,
      items: removed,
    }
    ;(async () => {
      for (const it of removed) await store.removeItem(it.id)
      await store.putOp(op)
      const ids = new Set(removed.map((it) => it.id))
      setItems((prev) => prev.filter((it) => !ids.has(it.id)))
      setOps((prev) => [...prev, op])
      setPending({ op, label: OP_LABELS.clearTrash })
      scheduleToastHide()
    })()
  }

  /**
   * Поправить поля пункта. Пустые строки очищают текст, а передача
   * `dueAt: undefined` / `nextTouchAt: undefined` очищает дату. Наличие
   * ключа в patch (даже со значением undefined) значит «поменять это поле».
   */
  function edit(id: string, patch: EditPatch) {
    const before = items.find((it) => it.id === id)
    if (!before) return
    const after: Item = { ...before, updatedAt: now() }
    // Заголовок правим, только если он не пустой.
    if ('title' in patch) {
      const t = (patch.title ?? '').trim()
      if (t) after.title = t
    }
    if ('who' in patch) after.who = (patch.who ?? '').trim() || undefined
    if ('project' in patch) after.project = (patch.project ?? '').trim() || undefined
    if ('dueAt' in patch) after.dueAt = patch.dueAt
    if ('nextTouchAt' in patch) after.nextTouchAt = patch.nextTouchAt
    if ('repeat' in patch) after.repeat = patch.repeat

    // Ничего не поменялось — не засоряем журнал.
    if (
      after.title === before.title &&
      after.who === before.who &&
      after.project === before.project &&
      after.dueAt === before.dueAt &&
      after.nextTouchAt === before.nextTouchAt &&
      after.repeat === before.repeat
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

  /**
   * Отметка «напомнил»: пишем в историю и сдвигаем дату следующего
   * касания вперёд (напомнил — значит снова коснуться через несколько дней).
   */
  function markReminded(id: string) {
    const item = items.find((it) => it.id === id)
    if (!item) return
    const t = now()
    const after: Item = { ...item, nextTouchAt: t + REMIND_SNOOZE_MS, updatedAt: t }
    void commit('remind', item, after)
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

  /** Изменить заметку дня (привязана к сегодняшней дате). Отменяется как всё. */
  function setDayNote(text: string) {
    const day = tsToDateInput(now())
    const before = note
    const trimmed = text.trim()
    const after: DayNote = { text: trimmed, day }
    // Эффективно ничего не меняется — не пишем в журнал.
    const beforeEffective = before && before.day === day ? before.text : ''
    if (beforeEffective === trimmed) return
    const op: Op = {
      id: newId(),
      ts: now(),
      type: 'setNote',
      itemId: '',
      before: null,
      after: null,
      noteBefore: before,
      noteAfter: after,
    }
    ;(async () => {
      await store.putDayNote(after)
      await store.putOp(op)
      setNote(after)
      setOps((prev) => [...prev, op])
      setPending({ op, label: OP_LABELS.setNote })
      scheduleToastHide()
    })()
  }

  /** Собрать полный снимок всех данных (авторитетно — из хранилища). */
  async function exportData(): Promise<Backup> {
    const [i, o, p, n] = await Promise.all([
      store.allItems(),
      store.allOps(),
      store.allPeople(),
      store.getDayNote(),
    ])
    return { version: BACKUP_VERSION, exportedAt: now(), items: i, ops: o, people: p, dayNote: n ?? null }
  }

  /** Заменить все данные данными из бэкапа. */
  async function importData(backup: Backup) {
    if (
      !backup ||
      !Array.isArray(backup.items) ||
      !Array.isArray(backup.ops) ||
      !Array.isArray(backup.people)
    ) {
      throw new Error('Файл не похож на резервную копию Пульта.')
    }
    await store.clearAll()
    for (const it of backup.items) await store.putItem(it)
    for (const op of backup.ops) await store.putOp(op)
    for (const p of backup.people) await store.putPerson(p)
    if (backup.dayNote) await store.putDayNote(backup.dayNote)
    setItems(backup.items)
    setOps(backup.ops)
    setPeople(backup.people)
    setNote(backup.dayNote ?? null)
    setPending(null)
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
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
      } else if (op.type === 'clearTrash') {
        // Групповая очистка — возвращаем все удалённые пункты.
        const restored = op.items ?? []
        for (const it of restored) await store.putItem(it)
        setItems((prev) => [...prev, ...restored])
      } else if (op.type === 'setNote') {
        // Заметка дня — возвращаем прежний текст.
        const back = op.noteBefore ?? { text: '', day: '' }
        await store.putDayNote(back)
        setNote(op.noteBefore ?? null)
      } else {
        // Операция про пункт — возвращаем снимок «до».
        const { before, after } = op
        const id = (after ?? before)!.id
        if (before) await store.putItem(before)
        else await store.removeItem(id)
        applySnapshot(id, before)
        // Закрытие повторяющегося породило следующий пункт — убираем его.
        if (op.spawned) {
          await store.removeItem(op.spawned.id)
          const spawnedId = op.spawned.id
          setItems((prev) => prev.filter((it) => it.id !== spawnedId))
        }
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
  const done = useMemo(() => items.filter((it) => it.status === 'done'), [items])
  const active = useMemo(() => items.filter((it) => it.status !== 'trashed'), [items])
  // Заметка показывается, только если она относится к сегодняшнему дню.
  const dayNote = note && note.day === tsToDateInput(now()) ? note.text : ''

  const engine: Engine = {
    ready,
    items: active,
    trashed,
    done,
    ops,
    people,
    dayNote,
    setDayNote,
    findItem: (id: string) => items.find((it) => it.id === id),
    exportData,
    importData,
    pending,
    capture,
    close,
    trash,
    restore,
    reopen,
    purge,
    clearTrash,
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
