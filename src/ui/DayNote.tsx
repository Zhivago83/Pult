import { useState } from 'react'
import { useEngine } from '../state/engine'

/**
 * Заметка дня: одна строка «главное на сегодня» над термометром.
 * Тап — правка прямо в строке (без системных окон). Пусто — спокойный
 * placeholder. Меняется через журнал, отменяется плашкой «Отменить».
 */
export function DayNote() {
  const { dayNote, setDayNote } = useEngine()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function start() {
    setDraft(dayNote)
    setEditing(true)
  }
  function save() {
    setDayNote(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        className="daynote daynote__input"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={save}
        placeholder="Главное на сегодня…"
      />
    )
  }

  return (
    <button className={`daynote${dayNote ? '' : ' daynote--empty'}`} onClick={start}>
      {dayNote || 'Главное на сегодня…'}
    </button>
  )
}
