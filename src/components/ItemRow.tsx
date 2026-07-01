// Одна строка пункта в Сводке.
// Слева кольцо: тап — закрыть пункт (или снова открыть во время
// «периода благодати»). Справа маленькая кнопка «в корзину».

import type { Item } from '../types'
import { isBurning } from '../core/selectors'
import { formatDue } from '../core/format'
import { closeItem, reopenItem, trashItem } from '../core/engine'

interface Props {
  item: Item
  now: number
}

export function ItemRow({ item, now }: Props) {
  const burning = item.status === 'open' && isBurning(item, now)
  const grace = item.status === 'done' // виден только пока длится благодать
  const due = formatDue(item.due, now)

  const onRing = () => {
    if (grace) reopenItem(item.id)
    else closeItem(item.id)
  }

  return (
    <div
      className={
        'item' +
        (burning ? ' item-burning' : '') +
        (grace ? ' item-grace' : '')
      }
    >
      <button
        className={'ring' + (grace ? ' checked' : '')}
        onClick={onRing}
        aria-label={grace ? 'Вернуть' : 'Выполнено'}
      />
      <div className="item-body">
        <div className="item-title">{item.title}</div>
        <div className="item-meta mono">
          {due && (
            <span className={burning ? 'due-hot' : ''}>{due}</span>
          )}
          {item.who && <span className="item-who">{item.who}</span>}
        </div>
      </div>
      {!grace && (
        <button
          className="item-trash"
          onClick={() => trashItem(item.id)}
          aria-label="В корзину"
        >
          ✕
        </button>
      )}
    </div>
  )
}
