/** Últimos comandos usados (aporte SigeApp), en el navegador. */
export const RECENT_KEY = 'sige.palette.recent'
export const RECENT_MAX = 5

export const loadRecent = (): string[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

/** Pone `id` al tope (sin repetir) y guarda como máximo los 5 últimos. */
export const pushRecent = (id: string): string[] => {
  const next = [id, ...loadRecent().filter((x) => x !== id)].slice(0, RECENT_MAX)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* sin almacenamiento */ }
  return next
}
