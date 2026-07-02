import { useState } from 'react'
import { useEngine, type CaptureInput } from '../state/engine'
import type { Kind } from '../types'

/** Дата из поля <input type="date"> → метка времени (конец того дня). */
function dateToTs(value: string): number | undefined {
  if (!value) return undefined
  const d = new Date(value + 'T18:00:00') // условный «конец рабочего дня»
  return Number.isNaN(d.getTime()) ? undefined : d.getTime()
}

/** Лист захвата: создать пункт «моё» или «жду от кого-то». */
export function Capture({ onClose }: { onClose: () => void }) {
  const { capture } = useEngine()
  const [kind, setKind] = useState<Kind>('mine')
  const [title, setTitle] = useState('')
  const [who, setWho] = useState('')
  const [due, setDue] = useState('')

  const canSave = title.trim().length > 0

  function save() {
    if (!canSave) return
    const input: CaptureInput = {
      kind,
      title,
      who: kind === 'waiting' ? who : undefined,
      dueAt: dateToTs(due),
    }
    capture(input)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Новый пункт</div>

        <div className="segmented">
          <button
            className={kind === 'mine' ? 'is-active' : ''}
            onClick={() => setKind('mine')}
          >
            Моё
          </button>
          <button
            className={kind === 'waiting' ? 'is-active' : ''}
            onClick={() => setKind('waiting')}
          >
            Жду от кого-то
          </button>
        </div>

        <div className="field">
          <label>{kind === 'mine' ? 'Что нужно сделать' : 'Чего ждём'}</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder={kind === 'mine' ? 'Например: согласовать бюджет' : 'Например: отчёт за июнь'}
          />
        </div>

        {kind === 'waiting' && (
          <div className="field">
            <label>От кого</label>
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Имя" />
          </div>
        )}

        <div className="field">
          <label>Срок (необязательно)</label>
          <input
            className="data"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn--primary" disabled={!canSave} onClick={save}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
