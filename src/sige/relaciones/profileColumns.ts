/**
 * SIGE: perfil de columnas de una tabla (lógica pura, sin Vue). Es la base del
 * futuro motor de sugerencias (fase siguiente): para cada columna dice cuántas
 * filas hay, cuántos valores distintos, cuántos vacíos, de qué tipo parece y si
 * sirve de llave (única y sin vacíos).
 *
 * Idea tomada de la investigación (HoPF / Rostin / ptype-cat, solo el esquema
 * «primero llaves candidatas por unicidad»; código propio, sin dependencias).
 */

/** Tabla en memoria: cabecera + filas de texto (todas las celdas son string). */
export interface TableData {
  columns: string[]
  rows: string[][]
}

export type ColumnType = 'texto' | 'entero' | 'decimal' | 'fecha'

export interface ColumnProfile {
  /** Nombre de la columna tal como viene en la tabla. */
  name: string
  /** Número de filas de la tabla (incluye las vacías de esa columna). */
  nRows: number
  /** Valores distintos entre los no vacíos (comparación exacta tras recortar). */
  unique: number
  /** Celdas vacías (solo espacios cuenta como vacío). */
  empty: number
  type: ColumnType
  /** Única y sin vacíos: sirve de llave para buscar filas (`item[name=...]`). */
  keyCandidate: boolean
}

// Un entero con ceros a la izquierda («007») es un código, no un número: queda como texto.
const INT = /^[+-]?(0|[1-9]\d*)$/
const DECIMAL = /^[+-]?(0|[1-9]\d*)([.,]\d+)?$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const LOCAL_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/

const validDate = (y: number, m: number, d: number): boolean =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1000

const isDate = (v: string): boolean => {
  const iso = ISO_DATE.exec(v)
  if (iso !== null) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  const loc = LOCAL_DATE.exec(v)
  return loc !== null && validDate(Number(loc[3]), Number(loc[2]), Number(loc[1]))
}

/** Tipo que describe a TODOS los valores no vacíos; sin valores o mezcla → texto. */
export const inferColumnType = (values: string[]): ColumnType => {
  const filled = values.map((v) => v.trim()).filter((v) => v !== '')
  if (filled.length === 0) return 'texto'
  if (filled.every((v) => INT.test(v))) return 'entero'
  if (filled.every((v) => INT.test(v) || DECIMAL.test(v))) return 'decimal'
  if (filled.every(isDate)) return 'fecha'
  return 'texto'
}

export const profileColumns = (table: TableData): ColumnProfile[] =>
  table.columns.map((name, c) => {
    const cells = table.rows.map((row) => (row[c] ?? '').trim())
    const filled = cells.filter((v) => v !== '')
    const unique = new Set(filled).size
    const empty = cells.length - filled.length
    return {
      name,
      nRows: cells.length,
      unique,
      empty,
      type: inferColumnType(cells),
      keyCandidate: cells.length > 0 && empty === 0 && unique === cells.length,
    }
  })
