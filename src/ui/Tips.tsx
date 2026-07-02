import { useTipsSeen, dismissTips } from './useHints'

/**
 * Ненавязчивые подсказки при первом запуске: как добавить, закрыть,
 * отменить. Убираются кнопкой «Понятно» и больше не появляются
 * (можно вернуть в Настройках). Тонкие линии, без цвета.
 */
export function Tips() {
  const seen = useTipsSeen()
  if (seen) return null

  return (
    <div className="tips">
      <div className="tips__head">
        <span>Как пользоваться</span>
        <button className="linkbtn" onClick={dismissTips}>
          Понятно
        </button>
      </div>
      <ul className="tips__list">
        <li>
          <span className="tips__mark">＋</span> внизу — добавить дело или ожидание. Можно писать
          как есть: «отчёт от Марины до пятницы».
        </li>
        <li>
          <span className="tips__mark">○</span> слева — отметить выполненным (несколько секунд можно
          передумать).
        </li>
        <li>Тап по строке открывает карточку. На любое действие внизу есть «Отменить».</li>
      </ul>
    </div>
  )
}
