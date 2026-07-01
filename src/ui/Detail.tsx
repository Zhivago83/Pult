import { useEffect, useMemo, useState } from 'react'
import { useEngine } from '../state/engine'
import { buildTimeline } from '../core/timeline'
import { formatDateShort, formatDateTime, dateInputToTs, tsToDateInput } from '../core/time'
import { repeatShort } from '../core/recur'
import { SOON_MS } from '../core/constants'
import type { Repeat } from '../types'
import { useNow } from './useNow'

type Field = 'title' | 'who' | 'project' | 'due' | 'touch' | 'repeat'

const REPEAT_OPTIONS: Array<{ value: Repeat | undefined; label: string }> = [
  { value: undefined, label: 'нет' },
  { value: 'daily', label: 'день' },
  { value: 'weekly', label: 'неделя' },
  { value: 'monthly', label: 'месяц' },
]

/**
 * Карточка пункта: заголовок и «пилюли» правятся тапом (только поля
 * внутри интерфейса, без системных окон), лента истории строится из
 * журнала операций, снизу — комментарий и кнопка действия.
 * На телефоне — шторка снизу, на широком экране — панель справа.
 */
export function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { findItem, ops, edit, addComment, markReminded, close } = useEngine()
  const now = useNow()
  const item = findItem(id)
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
    else if (field === 'touch') setDraft(tsToDateInput(item.nextTouchAt))
  }

  function saveEdit() {
    if (!editing) return
    if (editing === 'title') edit(id, { title: draft })
    else if (editing === 'who') edit(id, { who: draft })
    else if (editing === 'project') edit(id, { project: draft })
    else if (editing === 'due') edit(id, { dueAt: dateInputToTs(draft) })
    else if (editing === 'touch') edit(id, { nextTouchAt: dateInputToTs(draft) })
    setEditing(null)
  }

  function clearField() {
    if (editing === 'who') edit(id, { who: '' })
    else if (editing === 'project') edit(id, { project: '' })
    else if (editing === 'due') edit(id, { dueAt: undefined })
    else if (editing === 'touch') edit(id, { nextTouchAt: undefined })
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
    touch: 'Напомнить',
    repeat: 'Повтор',
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
          {item.kind === 'waiting' && (
            <button className="pill" onClick={() => startEdit('touch')}>
              <span className="pill__key">напомнить</span>
              <span className="pill__val data">
                {item.nextTouchAt != null ? formatDateShort(item.nextTouchAt) : '—'}
              </span>
            </button>
          )}
          <button className="pill" onClick={() => startEdit('repeat')}>
            <span className="pill__key">повтор</span>
            <span className="pill__val data">{repeatShort(item.repeat)}</span>
          </button>
        </div>

        {/* Редактор повтора — выбор из вариантов */}
        {editing === 'repeat' && (
          <div className="editor">
            <label className="editor__label">Повтор</label>
            <div className="repeat-options">
              {REPEAT_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  className={(item.repeat ?? undefined) === o.value ? 'is-active' : ''}
                  onClick={() => {
                    edit(id, { repeat: o.value })
                    setEditing(null)
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Инлайн-редактор текстового / датного поля */}
        {editing && editing !== 'title' && editing !== 'repeat' && (
          <div className="editor">
            <label className="editor__label">{fieldLabel[editing]}</label>
            {editing === 'due' || editing === 'touch' ? (
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
