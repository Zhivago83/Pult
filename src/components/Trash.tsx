// Корзина — нижний лист. Показывает мягко удалённые пункты и даёт
// вернуть каждый обратно.

import { useItems } from '../core/hooks'
import { restoreItem } from '../core/engine'

export function Trash({ onClose }: { onClose: () => void }) {
  const items = useItems()
  const trashed = items
    .filter((it) => it.status === 'trashed')
    .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="sheet-title">Корзина</h2>

        {trashed.length === 0 ? (
          <div className="empty" style={{ padding: '40px 0' }}>
            Пусто
          </div>
        ) : (
          trashed.map((it) => (
            <div className="trash-item" key={it.id}>
              <span className="t-title">{it.title}</span>
              <button onClick={() => restoreItem(it.id)}>Вернуть</button>
            </div>
          ))
        )}

        <div className="sheet-actions">
          <button className="btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
