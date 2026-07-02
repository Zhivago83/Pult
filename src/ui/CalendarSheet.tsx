import { useState } from 'react'
import { useEngine } from '../state/engine'
import { BASE_NOTE } from '../core/calendar'
import { formatDateShort } from '../core/time'
import { dateInputToTs } from '../core/time'

/**
 * Производственный календарь: по нему считаются «рабочие дни» в правилах
 * повтора. База (выходные + праздники РФ) зашита; здесь — свои отметки:
 * нерабочий день (перенос праздника, отгул) или рабочий (рабочая суббота).
 * Все отметки — через журнал операций с Undo.
 */
export function CalendarSheet({ onClose }: { onClose: () => void }) {
  const { calendar, addCalEntry, removeCalEntry } = useEngine()
  const [date, setDate] = useState('')
  const [kind, setKind] = useState<'off' | 'work'>('off')

  const entries = [...calendar].sort((a, b) => a.date.localeCompare(b.date))

  function add() {
    if (!date) return
    addCalEntry(date, kind)
    setDate('')
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">календарь</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">Производственный календарь</div>
        <div className="cal__note">{BASE_NOTE}</div>

        {/* Добавить отметку */}
        <div className="field">
          <label>Отметить день</label>
          <input
            className="data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="segmented cal__kind">
          <button className={kind === 'off' ? 'is-active' : ''} onClick={() => setKind('off')}>
            Нерабочий
          </button>
          <button className={kind === 'work' ? 'is-active' : ''} onClick={() => setKind('work')}>
            Рабочий (перенос)
          </button>
        </div>
        <div className="sheet__row">
          <button className="btn btn--primary" disabled={!date} onClick={add}>
            Добавить
          </button>
        </div>

        {/* Свои отметки */}
        <div className="detail__histHead">Свои отметки{entries.length ? ` · ${entries.length}` : ''}</div>
        {entries.length === 0 ? (
          <div className="timeline__empty">Пока нет — действует база.</div>
        ) : (
          <div>
            {entries.map((e) => {
              const ts = dateInputToTs(e.date)
              return (
                <div className="row" key={e.date}>
                  <div className="row__body">
                    <div className="row__title data">
                      {ts != null ? formatDateShort(ts) : e.date}{' '}
                      <span className="cal__tag">
                        {e.kind === 'off' ? 'нерабочий' : 'рабочий'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="row__trash"
                    aria-label="Снять отметку"
                    onClick={() => removeCalEntry(e.date)}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
