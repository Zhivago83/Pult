import { useMemo } from 'react'
import { useEngine } from '../state/engine'
import { buildProjects } from '../core/projects'
import { useNow } from './useNow'

/**
 * Экран «Проекты»: список проектов со счётчиками.
 * Тап по проекту открывает его карточку.
 */
export function Projects({ onOpenProject }: { onOpenProject: (name: string) => void }) {
  const { items } = useEngine()
  const now = useNow()
  const rows = useMemo(() => buildProjects(items, now), [items, now])

  if (rows.length === 0) {
    return <div className="empty">Пока нет проектов.</div>
  }

  return (
    <section className="section">
      {rows.map((p) => (
        <button className="prow" key={p.name || '—'} onClick={() => onOpenProject(p.name)}>
          <div className="prow__name">{p.display}</div>
          <div className="prow__meta data">
            <span>{p.total} дел</span>
            {p.burning > 0 && <span className="hot">{p.burning} горит</span>}
            {p.waiting > 0 && <span>{p.waiting} ждут</span>}
          </div>
        </button>
      ))}
    </section>
  )
}
