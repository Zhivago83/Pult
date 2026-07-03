import { useState } from 'react'
import { useAuth } from '../state/auth'

/**
 * Настройки. Пока здесь одна секция — «Синхронизация»: вход/выход по коду
 * из письма (Supabase). Никаких данных в облако не отправляется — только
 * состояние входа. Ввод — полями внутри интерфейса, без prompt/alert/confirm.
 */
export function Settings({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Настройки</div>

        <SyncSection />

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

type Status = 'idle' | 'sending' | 'verifying'

function SyncSection() {
  const { user, requestCode, verifyCode, signOut } = useAuth()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false) // код отправлен — показываем поле кода
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function onRequestCode() {
    const value = email.trim()
    if (!value || status !== 'idle') return
    setError('')
    setStatus('sending')
    const res = await requestCode(value)
    setStatus('idle')
    if (res.ok) setSent(true)
    else setError('Не удалось отправить код')
  }

  async function onVerifyCode() {
    const value = code.trim()
    if (!value || status !== 'idle') return
    setError('')
    setStatus('verifying')
    const res = await verifyCode(email.trim(), value)
    setStatus('idle')
    if (!res.ok) setError('Код неверный или истёк')
    // При успехе onAuthStateChange сам обновит user и перерисует секцию.
  }

  async function onSignOut() {
    await signOut()
    setEmail('')
    setCode('')
    setSent(false)
    setStatus('idle')
    setError('')
  }

  return (
    <div className="section sync">
      <div className="section__head">Синхронизация</div>

      {user ? (
        <>
          <div className="sync__signed">
            Вы вошли: <span className="data">{user.email}</span>
          </div>
          <button className="btn btn--ghost sync__out" onClick={onSignOut}>
            Выйти
          </button>
        </>
      ) : (
        <>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className="data"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRequestCode()}
              placeholder="you@example.com"
            />
          </div>

          {!sent ? (
            <button
              className="btn btn--primary"
              disabled={!email.trim() || status !== 'idle'}
              onClick={onRequestCode}
            >
              Прислать код
            </button>
          ) : (
            <div className="field">
              <label>Код из письма</label>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                className="data"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onVerifyCode()}
                placeholder="6 цифр"
                maxLength={6}
              />
            </div>
          )}

          {sent && status === 'idle' && (
            <button
              className="btn btn--primary"
              disabled={!code.trim()}
              onClick={onVerifyCode}
            >
              Войти
            </button>
          )}

          {status === 'sending' && <div className="sync__status">Отправляем код…</div>}
          {status === 'verifying' && <div className="sync__status">Проверяем…</div>}
          {error && <div className="sync__error">{error}</div>}
        </>
      )}
    </div>
  )
}
