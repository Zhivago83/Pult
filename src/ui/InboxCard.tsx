import { useEffect, useMemo, useState } from 'react'
import { useEngine } from '../state/engine'
import { projectNames } from '../core/projects'
import { formatDateShort, dateInputToTs, tsToDateInput } from '../core/time'

type Field = 'title' | 'who' | 'project' | 'due'

/**
 * Разбор записи из «Входящих»: уточнить текст, вид (моё/жду), владельца,
 * срок и проект — теми же пилюлями, что в карточке пункта. «Разложить»
 * превращает запись в настоящий пункт (появится в Сводке/Жду/Проекте),
 * «Отложить» оставляет во Входящих. Все правки — через op-log с Undo.
 */
export function InboxCard({ id, onClose }: { id: string; onClose: () => void }) {
  const { items, edit, triage } = useEngine()
  const item = items.find((it) => it.id === id)
  const existingProjects = useMemo(() => projectNames(items), [items])

  const [editing, setEditing] = useState<Field | null>(null)
  const [draft, setDraft] = useState('')

  // Запись могла уйти (разложена с Undo, удалена) — закрываем разбор.
  useEffect(() => {
    if (!item || item.status !== 'inbox') onClose()
  }, [item, onClose])
  if (!item || item.status !== 'inbox') return null

  function startEdit(field: Field) {
    if (!item) return
    setEditing(field)
    if (field === 'title') setDraft(item.title)
    else if (field === 'who') setDraft(item.who ?? '')
    else if (field === 'project') setDraft(item.project ?? '')
    else if (field === 'due') setDraft(tsToDateInput(item.dueAt))
  }

  function saveEdit() {
    if (!editing) return
    if (editing === 'title') edit(id, { title: draft })
    else if (editing === 'who') edit(id, { who: draft })
    else if (editing === 'project') edit(id, { project: draft })
    else if (editing === 'due') edit(id, { dueAt: dateInputToTs(draft) })
    setEditing(null)
  }

  function clearField() {
    if (editing === 'who') edit(id, { who: '' })
    else if (editing === 'project') edit(id, { project: '' })
    else if (editing === 'due') edit(id, { dueAt: undefined })
    setEditing(null)
  }

  const fieldLabel: Record<Field, string> = {
    title: 'Текст',
    who: 'Владелец',
    project: 'Проект',
    due: 'Срок',
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">разбор</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Текст записи — правится тапом */}
        {editing === 'title' ? (
          <input
            className="detail__titleInput"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setEditing(null)
            }}
            onBlur={saveEdit}
          />
        ) : (
          <button className="detail__title" onClick={() => startEdit('title')}>
            {item.title}
          </button>
        )}

        {/* Вид: моё / жду от кого-то */}
        <div className="segmented inbox__kind">
          <button
            className={item.kind === 'mine' ? 'is-active' : ''}
            onClick={() => edit(id, { kind: 'mine' })}
          >
            Моё
          </button>
          <button
            className={item.kind === 'waiting' ? 'is-active' : ''}
            onClick={() => edit(id, { kind: 'waiting' })}
          >
            Жду от кого-то
          </button>
        </div>

        {/* Пилюли — как в карточке пункта */}
        <div className="pills">
          <button className="pill" onClick={() => startEdit('who')}>
            <span className="pill__key">кто</span>
            <span className="pill__val data">{item.who || '—'}</span>
          </button>
          <button className="pill" onClick={() => startEdit('project')}>
            <span className="pill__key">проект</span>
            <span className="pill__val data">{item.project || '—'}</span>
          </button>
          <button className="pill" onClick={() => startEdit('due')}>
            <span className="pill__key">срок</span>
            <span className="pill__val data">
              {item.dueAt != null ? formatDateShort(item.dueAt) : '—'}
            </span>
          </button>
        </div>

        {/* Инлайн-редактор выбранного поля */}
        {editing && editing !== 'title' && (
          <div className="editor">
            <label className="editor__label">{fieldLabel[editing]}</label>
            {editing === 'project' && existingProjects.length > 0 && (
              <div className="choices">
                {existingProjects.map((p) => (
                  <button
                    key={p}
                    className={p === item.project ? 'is-active' : ''}
                    onClick={() => {
                      edit(id, { project: p })
                      setEditing(null)
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {editing === 'due' ? (
              <input
                className="editor__input data"
                type="date"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            ) : (
              <input
                className="editor__input"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') setEditing(null)
                }}
                placeholder={editing === 'who' ? 'Имя' : 'Название нового проекта'}
              />
            )}
            <div className="editor__actions">
              <button className="linkbtn" onClick={clearField}>
                Очистить
              </button>
              <button className="linkbtn" onClick={() => setEditing(null)}>
                Отмена
              </button>
              <button className="btn btn--primary btn--sm" onClick={saveEdit}>
                Сохранить
              </button>
            </div>
          </div>
        )}

        {/* Действия разбора */}
        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Отложить
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              triage(id)
              onClose()
            }}
          >
            Разложить
          </button>
        </div>
      </div>
    </div>
  )
}
