// ─────────────────────────────────────────────────────────────
//  ЯДРО: документы
//  Документ — карточка с полями, привязывается к пунктам через
//  item.docIds. Здесь — подписи, дополняемый список типов и
//  проверка «привязан ли». Чистые функции.
// ─────────────────────────────────────────────────────────────

import type { Doc, Item } from '../types'

/** Стартовые типы документов; список дополняется новыми при создании. */
export const DOC_TYPE_DEFAULTS = ['входящее', 'исходящее', 'договор']

/** Подпись документа: «входящее № 118» (или просто тип, если номера нет). */
export function docLabel(doc: Doc): string {
  return doc.number ? `${doc.docType} № ${doc.number}` : doc.docType
}

/** Дополняемый список типов: стартовые + все встречающиеся в документах. */
export function docTypeOptions(docs: Doc[]): string[] {
  const set = new Set(DOC_TYPE_DEFAULTS)
  for (const d of docs) if (d.docType) set.add(d.docType)
  return [...set]
}

/** Привязан ли документ хоть к одному живому пункту (не из корзины). */
export function isDocAttached(items: Item[], docId: string): boolean {
  return items.some((it) => it.status !== 'trashed' && (it.docIds ?? []).includes(docId))
}

/** Пункты, к которым привязан документ (не из корзины). */
export function docItems(items: Item[], docId: string): Item[] {
  return items.filter((it) => it.status !== 'trashed' && (it.docIds ?? []).includes(docId))
}

/** Документы, привязанные к пункту, в порядке привязки. */
export function itemDocs(docs: Doc[], item: Item): Doc[] {
  const ids = item.docIds ?? []
  return ids
    .map((id) => docs.find((d) => d.id === id))
    .filter((d): d is Doc => d != null)
}

/** Документы корреспондента (для карточки человека), свежие сверху. */
export function personDocs(docs: Doc[], name: string): Doc[] {
  return docs
    .filter((d) => d.correspondent === name)
    .sort((a, b) => b.createdAt - a.createdAt)
}
