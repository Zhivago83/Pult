import { useMemo, useState } from 'react'
import { useEngine } from '../state/engine'
import { searchItems, statusLabel } from '../core/search'
import { formatDue } from '../core/time'
import { useNow } from './useNow'

/**
 * Поиск по всем пунктам (текст, человек, проект), включая архив и
 * корзину. Живой список совпадений; тап открывает карточку пункта.
 */
export function Search({
  onOpenItem,
  onClose,
}: {
  onOpenItem: (id: string) => void
  onClose: () => void
}) {
  const { items, trashed } = useEngine()
  const now = useNow()
  const [query, setQuery] = useState('')

  const all = useMemo(() => [...items, ...trashed], [items, trashed])
  const results = useMemo(() => searchItems(all, query), [all, query])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <input
            className="search__input"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по пунктам, людям, проектам…"
          />
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        {query.trim() === '' ? (
          <div className="timeline__empty">Введите запрос.</div>
        ) : results.length === 0 ? (
          <div className="timeline__empty">Ничего не найдено.</div>
        ) : (
          <section className="section">
            {results.map((it) => {
              const due = formatDue(it.dueAt, now)
              return (
                <button className="row" key={it.id} onClick={() => onOpenItem(it.id)}>
                  <div className="row__body">
                    <div className="row__title">{it.title}</div>
                    {(it.who || it.project || due) && (
                      <div className="row__meta data">
                        {it.who && <span className="row__who">{it.who}</span>}
                        {it.project && <span className="row__project">{it.project}</span>}
                        {due && <span className="row__due">{due}</span>}
                      </div>
                    )}
                  </div>
                  <span className={`search__tag search__tag--${it.status}`}>
                    {statusLabel(it.status)}
                  </span>
                </button>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}
