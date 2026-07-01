import { useMemo } from 'react'
import { useEngine } from '../state/engine'
import type { Item } from '../types'
import { dayDiff, formatDateShort } from '../core/time'
import { useNow } from './useNow'

/** Заголовок группы по дню закрытия. */
function dayLabel(ts: number, now: number): string {
  const d = dayDiff(ts, now)
  if (d === 0) return 'Сегодня'
  if (d === -1) return 'Вчера'
  return formatDateShort(ts)
}

/** Время закрытия ЧЧ:ММ. */
function hhmm(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Архив выполненного: закрытые дела, сгруппированные по дням (свежие
 * сверху), со временем закрытия. Тап открывает карточку пункта, ссылка
 * «вернуть» возвращает дело в работу (через журнал, с «Отменить»).
 */
export function Archive({
  onOpenItem,
  onClose,
}: {
  onOpenItem: (id: string) => void
  onClose: () => void
}) {
  const { done, reopen } = useEngine()
  const now = useNow()

  const groups = useMemo(() => {
    const sorted = [...done].sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
    const out: Array<{ label: string; items: Item[] }> = []
    for (const it of sorted) {
      const label = dayLabel(it.closedAt ?? it.updatedAt, now)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(it)
      else out.push({ label, items: [it] })
    }
    return out
  }, [done, now])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">архив</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">Выполнено</div>

        {groups.length === 0 ? (
          <div className="timeline__empty">Пока ничего не закрыто.</div>
        ) : (
          groups.map((g) => (
            <section className="section" key={g.label}>
              <div className="section__head">{g.label}</div>
              {g.items.map((it) => (
                <div className="row" key={it.id}>
                  <button className="row__body" onClick={() => onOpenItem(it.id)}>
                    <div className="row__title">{it.title}</div>
                    {(it.who || it.project) && (
                      <div className="row__meta data">
                        {it.who && <span className="row__who">{it.who}</span>}
                        {it.project && <span className="row__project">{it.project}</span>}
                      </div>
                    )}
                  </button>
                  <div className="archive-side">
                    {it.closedAt != null && <span className="archive-time data">{hhmm(it.closedAt)}</span>}
                    <button className="linkbtn" onClick={() => reopen(it.id)}>
                      вернуть
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))
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
