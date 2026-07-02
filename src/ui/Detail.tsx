import { useEffect, useMemo, useState } from 'react'
import { useEngine } from '../state/engine'
import { buildTimeline } from '../core/timeline'
import { formatDateShort, formatDateTime, dateInputToTs, tsToDateInput } from '../core/time'
import { SOON_MS } from '../core/constants'
import { useNow } from './useNow'

type Field = 'title' | 'who' | 'project' | 'due'

/**
 * Карточка пункта: заголовок и «пилюли» правятся тапом (только поля
 * внутри интерфейса, без системных окон), лента истории строится из
 * журнала операций, снизу — комментарий и кнопка действия.
 * На телефоне — шторка снизу, на широком экране — панель справа.
 */
export function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { items, ops, edit, addComment, markReminded, close } = useEngine()
  const now = useNow()
  const item = items.find((it) => it.id === id)
  const timeline = useMemo(() => (item ? buildTimeline(ops, item) : []), [ops, item])

  const [editing, setEditing] = useState<Field | null>(null)
  const [draft, setDraft] = useState('')
  const [comment, setComment] = useState('')

  // Пункт мог исчезнуть (отмена создания, удаление) — закрываем карточку.
  useEffect(() => {
    if (!item) onClose()
  }, [item, onClose])
  if (!item) return null

  const hot = item.dueAt != null && item.dueAt <= now + SOON_MS

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

  function sendComment() {
    const text = comment.trim()
    if (!text) return
    addComment(id, text)
    setComment('')
  }

  const fieldLabel: Record<Field, string> = {
    title: 'Заголовок',
    who: 'Владелец',
    project: 'Проект',
    due: 'Срок',
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">{item.kind === 'mine' ? 'моё' : 'жду'}</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Заголовок — правится тапом */}
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

        {/* Пилюли: владелец, проект, срок */}
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
            <span className={`pill__val data${hot ? ' pill__val--hot' : ''}`}>
              {item.dueAt != null ? formatDateShort(item.dueAt) : '—'}
            </span>
          </button>
        </div>

        {/* Инлайн-редактор выбранного поля */}
        {editing && editing !== 'title' && (
          <div className="editor">
            <label className="editor__label">{fieldLabel[editing]}</label>
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
                placeholder={editing === 'who' ? 'Имя' : 'Название проекта'}
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

        {/* Кнопка действия */}
        {item.status === 'open' ? (
          item.kind === 'waiting' ? (
            <button className="btn btn--ghost detail__action" onClick={() => markReminded(id)}>
              Отметить напомнил
            </button>
          ) : (
            <button
              className="btn btn--primary detail__action"
              onClick={() => {
                close(id)
                onClose()
              }}
            >
              Выполнено
            </button>
          )
        ) : (
          <div className="detail__doneNote data">Выполнено</div>
        )}

        {/* История касаний */}
        <div className="detail__histHead">История</div>
        <div className="timeline">
          {timeline.length === 0 ? (
            <div className="timeline__empty">Пока пусто.</div>
          ) : (
            timeline.map((e) => (
              <div className={`tl tl--${e.kind}`} key={e.id}>
                <div className="tl__time data">{formatDateTime(e.ts)}</div>
                <div className="tl__text">{e.text}</div>
              </div>
            ))
          )}
        </div>

        {/* Комментарий */}
        <div className="commentbar">
          <input
            className="commentbar__input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendComment()}
            placeholder="Комментарий…"
          />
          <button
            className="btn btn--primary btn--sm"
            disabled={!comment.trim()}
            onClick={sendComment}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
