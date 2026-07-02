import { useMemo, useState } from 'react'
import { useEngine } from '../state/engine'
import { projectGroups } from '../core/projects'
import { ItemRow } from './ItemRow'
import { useNow } from './useNow'

/**
 * Раскрытый проект: полоса прогресса и пункты по группам —
 * «Просрочено» (красный заголовок), «В работе» и свёрнутое «Сделано».
 * Тап по пункту открывает карточку пункта; кольцо закрывает с периодом
 * благодати — как везде. На телефоне шторка, на широком — панель.
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
  const groups = useMemo(() => projectGroups(items, name, now), [items, name, now])
  const [showDone, setShowDone] = useState(false)

  const total = groups.overdue.length + groups.inWork.length + groups.done.length

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">проект</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">{name}</div>

        {total > 0 ? (
          <>
            <div className="proj__bar">
              <div
                className="proj__fill"
                style={{ width: `${(groups.done.length / total) * 100}%` }}
              />
            </div>
            <div className="proj__progress data">
              {groups.done.length} из {total} сделано
            </div>
          </>
        ) : (
          <div className="timeline__empty">В проекте нет пунктов.</div>
        )}

        {groups.overdue.length > 0 && (
          <section className="section">
            <div className="section__head section__head--hot">Просрочено</div>
            {groups.overdue.map((it) => (
              <ItemRow
                key={it.id}
                vi={{ item: it, closing: false }}
                now={now}
                onClose={close}
                onTrash={trash}
                onOpen={onOpenItem}
              />
            ))}
          </section>
        )}

        {groups.inWork.length > 0 && (
          <section className="section">
            <div className="section__head">В работе</div>
            {groups.inWork.map((it) => (
              <ItemRow
                key={it.id}
                vi={{ item: it, closing: false }}
                now={now}
                onClose={close}
                onTrash={trash}
                onOpen={onOpenItem}
              />
            ))}
          </section>
        )}

        {groups.done.length > 0 && (
          <section className="section">
            <button className="section__head section__toggle" onClick={() => setShowDone(!showDone)}>
              Сделано · {groups.done.length} {showDone ? '▾' : '▸'}
            </button>
            {showDone &&
              groups.done.map((it) => (
                <button className="row row--closing" key={it.id} onClick={() => onOpenItem(it.id)}>
                  <div className="row__body">
                    <div className="row__title">{it.title}</div>
                  </div>
                </button>
              ))}
          </section>
        )}
      </div>
    </div>
  )
}
