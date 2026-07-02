import { useState } from 'react'
import { useEngine } from '../state/engine'
import {
  type Anchor,
  type RepeatRule,
  type Weekday,
  isoWeekday,
  ruleLabel,
} from '../core/repeat'
import { formatDateShort, dateInputToTs, tsToDateInput } from '../core/time'

const WD_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** Кнопки-варианты (общий вид для конструктора). */
function Chips<T>({
  options,
  value,
  onPick,
}: {
  options: Array<{ v: T; label: string }>
  value: T
  onPick: (v: T) => void
}) {
  return (
    <div className="choices">
      {options.map((o) => (
        <button
          key={String(o.v)}
          className={o.v === value ? 'is-active' : ''}
          onClick={() => onPick(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Настройка повторения пункта. Сверху пресеты одним нажатием
 * (разовая / еженедельно / ежемесячно / ежеквартально), ниже —
 * «Настроить…» с конструктором: частота, якорь («какой день брать»),
 * сдвиг с выходного, окончание. Живой предпросмотр строкой.
 */
export function RepeatSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { items, edit } = useEngine()
  const item = items.find((it) => it.id === itemId)
  const base = new Date(item?.dueAt ?? Date.now())
  const r = item?.repeat

  const [advanced, setAdvanced] = useState(false)

  // Состояние конструктора (стартует с текущего правила или разумного)
  const [freq, setFreq] = useState<RepeatRule['freq']>(r?.freq ?? 'month')
  const [weekdays, setWeekdays] = useState<Weekday[]>(r?.weekdays ?? [isoWeekday(base)])
  const a = r?.anchor
  const [anchorType, setAnchorType] = useState<Anchor['type']>(a?.type ?? 'dom')
  const [domDay, setDomDay] = useState(a?.type === 'dom' && a.day !== -1 ? a.day : base.getDate())
  const [domLast, setDomLast] = useState(a?.type === 'dom' && a.day === -1)
  const [wdN, setWdN] = useState(a?.type === 'workday' && a.n !== -1 ? a.n : 1)
  const [wdLast, setWdLast] = useState(a?.type === 'workday' && a.n === -1)
  const [nthN, setNthN] = useState(a?.type === 'nthWeekday' ? a.n : 1)
  const [nthWd, setNthWd] = useState<Weekday>(
    a?.type === 'nthWeekday' ? a.weekday : isoWeekday(base),
  )
  const [offDays, setOffDays] = useState(
    a?.type === 'fromStart' || a?.type === 'fromEnd' ? a.days : 3,
  )
  const [offBusiness, setOffBusiness] = useState(
    a?.type === 'fromStart' || a?.type === 'fromEnd' ? a.business : true,
  )
  const [shift, setShift] = useState<'none' | 'back' | 'forward'>(r?.shift ?? 'none')
  const [endType, setEndType] = useState<'never' | 'until' | 'count'>(r?.end?.type ?? 'never')
  const [untilDate, setUntilDate] = useState(
    r?.end?.type === 'until' ? tsToDateInput(r.end.date) : '',
  )
  const [countTimes, setCountTimes] = useState(r?.end?.type === 'count' ? r.end.times : 10)

  if (!item) return null

  function setRule(rule: RepeatRule | undefined) {
    edit(itemId, { repeat: rule })
    onClose()
  }

  /** Собрать правило из состояния конструктора. */
  function buildRule(): RepeatRule {
    const rule: RepeatRule = { freq, shift }
    if (freq === 'week') rule.weekdays = weekdays.length ? [...weekdays].sort() : [isoWeekday(base)]
    if (freq === 'month' || freq === 'quarter' || freq === 'year') {
      if (anchorType === 'dom') rule.anchor = { type: 'dom', day: domLast ? -1 : domDay }
      else if (anchorType === 'workday') rule.anchor = { type: 'workday', n: wdLast ? -1 : wdN }
      else if (anchorType === 'nthWeekday')
        rule.anchor = { type: 'nthWeekday', n: nthN, weekday: nthWd }
      else if (anchorType === 'fromStart')
        rule.anchor = { type: 'fromStart', days: offDays, business: offBusiness }
      else rule.anchor = { type: 'fromEnd', days: offDays, business: offBusiness }
    }
    if (endType === 'until') {
      const ts = dateInputToTs(untilDate)
      rule.end = ts != null ? { type: 'until', date: ts } : { type: 'never' }
    } else if (endType === 'count') {
      rule.end = { type: 'count', times: Math.max(1, countTimes) }
    } else {
      rule.end = { type: 'never' }
    }
    return rule
  }

  const preview = buildRule()

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">повторение</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">{item.title}</div>
        <div className="repeat__current data">
          Сейчас: {item.repeat ? ruleLabel(item.repeat, { formatDate: formatDateShort }) : 'разовая'}
        </div>

        {/* Пресеты — одним нажатием */}
        <div className="repeat__presets">
          <button className="btn btn--ghost" onClick={() => setRule(undefined)}>
            Разовая
          </button>
          <button
            className="btn btn--ghost"
            onClick={() =>
              setRule({ freq: 'week', weekdays: [isoWeekday(base)], shift: 'none', end: { type: 'never' } })
            }
          >
            Еженедельно
          </button>
          <button
            className="btn btn--ghost"
            onClick={() =>
              setRule({
                freq: 'month',
                anchor: { type: 'dom', day: base.getDate() },
                shift: 'none',
                end: { type: 'never' },
              })
            }
          >
            Ежемесячно
          </button>
          <button
            className="btn btn--ghost"
            onClick={() =>
              setRule({
                freq: 'quarter',
                anchor: { type: 'workday', n: 5 },
                shift: 'none',
                end: { type: 'never' },
              })
            }
          >
            Ежеквартально
          </button>
        </div>

        {!advanced ? (
          <button className="linkbtn repeat__more" onClick={() => setAdvanced(true)}>
            Настроить…
          </button>
        ) : (
          <div className="repeat__builder">
            <div className="field">
              <label>Частота</label>
              <Chips
                options={[
                  { v: 'day' as const, label: 'день' },
                  { v: 'week' as const, label: 'неделя' },
                  { v: 'month' as const, label: 'месяц' },
                  { v: 'quarter' as const, label: 'квартал' },
                  { v: 'year' as const, label: 'год' },
                ]}
                value={freq}
                onPick={setFreq}
              />
            </div>

            {freq === 'week' && (
              <div className="field">
                <label>Дни недели</label>
                <div className="choices">
                  {WD_SHORT.map((w, i) => {
                    const wd = (i + 1) as Weekday
                    const on = weekdays.includes(wd)
                    return (
                      <button
                        key={w}
                        className={on ? 'is-active' : ''}
                        onClick={() =>
                          setWeekdays(on ? weekdays.filter((x) => x !== wd) : [...weekdays, wd])
                        }
                      >
                        {w}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {(freq === 'month' || freq === 'quarter' || freq === 'year') && (
              <>
                <div className="field">
                  <label>Какой день брать</label>
                  <Chips
                    options={[
                      { v: 'dom' as const, label: 'число' },
                      { v: 'workday' as const, label: 'рабочий день' },
                      { v: 'nthWeekday' as const, label: 'день недели по счёту' },
                      { v: 'fromStart' as const, label: 'от начала' },
                      { v: 'fromEnd' as const, label: 'до конца' },
                    ]}
                    value={anchorType}
                    onPick={setAnchorType}
                  />
                </div>

                {anchorType === 'dom' && (
                  <div className="field">
                    <label>{freq === 'month' ? 'Число' : 'День периода'}</label>
                    <div className="repeat__inline">
                      <input
                        className="data repeat__num"
                        type="number"
                        min={1}
                        max={freq === 'month' ? 31 : freq === 'quarter' ? 92 : 366}
                        value={domDay}
                        disabled={domLast}
                        onChange={(e) => setDomDay(Number(e.target.value) || 1)}
                      />
                      <div className="choices">
                        <button
                          className={domLast ? 'is-active' : ''}
                          onClick={() => setDomLast(!domLast)}
                        >
                          {freq === 'month' ? 'последнее' : 'последний'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {anchorType === 'workday' && (
                  <div className="field">
                    <label>Рабочий день по счёту</label>
                    <div className="repeat__inline">
                      <input
                        className="data repeat__num"
                        type="number"
                        min={1}
                        max={260}
                        value={wdN}
                        disabled={wdLast}
                        onChange={(e) => setWdN(Number(e.target.value) || 1)}
                      />
                      <div className="choices">
                        <button
                          className={wdLast ? 'is-active' : ''}
                          onClick={() => setWdLast(!wdLast)}
                        >
                          последний
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {anchorType === 'nthWeekday' && (
                  <>
                    <div className="field">
                      <label>По счёту</label>
                      <Chips
                        options={[
                          { v: 1, label: 'первый' },
                          { v: 2, label: 'второй' },
                          { v: 3, label: 'третий' },
                          { v: 4, label: 'четвёртый' },
                          { v: -1, label: 'последний' },
                        ]}
                        value={nthN}
                        onPick={setNthN}
                      />
                    </div>
                    <div className="field">
                      <label>День недели</label>
                      <div className="choices">
                        {WD_SHORT.map((w, i) => {
                          const wd = (i + 1) as Weekday
                          return (
                            <button
                              key={w}
                              className={nthWd === wd ? 'is-active' : ''}
                              onClick={() => setNthWd(wd)}
                            >
                              {w}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {(anchorType === 'fromStart' || anchorType === 'fromEnd') && (
                  <div className="field">
                    <label>
                      {anchorType === 'fromStart' ? 'Через сколько дней от начала' : 'За сколько дней до конца'}
                    </label>
                    <div className="repeat__inline">
                      <input
                        className="data repeat__num"
                        type="number"
                        min={1}
                        max={366}
                        value={offDays}
                        onChange={(e) => setOffDays(Number(e.target.value) || 1)}
                      />
                      <Chips
                        options={[
                          { v: false, label: 'календарные' },
                          { v: true, label: 'рабочие' },
                        ]}
                        value={offBusiness}
                        onPick={setOffBusiness}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="field">
              <label>Если дата попала на выходной</label>
              <Chips
                options={[
                  { v: 'none' as const, label: 'не двигать' },
                  { v: 'back' as const, label: 'назад' },
                  { v: 'forward' as const, label: 'вперёд' },
                ]}
                value={shift}
                onPick={setShift}
              />
            </div>

            <div className="field">
              <label>Окончание</label>
              <Chips
                options={[
                  { v: 'never' as const, label: 'бессрочно' },
                  { v: 'until' as const, label: 'до даты' },
                  { v: 'count' as const, label: 'N раз' },
                ]}
                value={endType}
                onPick={setEndType}
              />
              {endType === 'until' && (
                <input
                  className="data"
                  type="date"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                />
              )}
              {endType === 'count' && (
                <input
                  className="data repeat__num"
                  type="number"
                  min={1}
                  max={999}
                  value={countTimes}
                  onChange={(e) => setCountTimes(Number(e.target.value) || 1)}
                />
              )}
            </div>

            {/* Живой предпросмотр правила словами */}
            <div className="repeat__preview data">
              → {ruleLabel(preview, { formatDate: formatDateShort })}
            </div>

            <div className="sheet__row">
              <button className="btn btn--ghost" onClick={() => setRule(undefined)}>
                Убрать повтор
              </button>
              <button className="btn btn--primary" onClick={() => setRule(buildRule())}>
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
