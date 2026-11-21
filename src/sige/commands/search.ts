import type { Command } from './types'

/**
 * Puntaje propio de la lupita (sin librerías). Orden de calidad de un acierto:
 * prefijo del texto > prefijo de una palabra > subcadena > subsecuencia
 * (letras en orden, para faltas leves como «oblgatoria»). Sin tildes ni mayúsculas.
 */

/** Minúsculas, sin tildes, solo letras y números separados por un espacio. */
export const normalize = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Letras de `token` en orden dentro de `text`, empezando al inicio de una palabra; menor tramo = mejor. */
const subsequenceSpan = (token: string, text: string): number | null => {
  let best: number | null = null
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== token[0] || (start > 0 && text[start - 1] !== ' ')) continue
    let pos = start
    let ok = true
    for (let i = 1; i < token.length; i++) {
      pos = text.indexOf(token[i], pos + 1)
      if (pos === -1) { ok = false; break }
    }
    if (ok) {
      const span = pos - start + 1
      if (best === null || span < best) best = span
    }
  }
  return best
}

/** Puntaje de una palabra de la consulta contra un texto ya normalizado (0 = no coincide). */
export const scoreToken = (token: string, text: string): number => {
  if (token === '' || text === '') return 0
  if (text === token) return 1000
  if (text.startsWith(token)) return 900
  const words = text.split(' ')
  const wordIdx = words.findIndex((w) => w.startsWith(token))
  if (wordIdx > 0) return 800 - Math.min(wordIdx * 10, 50)
  const at = text.indexOf(token)
  if (at >= 0) return 600 - Math.min(at, 50)
  if (token.length >= 3) {
    const span = subsequenceSpan(token, text)
    if (span !== null && span <= token.length * 2) return Math.max(100, 300 - (span - token.length) * 15)
  }
  return 0
}

/**
 * Puntaje de un comando para una consulta (0 = no coincide). Cada palabra de la
 * consulta debe encontrarse en el título, una palabra clave o la categoría;
 * el título pesa más que las palabras clave y estas más que la categoría.
 */
export const scoreCommand = (command: Command, query: string): number => {
  const tokens = normalize(query).split(' ').filter((x) => x !== '')
  if (tokens.length === 0) return 0
  const title = normalize(command.titulo)
  const keywords = command.palabrasClave.map(normalize)
  const category = normalize(command.categoria)
  let total = 0
  for (const token of tokens) {
    let best = scoreToken(token, title)
    for (const k of keywords) best = Math.max(best, scoreToken(token, k) * 0.85)
    best = Math.max(best, scoreToken(token, category) * 0.4)
    if (best === 0) return 0
    total += best
  }
  return total / tokens.length
}

export interface CommandState {
  enabled: boolean
  /** Por qué no se puede ejecutar (solo si `enabled` es falso). */
  reason?: string
}

export const commandState = (command: Command): CommandState => {
  let h: boolean | string = true
  try { h = command.habilitado?.() ?? true } catch { h = false }
  if (h === true) return { enabled: true }
  return typeof h === 'string' ? { enabled: false, reason: h } : { enabled: false }
}

export interface SearchResult {
  command: Command
  score: number
  state: CommandState
}

export interface SearchOptions {
  /** ids de comandos usados, el más reciente primero. */
  recent?: string[]
  limit?: number
}

/** Prefijos de modo: `>` solo acciones y ajustes, `@` solo preguntas del formulario. */
export const parseMode = (raw: string): { query: string, kinds: ReadonlySet<string> | null } => {
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('>')) return { query: trimmed.slice(1), kinds: new Set(['accion', 'ajuste']) }
  if (trimmed.startsWith('@')) return { query: trimmed.slice(1), kinds: new Set(['ir']) }
  return { query: raw, kinds: null }
}

const DISABLED_PENALTY = 50
const RECENT_BONUS = 120
const RECENT_STEP = 20

/**
 * Busca y ordena. Sin consulta: los recientes primero y luego todo en el orden
 * de registro. Con consulta: por puntaje; el reciente sube (sin saltarse de
 * calidad de acierto) y lo deshabilitado baja un poco.
 */
export const searchCommands = (commands: Command[], rawQuery: string, options: SearchOptions = {}): SearchResult[] => {
  const { recent = [], limit = 50 } = options
  const { query, kinds } = parseMode(rawQuery)
  const pool = commands.filter((c) => kinds === null || kinds.has(c.tipo ?? 'accion'))
  const hasQuery = normalize(query) !== ''

  const scored = pool.map((command, order) => {
    const idx = recent.indexOf(command.id)
    const base = hasQuery ? scoreCommand(command, query) : 0
    const bonus = idx >= 0 ? Math.max(0, RECENT_BONUS - idx * RECENT_STEP) : 0
    return { command, order, base, idx, bonus, state: commandState(command) }
  })

  const kept = hasQuery ? scored.filter((s) => s.base > 0) : scored
  kept.sort((a, b) => {
    if (!hasQuery) {
      if (a.idx >= 0 || b.idx >= 0) {
        if (a.idx < 0) return 1
        if (b.idx < 0) return -1
        return a.idx - b.idx
      }
      return a.order - b.order
    }
    const sa = a.base + a.bonus - (a.state.enabled ? 0 : DISABLED_PENALTY)
    const sb = b.base + b.bonus - (b.state.enabled ? 0 : DISABLED_PENALTY)
    return sb - sa || a.order - b.order
  })
  return kept.slice(0, limit).map((s) => ({ command: s.command, score: s.base, state: s.state }))
}
