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
import type { CalEntry, Doc, Item, Op, OpType, Person, Role } from '../types'
import { idbStore, type Store } from '../store/store'
import { newId } from '../core/id'
import { docLabel } from '../core/docs'
import { makeIsWorkday } from '../core/calendar'
import { GRACE_MS } from '../core/constants'
import { seedItems, seedPeople, seedDocs } from '../core/seed'

/** Сколько миллисекунд висит плашка «Отменить». */
const TOAST_MS = 7000

/** Что можно поправить в карточке пункта / при разборе Входящих. */
export type EditPatch = Partial<Pick<Item, 'title' | 'who' | 'project' | 'dueAt' | 'kind'>>

/** Плашка Undo: что именно предлагаем отменить. */
export interface Pending {
  op: Op
  label: string
}

export interface Engine {
  ready: boolean
  items: Item[]
  trashed: Item[]
  /** Необработанные записи «Входящих» (свежие сверху). */
  inbox: Item[]
  /** Все документы (карточки с полями). */
  docs: Doc[]
  /** Отметки производственного календаря (свои нерабочие/рабочие дни). */
  calendar: CalEntry[]
  /** Рабочий ли день (с учётом выходных, праздников РФ и отметок). */
  isWorkday(ts: number): boolean
  /** Отметить день: нерабочий ('off') или рабочий-перенос ('work'). */
  addCalEntry(date: string, kind: 'off' | 'work'): void
  /** Снять отметку с дня. */
  removeCalEntry(date: string): void
  /** Весь журнал операций (для истории пункта). */
  ops: Op[]
  /** Люди с ролями (команда/исполнитель). */
  people: Person[]
  pending: Pending | null
  /** Быстрый захват: текст сразу ложится во «Входящие». */
  capture(text: string): void
  /** Разбор: запись из «Входящих» становится настоящим пунктом. */
  triage(id: string): void
  close(id: string): void
  trash(id: string): void
  restore(id: string): void
  /** Поправить поля пункта (заголовок, владелец, проект, срок, вид). */
  edit(id: string, patch: EditPatch): void
  /** Привязать существующий документ к пункту. */
  attachDoc(itemId: string, docId: string): void
  /** Создать документ и сразу привязать к пункту. */
  createAndAttachDoc(itemId: string, input: DocInput): void
  /** Отвязать документ от пункта (сам документ остаётся). */
  detachDoc(itemId: string, docId: string): void
  /** Создать пункт «Отработать <номер>» из непривязанного документа. */
  createFromDoc(docId: string): void
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
  capture: 'Записано во Входящие',
  triage: 'Разложено',
  close: 'Пункт закрыт',
  reopen: 'Пункт открыт',
  trash: 'Пункт удалён',
  restore: 'Пункт восстановлен',
  edit: 'Пункт изменён',
  comment: 'Комментарий добавлен',
  remind: 'Отмечено: напомнил',
  setRole: 'Роль изменена',
  attachDoc: 'Документ привязан',
  detachDoc: 'Документ отвязан',
  calAdd: 'День в календаре отмечен',
  calRemove: 'Отметка календаря снята',
}

/** Поля нового документа (ввод из формы «Привязать документ»). */
export interface DocInput {
  docType: string
  number: string
  docDate?: number
  correspondent?: string
  description?: string
  controlAt?: number
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
  const [docs, setDocs] = useState<Doc[]>([])
  const [calendar, setCalendar] = useState<CalEntry[]>([])
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
        // Ремонт данных: из-за старой ошибки в демо-наборе дата создания
        // могла сохраниться как 1970 год. Чиним тихо, один раз.
        const SANE = Date.UTC(2000, 0, 1)
        const repaired: Item[] = []
        loaded = loaded.map((it) => {
          if (it.createdAt >= SANE) return it
          const fixed = { ...it, createdAt: it.updatedAt >= SANE ? it.updatedAt : now() }
          repaired.push(fixed)
          return fixed
        })
        for (const it of repaired) await store.putItem(it)
      }
      let loadedPeople = await store.allPeople()
      if (loadedPeople.length === 0) {
        loadedPeople = seedPeople()
        for (const p of loadedPeople) await store.putPerson(p)
      }
      let loadedDocs = await store.allDocs()
      // Демо-документы сеем только на свежей базе (вместе с демо-пунктами).
      if (loadedDocs.length === 0 && loaded.some((it) => it.id === 'seed-6')) {
        loadedDocs = seedDocs(now())
        for (const d of loadedDocs) await store.putDoc(d)
        // Привязка демо-договора к демо-пункту «Договор с подрядчиком».
        const seed6 = loaded.find((it) => it.id === 'seed-6')
        if (seed6 && !(seed6.docIds ?? []).length) {
          const linked = { ...seed6, docIds: ['seed-doc-1'] }
          await store.putItem(linked)
          loaded = loaded.map((it) => (it.id === 'seed-6' ? linked : it))
        }
      }
      const loadedCal = await store.allCal()
      const loadedOps = await store.allOps()
      if (!alive) return
      setItems(loaded)
      setOps(loadedOps)
      setPeople(loadedPeople)
      setDocs(loadedDocs)
      setCalendar(loadedCal)
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

  /** Быстрый захват: текст сразу ложится во «Входящие» (без разбора). */
  function capture(text: string) {
    const title = text.trim()
    if (!title) return
    const t = now()
    const item: Item = {
      id: newId(),
      kind: 'mine', // уточняется при разборе
      title,
      status: 'inbox',
      createdAt: t,
      updatedAt: t,
    }
    void commit('capture', null, item)
  }

  /** Разбор: запись из «Входящих» становится настоящим пунктом. */
  function triage(id: string) {
    const before = items.find((it) => it.id === id)
    if (!before || before.status !== 'inbox') return
    const after: Item = { ...before, status: 'open', updatedAt: now() }
    void commit('triage', before, after)
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
    if (patch.kind !== undefined) clean.kind = patch.kind
    // Для даты важно наличие ключа: `dueAt: undefined` означает «очистить срок».
    if ('dueAt' in patch) clean.dueAt = patch.dueAt
    // Заголовок не может стать пустым.
    if (clean.title !== undefined && clean.title === '') delete clean.title

    const after: Item = { ...before, ...clean, updatedAt: now() }
    // Ничего не поменялось — не засоряем журнал.
    if (
      after.title === before.title &&
      after.kind === before.kind &&
      after.who === before.who &&
      after.project === before.project &&
      after.dueAt === before.dueAt
    ) {
      return
    }
    void commit('edit', before, after)
  }

  /** Привязать существующий документ к пункту. */
  function attachDoc(itemId: string, docId: string) {
    const before = items.find((it) => it.id === itemId)
    const doc = docs.find((d) => d.id === docId)
    if (!before || !doc) return
    if ((before.docIds ?? []).includes(docId)) return
    const after: Item = {
      ...before,
      docIds: [...(before.docIds ?? []), docId],
      updatedAt: now(),
    }
    void commit('attachDoc', before, after, docLabel(doc))
  }

  /** Создать документ и сразу привязать к пункту — одна операция, один Undo. */
  function createAndAttachDoc(itemId: string, input: DocInput) {
    const before = items.find((it) => it.id === itemId)
    if (!before) return
    const t = now()
    const doc: Doc = {
      id: newId(),
      docType: input.docType.trim() || 'документ',
      number: input.number.trim(),
      docDate: input.docDate,
      correspondent: input.correspondent?.trim() || undefined,
      description: input.description?.trim() || undefined,
      controlAt: input.controlAt,
      createdAt: t,
      updatedAt: t,
    }
    const after: Item = {
      ...before,
      docIds: [...(before.docIds ?? []), doc.id],
      updatedAt: t,
    }
    const op: Op = {
      id: newId(),
      ts: t,
      type: 'attachDoc',
      itemId,
      before,
      after,
      text: docLabel(doc),
      docAfter: doc, // Undo удалит и созданный документ
    }
    ;(async () => {
      await store.putDoc(doc)
      await store.putItem(after)
      await store.putOp(op)
      setDocs((prev) => [...prev, doc])
      applySnapshot(itemId, after)
      setOps((prev) => [...prev, op])
      setPending({ op, label: OP_LABELS.attachDoc })
      scheduleToastHide()
    })()
  }

  /** Отвязать документ от пункта (сам документ остаётся). */
  function detachDoc(itemId: string, docId: string) {
    const before = items.find((it) => it.id === itemId)
    const doc = docs.find((d) => d.id === docId)
    if (!before || !(before.docIds ?? []).includes(docId)) return
    const after: Item = {
      ...before,
      docIds: (before.docIds ?? []).filter((id) => id !== docId),
      updatedAt: now(),
    }
    void commit('detachDoc', before, after, doc ? docLabel(doc) : undefined)
  }

  /** Создать пункт «Отработать <номер>» из непривязанного документа. */
  function createFromDoc(docId: string) {
    const doc = docs.find((d) => d.id === docId)
    if (!doc) return
    const t = now()
    const item: Item = {
      id: newId(),
      kind: 'mine',
      title: `Отработать ${docLabel(doc)}`,
      who: doc.correspondent,
      dueAt: doc.controlAt, // срок = контрольный
      status: 'open',
      docIds: [docId],
      createdAt: t,
      updatedAt: t,
    }
    void commit('create', null, item)
  }

  /** Отметить день календаря (нерабочий/рабочий-перенос). С Undo. */
  function addCalEntry(date: string, kind: 'off' | 'work') {
    if (!date) return
    const before = calendar.find((e) => e.date === date) ?? null
    if (before && before.kind === kind) return
    const after: CalEntry = { date, kind }
    const op: Op = {
      id: newId(),
      ts: now(),
      type: 'calAdd',
      itemId: date,
      before: null,
      after: null,
      calBefore: before,
      calAfter: after,
    }
    ;(async () => {
      await store.putCal(after)
      await store.putOp(op)
      setCalendar((prev) => [...prev.filter((e) => e.date !== date), after])
      setOps((prev) => [...prev, op])
      setPending({ op, label: OP_LABELS.calAdd })
      scheduleToastHide()
    })()
  }

  /** Снять отметку календаря. С Undo. */
  function removeCalEntry(date: string) {
    const before = calendar.find((e) => e.date === date)
    if (!before) return
    const op: Op = {
      id: newId(),
      ts: now(),
      type: 'calRemove',
      itemId: date,
      before: null,
      after: null,
      calBefore: before,
      calAfter: null,
    }
    ;(async () => {
      await store.removeCal(date)
      await store.putOp(op)
      setCalendar((prev) => prev.filter((e) => e.date !== date))
      setOps((prev) => [...prev, op])
      setPending({ op, label: OP_LABELS.calRemove })
      scheduleToastHide()
    })()
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
      if (op.type === 'calAdd' || op.type === 'calRemove') {
        // Операция про календарь — возвращаем прежнюю отметку.
        if (op.calBefore) {
          await store.putCal(op.calBefore)
          const back = op.calBefore
          setCalendar((prev) => [...prev.filter((e) => e.date !== back.date), back])
        } else {
          await store.removeCal(op.itemId)
          setCalendar((prev) => prev.filter((e) => e.date !== op.itemId))
        }
      } else if (op.type === 'setRole') {
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
        // Привязка создала документ — убираем и его.
        if (op.type === 'attachDoc' && op.docAfter) {
          const docId = op.docAfter.id
          await store.removeDoc(docId)
          setDocs((prev) => prev.filter((d) => d.id !== docId))
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

  const isWorkday = useMemo(() => makeIsWorkday(calendar), [calendar])
  const trashed = useMemo(() => items.filter((it) => it.status === 'trashed'), [items])
  const active = useMemo(() => items.filter((it) => it.status !== 'trashed'), [items])
  const inbox = useMemo(
    () =>
      items
        .filter((it) => it.status === 'inbox')
        .sort((a, b) => b.createdAt - a.createdAt),
    [items],
  )

  const engine: Engine = {
    ready,
    items: active,
    trashed,
    inbox,
    docs,
    calendar,
    isWorkday,
    addCalEntry,
    removeCalEntry,
    ops,
    people,
    pending,
    capture,
    triage,
    close,
    trash,
    restore,
    edit,
    attachDoc,
    createAndAttachDoc,
    detachDoc,
    createFromDoc,
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
