import { useEngine } from '../state/engine'

/**
 * Корзина: мягко удалённые пункты. Можно восстановить, удалить навсегда
 * поштучно или очистить целиком. Любое удаление обратимо, пока висит
 * плашка «Отменить». Старое (более 30 дней) убирается автоматически.
 */
export function Trash({ onClose }: { onClose: () => void }) {
  const { trashed, restore, purge, clearTrash } = useEngine()

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Корзина</div>

        {trashed.length === 0 ? (
          <div className="trash-empty">Корзина пуста.</div>
        ) : (
          <>
            <div className="trash-list">
              {trashed.map((item) => (
                <div className="row" key={item.id}>
                  <div className="row__body">
                    <div className="row__title">{item.title}</div>
                    {item.who && <div className="row__meta data">{item.who}</div>}
                  </div>
                  <div className="trash-actions">
                    <button className="linkbtn" onClick={() => restore(item.id)}>
                      восстановить
                    </button>
                    <button className="linkbtn linkbtn--danger" onClick={() => purge(item.id)}>
                      удалить навсегда
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="trash-note">Старое (более 30 дней) убирается само.</div>
          </>
        )}

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Закрыть
          </button>
          {trashed.length > 0 && (
            <button className="btn btn--ghost btn--danger" onClick={clearTrash}>
              Очистить корзину
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
