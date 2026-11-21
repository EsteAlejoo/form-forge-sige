/**
 * SIGE: «Importar tabla». Convierte una tabla leída de un .csv/.xlsx en una lista
 * de opciones con columnas extra (lógica pura, sin Vue; la lectura del archivo
 * vive en readTableFile.ts).
 *
 * - Dos columnas hacen de `name` y `label`; todas las demás quedan como columnas
 *   extra de la lista (las que luego se traen con `instance()`).
 * - `name` se genera de forma segura: sin tildes ni espacios, único dentro de la lista.
 * - Nada se inventa en silencio: lo que se cambió o se generó se cuenta en el informe.
 */
import { setText } from '@/core/model/display'
import type { Choice, ChoiceList, FormDocument, Lang } from '@/core/model/types'

import type { TableData } from './profileColumns'

/** Tope de filas que la vista previa de ODK maneja sin problema (ver la investigación). */
export const ROWS_PREVIEW_CAP = 500
/** Sobre esto Kobo recomienda CSV adjunto en vez de lista interna. */
export const ROWS_KOBO_ADVISORY = 3000

/** Sin tildes, solo letras/números/guion bajo; vacío si no queda nada. */
export const slugify = (text: string, opts: { lower?: boolean } = {}): string => {
  const plain = text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return opts.lower === true ? plain.toLowerCase() : plain
}

/** Primera fila = cabecera. Cabeceras vacías o repetidas se completan; filas en blanco se descartan. */
export const tableFromRows = (raw: string[][]): TableData => {
  if (raw.length === 0) return { columns: [], rows: [] }
  const width = Math.max(...raw.map((r) => r.length))
  const header = Array.from({ length: width }, (_, i) => (raw[0][i] ?? '').trim())
  // Columnas totalmente vacías al final (típico de xlsx con formato) no cuentan.
  let last = width - 1
  while (last >= 0 && header[last] === '' && raw.slice(1).every((r) => (r[last] ?? '').trim() === '')) last--
  const used = new Set<string>()
  const columns = header.slice(0, last + 1).map((h, i) => {
    const base = h === '' ? `columna_${i + 1}` : h
    let name = base
    let n = 1
    while (used.has(name)) name = `${base}_${++n}`
    used.add(name)
    return name
  })
  const rows = raw.slice(1)
    .map((r) => columns.map((_, i) => (r[i] ?? '').trim()))
    .filter((r) => r.some((cell) => cell !== ''))
  return { columns, rows }
}

export interface DuplicateName {
  /** Valor ya limpio (el que quedaría como `name`). */
  value: string
  /** Filas de datos (empezando en 1) donde aparece. */
  rows: number[]
}

export interface NameAnalysis {
  /** Filas de datos (desde 1) con la celda vacía. */
  emptyRows: number[]
  duplicates: DuplicateName[]
  /** Cuántos valores cambian al volverlos seguros (tildes, espacios, signos). */
  unsafe: number
}

/** Revisa la columna elegida como `name`: vacíos, duplicados (ya limpios) y valores que cambiarían. */
export const analyzeNameColumn = (values: string[]): NameAnalysis => {
  const emptyRows: number[] = []
  const seen = new Map<string, number[]>()
  let unsafe = 0
  values.forEach((v, i) => {
    const raw = v.trim()
    if (raw === '') { emptyRows.push(i + 1); return }
    const slug = slugify(raw)
    if (slug !== raw) unsafe++
    const key = slug === '' ? raw : slug
    seen.set(key, [...(seen.get(key) ?? []), i + 1])
  })
  const duplicates = [...seen.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([value, rows]) => ({ value, rows }))
  return { emptyRows, duplicates, unsafe }
}

/** Nombres únicos y seguros. El primero de cada repetido conserva el nombre; los siguientes llevan _2, _3… */
export const uniqueSafeNames = (raws: string[], fallbackLabels: string[] = []): string[] => {
  const base = raws.map((raw, i) => {
    const s = slugify(raw)
    if (s !== '') return s
    const fromLabel = slugify(fallbackLabels[i] ?? '')
    return fromLabel !== '' ? fromLabel : `fila_${i + 1}`
  })
  const reserved = new Set(base)
  const taken = new Set<string>()
  return base.map((b) => {
    if (!taken.has(b)) { taken.add(b); return b }
    let n = 2
    while (taken.has(`${b}_${n}`) || reserved.has(`${b}_${n}`)) n++
    const name = `${b}_${n}`
    taken.add(name)
    return name
  })
}

// Encabezados que XLSForm usa en la hoja `choices`: una columna extra no puede llamarse así.
const RESERVED_COLUMNS = new Set(['name', 'label', 'list_name', 'geometry', 'itextid'])

/** Nombre de columna extra seguro: minúsculas, sin tildes, empieza con letra/_ y no choca con los reservados. */
export const safeColumnNames = (headers: string[], taken: Iterable<string> = []): string[] => {
  const used = new Set<string>(taken)
  return headers.map((h, i) => {
    let base = slugify(h, { lower: true })
    if (base === '') base = `columna_${i + 1}`
    if (/^\d/.test(base)) base = `c_${base}`
    if (RESERVED_COLUMNS.has(base) || base.startsWith('media')) base = `col_${base}`
    let name = base
    let n = 1
    while (used.has(name)) name = `${base}_${++n}`
    used.add(name)
    return name
  })
}

/** Nombre de lista válido (`^[A-Za-z_][\w.-]*$`) a partir de un nombre de archivo o texto libre. */
export const safeListName = (text: string, existing: Record<string, unknown> = {}): string => {
  const noExt = text.replace(/\.[A-Za-z0-9]{1,5}$/, '')
  let base = slugify(noExt, { lower: true })
  if (base === '') base = 'tabla'
  if (/^\d/.test(base)) base = `lista_${base}`
  let name = base
  let n = 1
  while (existing[name] !== undefined) name = `${base}_${++n}`
  return name
}

export interface ImportOptions {
  /** Nombre de la lista (list_name). */
  listName: string
  /** Columna de la tabla que da el `name` de cada opción. */
  nameColumn: string
  /** Columna que da la etiqueta; si falta, la etiqueta es el valor de `nameColumn`. */
  labelColumn?: string
  /** Idioma donde escribir la etiqueta (idioma principal del formulario). */
  lang?: Lang
}

export interface ImportReport {
  rowsRead: number
  rowsKept: number
  /** `name` vacíos que hubo que generar (de la etiqueta o `fila_N`). */
  generatedNames: number
  /** `name` que cambiaron al volverse seguros (tildes, espacios, signos). */
  changedNames: number
  /** `name` repetidos que recibieron sufijo _2, _3… */
  suffixedNames: number
  /** Columna de origen → columna extra resultante. */
  extraColumns: Array<{ source: string, name: string }>
  /** Aviso de tamaño: lista muy grande. */
  size: 'ok' | 'preview-cap' | 'kobo-advisory'
}

export interface ImportResult {
  list: ChoiceList
  report: ImportReport
}

export class ImportTableError extends Error {}

export const buildChoiceListFromTable = (table: TableData, opts: ImportOptions): ImportResult => {
  const nameIdx = table.columns.indexOf(opts.nameColumn)
  if (nameIdx < 0) throw new ImportTableError(`Unknown name column: ${opts.nameColumn}`)
  const labelIdx = opts.labelColumn === undefined ? nameIdx : table.columns.indexOf(opts.labelColumn)
  if (labelIdx < 0) throw new ImportTableError(`Unknown label column: ${opts.labelColumn}`)

  const rows = table.rows.filter((r) => r.some((cell) => cell.trim() !== ''))
  const rawNames = rows.map((r) => (r[nameIdx] ?? '').trim())
  const labels = rows.map((r) => (r[labelIdx] ?? '').trim())
  const names = uniqueSafeNames(rawNames, labels)

  const extraIdx = table.columns.map((_, i) => i).filter((i) => i !== nameIdx && i !== labelIdx)
  const extraNames = safeColumnNames(extraIdx.map((i) => table.columns[i]))

  const choices: Choice[] = rows.map((r, k) => {
    const label = labels[k] === '' ? rawNames[k] : labels[k]
    const choice: Choice = { name: names[k] }
    const text = label === '' ? names[k] : label
    choice.label = setText(undefined, text, opts.lang)
    if (extraIdx.length > 0) {
      choice.extras = Object.fromEntries(extraIdx.map((c, e) => [extraNames[e], (r[c] ?? '').trim()]))
    }
    return choice
  })

  const list: ChoiceList = { name: opts.listName, choices }
  if (extraNames.length > 0) list.extraColumnOrder = [...extraNames]

  const slugged = rawNames.map((r) => slugify(r))
  const report: ImportReport = {
    rowsRead: table.rows.length,
    rowsKept: rows.length,
    generatedNames: rawNames.filter((r, i) => r === '' || slugged[i] === '').length,
    changedNames: rawNames.filter((r, i) => r !== '' && slugged[i] !== '' && slugged[i] !== r).length,
    suffixedNames: names.filter((n, i) => slugged[i] !== '' && n !== slugged[i]).length,
    extraColumns: extraIdx.map((c, e) => ({ source: table.columns[c], name: extraNames[e] })),
    size: rows.length > ROWS_KOBO_ADVISORY ? 'kobo-advisory' : rows.length > ROWS_PREVIEW_CAP ? 'preview-cap' : 'ok',
  }
  return { list, report }
}

/** Agrega la lista al documento (llamar dentro de un solo `form.mutate`). Falla si el nombre ya existe. */
export const addTableAsList = (doc: FormDocument, table: TableData, opts: ImportOptions): ImportReport => {
  if (doc.choiceLists[opts.listName] !== undefined) throw new ImportTableError(`List already exists: ${opts.listName}`)
  const { list, report } = buildChoiceListFromTable(table, opts)
  doc.choiceLists[list.name] = list
  return report
}
