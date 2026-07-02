import type { VisibleItem } from '../core/derive'
import { formatDue, formatDateShort } from '../core/time'
import { thresholds } from '../core/settings'

/**
 * Строка пункта: слева кружок-кольцо (тап — закрыть), справа текст
 * и данные (от кого ждём, срок). У «горящего» кольцо и срок красные.
 */
export function ItemRow({
  vi,
  now,
  onClose,
  onTrash,
  onOpen,
}: {
  vi: VisibleItem
  now: number
  onClose: (id: string) => void
  onTrash: (id: string) => void
  onOpen: (id: string) => void
}) {
  const { item, closing } = vi
  const hot = item.dueAt != null && item.dueAt <= now + thresholds().soonMs
  const due = formatDue(item.dueAt, now)
  // Тихая пометка следующего касания у ожиданий (графит, не красный).
  const touch =
    item.kind === 'waiting' && item.nextTouchAt != null
      ? item.nextTouchAt <= now
        ? 'пора'
        : formatDateShort(item.nextTouchAt)
      : ''
  const snoozed = item.snoozedUntil != null && item.snoozedUntil > now
    ? formatDateShort(item.snoozedUntil)
    : ''

  return (
    <div className={`row${closing ? ' row--closing' : ''}`}>
      <button
        className={`ring${hot && !closing ? ' ring--hot' : ''}${closing ? ' ring--done' : ''}`}
        aria-label={closing ? 'Закрывается' : 'Закрыть пункт'}
        onClick={() => !closing && onClose(item.id)}
      />
      <button className="row__body" onClick={() => onOpen(item.id)}>
        <div className="row__title">{item.title}</div>
        {(item.who || item.project || due || touch || snoozed) && (
          <div className="row__meta data">
            {item.who && <span className="row__who">{item.who}</span>}
            {item.project && <span className="row__project">{item.project}</span>}
            {due && <span className={`row__due${hot ? ' row__due--hot' : ''}`}>{due}</span>}
            {touch && <span className="row__touch">{touch}</span>}
            {snoozed && <span className="row__snooze">{snoozed}</span>}
          </div>
        )}
      </button>
      <button className="row__trash" aria-label="Удалить" onClick={() => onTrash(item.id)}>
        удалить
      </button>
    </div>
  )
}
