import { useMemo } from 'react'
import { useEngine } from '../state/engine'
import { roleOf, personReliability, personWaitingItems, reliabilityWords } from '../core/people'
import { formatDue } from '../core/time'
import { thresholds } from '../core/settings'
import { useNow } from './useNow'

/**
 * Карточка человека: имя, роль (команда/исполнитель, переключается и
 * отменяется через Undo), надёжность словами и список всех ожиданий —
 * тап по ожиданию открывает карточку пункта.
 */
export function PersonCard({
  name,
  onOpenItem,
  onClose,
}: {
  name: string
  onOpenItem: (id: string) => void
  onClose: () => void
}) {
  const { items, ops, people, setRole } = useEngine()
  const now = useNow()

  const role = roleOf(people, name)
  const reliability = useMemo(
    () => personReliability(name, items, ops, now),
    [name, items, ops, now],
  )
  const waiting = useMemo(() => personWaitingItems(items, name), [items, name])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">{role === 'team' ? 'команда' : 'исполнитель'}</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">{name}</div>

        <div className={`person__rel data${reliability === 'missed' ? ' hot' : ''}`}>
          {reliabilityWords(reliability)}
        </div>

        {/* Роль — переключатель (меняется через журнал, отменяется Undo) */}
        <div className="segmented person__role">
          <button
            className={role === 'team' ? 'is-active' : ''}
            onClick={() => setRole(name, 'team')}
          >
            Команда
          </button>
          <button
            className={role === 'contractor' ? 'is-active' : ''}
            onClick={() => setRole(name, 'contractor')}
          >
            Исполнитель
          </button>
        </div>

        <div className="detail__histHead">Ожидания · {waiting.length}</div>
        {waiting.length === 0 ? (
          <div className="timeline__empty">Открытых ожиданий нет.</div>
        ) : (
          <div className="person__list">
            {waiting.map((it) => {
              const hot = it.dueAt != null && it.dueAt <= now + thresholds().soonMs
              const due = formatDue(it.dueAt, now)
              return (
                <button className="row" key={it.id} onClick={() => onOpenItem(it.id)}>
                  <div className="row__body">
                    <div className="row__title">{it.title}</div>
                    {(it.project || due) && (
                      <div className="row__meta data">
                        {it.project && <span className="row__project">{it.project}</span>}
                        {due && (
                          <span className={`row__due${hot ? ' row__due--hot' : ''}`}>{due}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
