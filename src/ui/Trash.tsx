import { useEngine } from '../state/engine'

/** Корзина: мягко удалённые пункты с возможностью восстановить. */
export function Trash({ onClose }: { onClose: () => void }) {
  const { trashed, restore } = useEngine()

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Корзина</div>

        {trashed.length === 0 ? (
          <div className="trash-empty">Корзина пуста.</div>
        ) : (
          <div className="trash-list">
            {trashed.map((item) => (
              <div className="row" key={item.id}>
                <div className="row__body">
                  <div className="row__title">{item.title}</div>
                  {item.who && <div className="row__meta data">{item.who}</div>}
                </div>
                <button className="row__trash" onClick={() => restore(item.id)}>
                  восстановить
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
