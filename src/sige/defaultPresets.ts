/**
 * SIGE: valor inicial amigable. Lógica pura (sin Vue) que traduce entre el
 * `default` crudo del XLSForm y presets según el tipo de pregunta.
 *
 * - `presetsFor(type)`   → presets que se ofrecen para ese tipo ([] = sin presets).
 * - `detectPreset(...)`  → qué preset representa el default actual (o `custom`).
 * - `presetToDefault(...)` → el `default` que se escribe al elegir un preset.
 *
 * Kobo no tiene "placeholder": no se inventa. La hora actual en `time` es
 * experimental en Kobo, así que NO se ofrece (solo hora fija).
 */

export type PresetId = 'none' | 'today' | 'now' | 'zero' | 'fixed' | 'first' | 'chosen' | 'custom'

/** Tipo de control que necesita el valor del preset. */
export type PresetInput = 'date' | 'datetime' | 'time' | 'integer' | 'decimal' | 'text' | 'choice' | 'choices' | null

/** Tipos donde no tiene sentido un valor inicial: el campo se oculta (salvo que ya traiga uno). */
const NO_DEFAULT_TYPES = new Set([
  'geopoint', 'geotrace', 'geoshape', 'start-geopoint',
  'image', 'audio', 'background-audio', 'video', 'file', 'barcode',
  'acknowledge', 'note',
])

export const hasNoDefaultSupport = (type: string): boolean => NO_DEFAULT_TYPES.has(type)

const PRESETS: Record<string, PresetId[]> = {
  date: ['none', 'today', 'fixed'],
  datetime: ['none', 'now', 'fixed'],
  time: ['none', 'fixed'],
  integer: ['none', 'zero', 'fixed'],
  decimal: ['none', 'zero', 'fixed'],
  text: ['none', 'fixed'],
  select_one: ['none', 'first', 'chosen'],
  select_multiple: ['none', 'chosen'],
}

export const presetsFor = (type: string): PresetId[] => PRESETS[type] ?? []

/** Qué control pide el valor de un preset `fixed`/`chosen` en este tipo. */
export const inputFor = (type: string, preset: PresetId): PresetInput => {
  if (preset === 'chosen') return type === 'select_multiple' ? 'choices' : 'choice'
  if (preset !== 'fixed') return null
  switch (type) {
    case 'date': return 'date'
    case 'datetime': return 'datetime'
    case 'time': return 'time'
    case 'integer': return 'integer'
    case 'decimal': return 'decimal'
    case 'text': return 'text'
    default: return null
  }
}

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/
const RE_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const RE_TIME = /^\d{2}:\d{2}(:\d{2})?$/
const RE_INT = /^-?\d+$/
const RE_DEC = /^-?\d+(\.\d+)?$/

const isDynamic = (v: string): boolean => v.includes('${') || v.includes('(')

/** Normaliza el valor de un input al formato XLSForm (agrega segundos a hora/fecha-hora). */
const normalizeFixed = (type: string, value: string): string | undefined => {
  const v = value.trim()
  if (v === '') return undefined
  switch (type) {
    case 'date': return RE_DATE.test(v) ? v : undefined
    case 'datetime': return RE_DATETIME.test(v) ? (v.length === 16 ? `${v}:00` : v) : undefined
    case 'time': return RE_TIME.test(v) ? (v.length === 5 ? `${v}:00` : v) : undefined
    case 'integer': return RE_INT.test(v) ? v : undefined
    case 'decimal': return RE_DEC.test(v) ? v : undefined
    case 'text': return value === '' ? undefined : value
    default: return undefined
  }
}

/**
 * El `default` que escribe un preset. `undefined` = sin valor inicial (o valor
 * inválido/vacío: no se escribe nada). `choices` = `name` de las opciones de la lista.
 */
export const presetToDefault = (
  type: string,
  preset: PresetId,
  value: string | string[] = '',
  choices: readonly string[] = []
): string | undefined => {
  if (!presetsFor(type).includes(preset)) return undefined
  switch (preset) {
    case 'today': return 'today()'
    case 'now': return 'now()'
    case 'zero': return '0'
    case 'first': return choices[0]
    case 'fixed': return normalizeFixed(type, Array.isArray(value) ? (value[0] ?? '') : value)
    case 'chosen': {
      const picked = (Array.isArray(value) ? value : [value]).filter((n) => choices.includes(n))
      if (type === 'select_multiple') {
        // En el orden de la lista, sin repetidos.
        const set = choices.filter((n) => picked.includes(n))
        return set.length === 0 ? undefined : set.join(' ')
      }
      return picked[0]
    }
    default: return undefined
  }
}

export interface DetectedPreset {
  preset: PresetId
  /** Valor para el control del preset (texto, o lista de `name` en select_multiple). */
  value: string | string[]
}

/**
 * Qué preset representa el `default` actual. Cualquier valor que no calce
 * exactamente (expresiones, opciones inexistentes, formatos raros) es `custom`
 * y se conserva tal cual: nunca se pisa un dato.
 */
export const detectPreset = (
  type: string,
  current: string | undefined,
  choices: readonly string[] = []
): DetectedPreset => {
  if (current === undefined || current === '') return { preset: 'none', value: '' }
  const offered = presetsFor(type)
  const custom: DetectedPreset = { preset: 'custom', value: current }
  if (offered.length === 0) return custom
  if (offered.includes('today') && current === 'today()') return { preset: 'today', value: '' }
  if (offered.includes('now') && current === 'now()') return { preset: 'now', value: '' }
  if (offered.includes('zero') && current === '0') return { preset: 'zero', value: '' }
  if (type === 'select_one') {
    if (choices.length > 0 && current === choices[0]) return { preset: 'first', value: current }
    return choices.includes(current) ? { preset: 'chosen', value: current } : custom
  }
  if (type === 'select_multiple') {
    const names = current.split(/\s+/).filter((n) => n !== '')
    return names.length > 0 && names.every((n) => choices.includes(n))
      ? { preset: 'chosen', value: names }
      : custom
  }
  if (isDynamic(current) && type !== 'text') return custom
  if (type === 'text' && isDynamic(current)) return custom
  const fixed = normalizeFixed(type, current)
  return fixed !== undefined && fixed === current ? { preset: 'fixed', value: current } : custom
}
