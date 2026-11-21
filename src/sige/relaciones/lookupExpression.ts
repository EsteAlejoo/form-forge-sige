/**
 * SIGE: «Traer columna». Arma (y reconoce) el `calculate` que busca, en una lista
 * interna con columnas extra, la fila elegida en una pregunta `select_one`:
 *
 *   instance('cuarteles')/root/item[name=${cuartel}]/especie
 *
 * Construcción verificada con scripts/make-sige-ejemplos.py (aforo_riego:
 * `instance('sectores')/root/item[name=${sector}]/caudal_diseno`) y con la
 * documentación de ODK (https://docs.getodk.org/form-datasets/, consultas
 * `instance('lista')/root/item[...]`). Lógica pura, sin Vue.
 *
 * Límite conocido: la etiqueta (`label`) NO se puede traer así: en el XForm es un
 * itext; solo sirven las columnas extra. Y `name` debe ser único en la lista, si no
 * Collect falla con error de tipo (por eso el importador garantiza nombres únicos).
 */
import { flatten } from '@/core/model/ops'
import { extraColumns } from '@/core/model/choice-lists'
import type { FormDocument } from '@/core/model/types'

/** Nombre válido como lista, campo o columna (elemento XML / XPath). */
export const SAFE_XPATH_NAME = /^[A-Za-z_][\w.-]*$/

export const buildLookupExpression = (listName: string, originField: string, column: string): string =>
  `instance('${listName}')/root/item[name=\${${originField}}]/${column}`

export interface ParsedLookup {
  listName: string
  originField: string
  column: string
}

const LOOKUP = /^\s*instance\(\s*(?:'([^']+)'|"([^"]+)")\s*\)\s*\/\s*root\s*\/\s*item\s*\[\s*name\s*=\s*\$\{([A-Za-z_][\w.-]*)\}\s*\]\s*\/\s*([A-Za-z_][\w.-]*)\s*$/

/** Reconoce SOLO la forma exacta que genera `buildLookupExpression`; cualquier otra devuelve null. */
export const parseLookupExpression = (expr: string | undefined): ParsedLookup | null => {
  if (expr === undefined) return null
  const m = LOOKUP.exec(expr)
  if (m === null) return null
  return { listName: m[1] ?? m[2], originField: m[3], column: m[4] }
}

export interface LookupOrigin {
  /** Nombre de la pregunta `select_one` (lo que va dentro de `${...}`). */
  field: string
  label: string
  listName: string
  /** Columnas extra de su lista que se pueden traer (nombres válidos para XPath). */
  columns: string[]
}

/**
 * Preguntas `select_one` cuya lista interna tiene columnas extra, en orden del
 * formulario. Las listas sin columnas extra no se ofrecen (no hay qué traer).
 */
export const lookupOrigins = (doc: FormDocument): LookupOrigin[] => {
  const out: LookupOrigin[] = []
  for (const n of flatten(doc.children)) {
    if (n.kind !== 'question' || n.type !== 'select_one' || n.listRef === undefined) continue
    const list = doc.choiceLists[n.listRef]
    if (list === undefined || !SAFE_XPATH_NAME.test(list.name)) continue
    const columns = extraColumns(list).filter((c) => SAFE_XPATH_NAME.test(c))
    if (columns.length === 0) continue
    out.push({ field: n.name, label: n.name, listName: list.name, columns })
  }
  return out
}

export type LookupProblemCode =
  | 'list-missing' // la lista no existe en el formulario (o es un archivo CSV)
  | 'column-missing' // la lista existe pero no tiene esa columna
  | 'origin-missing' // la pregunta de origen no existe
  | 'origin-other-list' // la pregunta de origen usa otra lista distinta de la consultada

export interface LookupProblem {
  code: LookupProblemCode
  listName: string
  column: string
  field: string
}

/** Avisos sobre un lookup ya escrito. Lista vacía = consistente. */
export const checkLookup = (doc: FormDocument, lookup: ParsedLookup): LookupProblem[] => {
  const base = { listName: lookup.listName, column: lookup.column, field: lookup.originField }
  const problems: LookupProblem[] = []
  const list = doc.choiceLists[lookup.listName]
  if (list === undefined) problems.push({ code: 'list-missing', ...base })
  else if (!extraColumns(list).includes(lookup.column)) problems.push({ code: 'column-missing', ...base })
  const origin = flatten(doc.children).find((n) => n.name === lookup.originField)
  if (origin === undefined) problems.push({ code: 'origin-missing', ...base })
  else if (origin.kind === 'question' && origin.listRef !== undefined && origin.listRef !== lookup.listName) {
    problems.push({ code: 'origin-other-list', ...base })
  }
  return problems
}

/** Primera opción de la lista con valor en la columna: ejemplo «cuartel = 2 → especie = Cerezo». */
export const lookupExample = (doc: FormDocument, listName: string, column: string): { name: string, value: string } | null => {
  const list = doc.choiceLists[listName]
  const choice = list?.choices.find((c) => (c.extras?.[column] ?? '') !== '')
  return choice === undefined ? null : { name: choice.name, value: choice.extras?.[column] ?? '' }
}
