import { useEffect } from 'react'
import { useEngine } from '../state/engine'
import { docLabel, docItems, isDocAttached } from '../core/docs'
import { formatDateShort } from '../core/time'

/** Строка «ключ — значение» в карточке документа. */
function Row({ k, v, mono = true }: { k: string; v?: string; mono?: boolean }) {
  if (!v) return null
  return (
    <div className="doc__row">
      <span className="doc__key">{k}</span>
      <span className={`doc__val${mono ? ' data' : ''}`}>{v}</span>
    </div>
  )
}

/**
 * Карточка документа: поля для чтения, к каким пунктам привязан.
 * Если документ ни к чему не привязан и у него есть контрольный срок —
 * предлагаем создать пункт «Отработать <номер>» (кнопкой, по желанию).
 */
export function DocCard({ docId, onClose }: { docId: string; onClose: () => void }) {
  const { docs, items, createFromDoc } = useEngine()
  const doc = docs.find((d) => d.id === docId)
  const linked = doc ? docItems(items, docId) : []
  const unattached = doc ? !isDocAttached(items, docId) : false

  // Документ мог исчезнуть (Undo создания) — закрываем карточку.
  useEffect(() => {
    if (!doc) onClose()
  }, [doc, onClose])
  if (!doc) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">документ</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail__title">{docLabel(doc)}</div>

        <div className="doc__fields">
          <Row k="тип" v={doc.docType} />
          <Row k="номер" v={doc.number} />
          <Row k="дата" v={doc.docDate != null ? formatDateShort(doc.docDate) : undefined} />
          <Row k="корреспондент" v={doc.correspondent} />
          <Row k="описание" v={doc.description} mono={false} />
          <Row k="контроль" v={doc.controlAt != null ? formatDateShort(doc.controlAt) : undefined} />
        </div>

        {/* Непривязанный документ с контрольным сроком — предложить отработать */}
        {unattached && doc.controlAt != null && (
          <button
            className="btn btn--primary detail__action"
            onClick={() => {
              createFromDoc(docId)
              onClose()
            }}
          >
            Создать пункт «Отработать {docLabel(doc)}»
          </button>
        )}

        <div className="detail__histHead">Привязан к · {linked.length}</div>
        {linked.length === 0 ? (
          <div className="timeline__empty">Ни к чему не привязан.</div>
        ) : (
          <div>
            {linked.map((it) => (
              <div className="row" key={it.id}>
                <div className="row__body">
                  <div className="row__title">{it.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
