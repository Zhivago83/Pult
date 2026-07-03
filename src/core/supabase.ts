// ─────────────────────────────────────────────────────────────
//  Единый клиент Supabase — только для входа/выхода по e-mail.
//  Данные приложения (пункты, журнал, корзина) здесь НЕ участвуют:
//  ничего в облако не отправляем и оттуда не забираем.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

// Адрес проекта и публикуемый (anon / publishable) ключ Supabase.
// Оба значения берутся из панели проекта Supabase → Project Settings → API.
// Публикуемый ключ безопасно держать в клиентском коде.
// TODO: подставить реальные значения из своего проекта Supabase.
const SUPABASE_URL = 'PASTE_PROJECT_URL'
const SUPABASE_PUBLISHABLE_KEY = 'PASTE_PUBLISHABLE_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Храним сессию между запусками и тихо обновляем токен.
    persistSession: true,
    autoRefreshToken: true,
    // Вход по коду из письма, а не по ссылке — перехват сессии из URL не нужен.
    detectSessionInUrl: false,
  },
})
