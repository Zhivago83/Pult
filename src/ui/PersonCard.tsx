import { useMemo, useState } from 'react'
import { useEngine } from '../state/engine'
import { roleOf, personReliability, personWaitingItems, reliabilityWords } from '../core/people'
import { personDocs, docLabel } from '../core/docs'
import { formatDue, formatDateShort } from '../core/time'
import { SOON_MS } from '../core/constants'
import { DocCard } from './DocCard'
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
  const { items, ops, people, docs, setRole } = useEngine()
  const now = useNow()
  const [openDocId, setOpenDocId] = useState<string | null>(null)

  const role = roleOf(people, name)
  const reliability = useMemo(
    () => personReliability(name, items, ops, now),
    [name, items, ops, now],
  )
  const waiting = useMemo(() => personWaitingItems(items, name), [items, name])
  const docsOf = useMemo(() => personDocs(docs, name), [docs, name])

  return (
    <>
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
              const hot = it.dueAt != null && it.dueAt <= now + SOON_MS
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

        {/* Документы, где человек — корреспондент */}
        {docsOf.length > 0 && (
          <>
            <div className="detail__histHead">Документы · {docsOf.length}</div>
            <div>
              {docsOf.map((d) => (
                <button className="row" key={d.id} onClick={() => setOpenDocId(d.id)}>
                  <div className="row__body">
                    <div className="row__title data">{docLabel(d)}</div>
                    {(d.description || d.docDate != null) && (
                      <div className="row__meta">
                        {d.description && <span>{d.description}</span>}
                        {d.docDate != null && (
                          <span className="data">{formatDateShort(d.docDate)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    {openDocId && <DocCard docId={openDocId} onClose={() => setOpenDocId(null)} />}
    </>
  )
}
