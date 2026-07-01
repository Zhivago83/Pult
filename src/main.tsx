// Точка входа: наполняем демо-данными (один раз), загружаем ядро
// из базы, затем показываем приложение.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { init } from './core/engine'
import { seedIfEmpty } from './demo'
import './styles.css'
import './app.css'

async function start() {
  await seedIfEmpty()
  await init()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

start()
