import { useMemo } from 'react'
import { useEngine } from '../state/engine'
import { buildSummary } from '../core/derive'
import { activeProjects } from '../core/projects'
import { Thermometer } from './Thermometer'
import { ItemRow } from './ItemRow'
import { useNow } from './useNow'

/**
 * Экран «Сводка»: термометр дня + секции по тревожности.
 * Внизу — тихая строка «В движении» с активными проектами.
 * Пустой экран — спокойный, без цвета.
 */
export function Summary({ onOpen }: { onOpen: (id: string) => void }) {
  const { items, close, trash } = useEngine()
  const now = useNow()
  const summary = useMemo(() => buildSummary(items, now), [items, now])
  const moving = useMemo(() => activeProjects(items), [items])

  const isEmpty = summary.sections.length === 0

  return (
    <>
      <Thermometer t={summary.thermometer} />

      {isEmpty ? (
        <div className="empty">
          Пусто и спокойно.
          <div className="empty__sub">Нажмите + чтобы добавить пункт.</div>
        </div>
      ) : (
        summary.sections.map((section) => (
          <section className="section" key={section.id}>
            <div className={`section__head${section.id === 'burning' ? ' section__head--hot' : ''}`}>
              {section.title}
            </div>
            {section.items.map((vi) => (
              <ItemRow
                key={vi.item.id}
                vi={vi}
                now={now}
                onClose={close}
                onTrash={trash}
                onOpen={onOpen}
              />
            ))}
          </section>
        ))
      )}

      {!isEmpty && moving.length > 0 && (
        <div className="projects-note data">В движении: {moving.join(' · ')}</div>
      )}
    </>
  )
}
