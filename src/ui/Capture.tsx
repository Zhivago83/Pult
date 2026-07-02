import { useState } from 'react'
import { useEngine } from '../state/engine'

/**
 * Быстрый захват: один ввод текста — запись сразу ложится во «Входящие».
 * Разбор (вид, владелец, срок, проект) делается позже, на экране Входящих.
 */
export function Capture({ onClose }: { onClose: () => void }) {
  const { capture } = useEngine()
  const [text, setText] = useState('')

  const canSave = text.trim().length > 0

  function save() {
    if (!canSave) return
    capture(text)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Во Входящие</div>

        <div className="field">
          <label>Что записать</label>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Например: перезвонить банку про эквайринг"
          />
          <div className="capture__hint">Разобрать можно позже — во «Входящих» на Сводке.</div>
        </div>

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn--primary" disabled={!canSave} onClick={save}>
            Записать
          </button>
        </div>
      </div>
    </div>
  )
}
