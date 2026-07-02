import { useEngine } from '../state/engine'
import { formatDateTime } from '../core/time'

/**
 * «Входящие»: необработанные записи быстрого захвата. Тап по записи
 * открывает разбор; крестик — мягкое удаление в Корзину (с Undo).
 * Пусто — спокойное состояние.
 */
export function Inbox({
  onOpenRecord,
  onClose,
}: {
  onOpenRecord: (id: string) => void
  onClose: () => void
}) {
  const { inbox, trash } = useEngine()

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">входящие</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">Входящие{inbox.length ? ` · ${inbox.length}` : ''}</div>

        {inbox.length === 0 ? (
          <div className="inbox-empty">
            Пусто — всё разобрано.
            <div className="empty__sub">Кнопка + быстро кладёт запись сюда.</div>
          </div>
        ) : (
          <section className="section">
            {inbox.map((it) => (
              <div className="row" key={it.id}>
                <button className="row__body" onClick={() => onOpenRecord(it.id)}>
                  <div className="row__title">{it.title}</div>
                  <div className="row__meta data">{formatDateTime(it.createdAt)}</div>
                </button>
                <button
                  className="row__trash"
                  aria-label="В корзину"
                  onClick={() => trash(it.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
