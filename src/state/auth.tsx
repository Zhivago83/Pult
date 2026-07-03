// ─────────────────────────────────────────────────────────────
//  СОСТОЯНИЕ ВХОДА (авторизация) — отдельно от данных и движка.
//  Здесь нет пунктов, журнала и IndexedDB: только сессия Supabase
//  и три действия — запросить код, проверить код, выйти.
//  Приложение работает локально и без входа; вход ничего не блокирует.
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../core/supabase'

/** Результат действия входа: успех или текст ошибки для показа в UI. */
export interface AuthResult {
  ok: boolean
  error?: string
}

export interface Auth {
  /** Текущий пользователь или null, если не вошёл. */
  user: User | null
  /** true, пока идёт первичная проверка сессии при старте. */
  loading: boolean
  /** Прислать 6-значный код на e-mail. */
  requestCode(email: string): Promise<AuthResult>
  /** Проверить введённый код и войти. */
  verifyCode(email: string, code: string): Promise<AuthResult>
  /** Выйти из аккаунта. */
  signOut(): Promise<AuthResult>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // При старте — текущая сессия, дальше слушаем изменения (вход/выход/refresh).
  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function requestCode(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  async function verifyCode(email: string, code: string): Promise<AuthResult> {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  async function signOut(): Promise<AuthResult> {
    const { error } = await supabase.auth.signOut()
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  const auth: Auth = { user, loading, requestCode, verifyCode, signOut }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth нужно вызывать внутри <AuthProvider>')
  return ctx
}
