// Корневой экран: шапка, Сводка, кнопка «+», плашка Undo и листы
// (Захват / Корзина).
import { useState } from 'react'
import { Summary } from './screens/Summary'
import { Capture } from './components/Capture'
import { Trash } from './components/Trash'
import { UndoToast } from './components/UndoToast'
import { useTheme } from './core/theme'

type Sheet = 'none' | 'capture' | 'trash'

export function App() {
  const [sheet, setSheet] = useState<Sheet>('none')
  const { theme, toggle } = useTheme()

  return (
    <div className="app">
      <header className="topbar">
        <h1>Пульт</h1>
        <div className="tools">
          <button className="icon-btn" onClick={toggle}>
            {theme === 'paper' ? 'Бумага' : 'Консоль'}
          </button>
          <button className="icon-btn" onClick={() => setSheet('trash')}>
            Корзина
          </button>
        </div>
      </header>

      <Summary />

      <button className="fab" onClick={() => setSheet('capture')} aria-label="Добавить">
        +
      </button>

      {sheet === 'capture' && (
        <Capture onClose={() => setSheet('none')} onCreated={() => {}} />
      )}
      {sheet === 'trash' && <Trash onClose={() => setSheet('none')} />}

      <UndoToast />
    </div>
  )
}
