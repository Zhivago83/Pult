import { useMemo, useState } from 'react'
import { useEngine } from '../state/engine'
import { buildPeople, reliabilityWords, type PersonRow } from '../core/people'
import { ItemRow } from './ItemRow'
import { useNow } from './useNow'

/**
 * Экран «Жду»: переключатель «Список / По людям».
 * Список — плоский перечень ожиданий. По людям — две группы
 * (Команда / Исполнители) со счётчиками и надёжностью словами.
 */
export function Waiting({
  onOpenItem,
  onOpenPerson,
}: {
  onOpenItem: (id: string) => void
  onOpenPerson: (name: string) => void
}) {
  const { items, ops, people, close, trash } = useEngine()
  const now = useNow()
  const [mode, setMode] = useState<'list' | 'people'>('list')

  // Видимые ожидания: открытые + те, что доживают период благодати.
  const listItems = useMemo(
    () =>
      items
        .filter(
          (it) =>
            it.kind === 'waiting' &&
            (it.status === 'open' ||
              (it.status === 'done' && it.graceUntil != null && it.graceUntil > now)),
        )
        .map((it) => ({ item: it, closing: it.status === 'done' }))
        .sort((a, b) => (a.item.dueAt ?? Infinity) - (b.item.dueAt ?? Infinity)),
    [items, now],
  )

  const groups = useMemo(() => buildPeople(items, ops, people, now), [items, ops, people, now])
  const noPeople = groups.team.length === 0 && groups.contractors.length === 0

  return (
    <>
      <div className="segmented segmented--tabs">
        <button className={mode === 'list' ? 'is-active' : ''} onClick={() => setMode('list')}>
          Список
        </button>
        <button className={mode === 'people' ? 'is-active' : ''} onClick={() => setMode('people')}>
          По людям
        </button>
      </div>

      {mode === 'list' ? (
        listItems.length === 0 ? (
          <div className="empty">Нет ожиданий.</div>
        ) : (
          <section className="section">
            {listItems.map((vi) => (
              <ItemRow
                key={vi.item.id}
                vi={vi}
                now={now}
                onClose={close}
                onTrash={trash}
                onOpen={onOpenItem}
              />
            ))}
          </section>
        )
      ) : noPeople ? (
        <div className="empty">Пока некого ждать.</div>
      ) : (
        <>
          <PeopleGroup title="Команда" rows={groups.team} onOpenPerson={onOpenPerson} />
          <PeopleGroup title="Исполнители" rows={groups.contractors} onOpenPerson={onOpenPerson} />
        </>
      )}
    </>
  )
}

function PeopleGroup({
  title,
  rows,
  onOpenPerson,
}: {
  title: string
  rows: PersonRow[]
  onOpenPerson: (name: string) => void
}) {
  if (rows.length === 0) return null
  return (
    <section className="section">
      <div className="section__head">{title}</div>
      {rows.map((r) => (
        <button className="prow" key={r.name} onClick={() => onOpenPerson(r.name)}>
          <div className="prow__name">{r.name}</div>
          <div className="prow__meta data">
            <span>жду {r.waiting}</span>
            {r.overdue > 0 && <span className="hot">{r.overdue} просрочено</span>}
            <span className={`prow__rel${r.reliability === 'missed' ? ' hot' : ''}`}>
              {reliabilityWords(r.reliability)}
            </span>
          </div>
        </button>
      ))}
    </section>
  )
}
