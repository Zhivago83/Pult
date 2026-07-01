// Захват нового пункта — нижний лист по кнопке «+».
// Выбор «моё / жду от кого-то», название, (для «жду») от кого,
// и необязательный срок.

import { useState } from 'react'
import type { ItemKind } from '../types'
import { createItem } from '../core/engine'

interface Props {
  onClose: () => void
  onCreated: () => void
}

/** Дата из <input type="date"> → миллисекунды (конец того дня). */
function dateToMs(value: string): number | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 0, 0).getTime()
}

export function Capture({ onClose, onCreated }: Props) {
  const [kind, setKind] = useState<ItemKind>('mine')
  const [title, setTitle] = useState('')
  const [who, setWho] = useState('')
  const [due, setDue] = useState('')

  const canSave = title.trim().length > 0

  const save = async () => {
    if (!canSave) return
    await createItem({
      kind,
      title,
      who: kind === 'waiting' ? who : undefined,
      due: dateToMs(due),
    })
    onCreated()
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="sheet-title">Новый пункт</h2>

        <div className="seg">
          <button
            className={kind === 'mine' ? 'on' : ''}
            onClick={() => setKind('mine')}
          >
            Моё
          </button>
          <button
            className={kind === 'waiting' ? 'on' : ''}
            onClick={() => setKind('waiting')}
          >
            Жду от кого-то
          </button>
        </div>

        <div className="field">
          <input
            autoFocus
            placeholder={kind === 'mine' ? 'Что нужно сделать?' : 'Чего ждём?'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>

        {kind === 'waiting' && (
          <div className="field">
            <div className="field-label">От кого</div>
            <input
              placeholder="Имя"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            />
          </div>
        )}

        <div className="field mono">
          <div className="field-label">Срок (необязательно)</div>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>

        <div className="sheet-actions">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" disabled={!canSave} onClick={save}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
