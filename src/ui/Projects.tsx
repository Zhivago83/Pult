import { useMemo } from 'react'
import { useEngine } from '../state/engine'
import { buildProjects } from '../core/projects'
import { useNow } from './useNow'

/**
 * Экран «Проекты»: у каждого проекта — название, счётчик «сделано/всего»
 * и тонкая полоса прогресса. Тап раскрывает проект.
 */
export function Projects({ onOpenProject }: { onOpenProject: (name: string) => void }) {
  const { items } = useEngine()
  const now = useNow()
  const rows = useMemo(() => buildProjects(items, now), [items, now])

  if (rows.length === 0) {
    return (
      <div className="empty">
        Пока нет проектов.
        <div className="empty__sub">Проект задаётся пилюлей «проект» в карточке пункта.</div>
      </div>
    )
  }

  return (
    <section className="section">
      {rows.map((p) => (
        <button className="prow" key={p.name} onClick={() => onOpenProject(p.name)}>
          <div className="prow__line">
            <span className="prow__name">{p.name}</span>
            <span className="prow__count data">
              {p.closed}/{p.total}
            </span>
          </div>
          <div className="proj__bar">
            <div className="proj__fill" style={{ width: `${(p.closed / p.total) * 100}%` }} />
          </div>
        </button>
      ))}
    </section>
  )
}
