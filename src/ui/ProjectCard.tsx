import { useMemo } from 'react'
import { useEngine } from '../state/engine'
import { projectVisibleItems, projectDisplay } from '../core/projects'
import { ItemRow } from './ItemRow'
import { useNow } from './useNow'

/**
 * Карточка проекта: его дела и ожидания, разбитые на «Моё» и
 * «Ожидания». Тап по пункту открывает карточку пункта; кольцо
 * закрывает с периодом благодати — как везде.
 */
export function ProjectCard({
  name,
  onOpenItem,
  onClose,
}: {
  name: string
  onOpenItem: (id: string) => void
  onClose: () => void
}) {
  const { items, close, trash } = useEngine()
  const now = useNow()
  const visible = useMemo(() => projectVisibleItems(items, name, now), [items, name, now])

  const mine = visible.filter((vi) => vi.item.kind === 'mine')
  const waiting = visible.filter((vi) => vi.item.kind === 'waiting')

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">проект</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">{projectDisplay(name)}</div>

        {visible.length === 0 ? (
          <div className="timeline__empty">В проекте нет открытых пунктов.</div>
        ) : (
          <>
            {mine.length > 0 && (
              <section className="section">
                <div className="section__head">Моё</div>
                {mine.map((vi) => (
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
            )}
            {waiting.length > 0 && (
              <section className="section">
                <div className="section__head">Ожидания</div>
                {waiting.map((vi) => (
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
