/**
 * SIGE: reglas de revisión («lint») para formularios Kobo/KoboCollect.
 *
 * Código propio de SigeApp (no copiado de otros repos). Puro TypeScript, sin
 * Vue. Los mensajes están en español neutro a propósito: son reglas propias y
 * el panel de problemas muestra `message` tal cual. Todas son avisos
 * (`warning`) porque ninguna se puede garantizar como error en todo Kobo.
 */
import { displayText } from '@/core/model/display'
import { visit } from '@/core/model/ops'
import { isContainer, type ContainerNode, type FormDocument, type FormNode, type QuestionNode } from '@/core/model/types'
import { warning, type Issue } from '@/core/validate/issues'

const hasText = (t: Parameters<typeof displayText>[0]): boolean => displayText(t).trim() !== ''
const quoteName = (node: FormNode): string => `«${node.name}»`

/** Una pregunta es obligatoria si `required` tiene valor y no es falso. */
const isRequired = (value: string | undefined): boolean => {
  const v = (value ?? '').trim().toLowerCase()
  return v !== '' && v !== 'false()' && v !== 'false' && v !== 'no'
}

// ---------------------------------------------------------------- (1) y (2)

export const lintMessages = (doc: FormDocument): Issue[] => {
  const issues: Issue[] = []
  visit(doc.children, (node) => {
    if (node.kind !== 'question') return undefined
    if (isRequired(node.bind.required) && !hasText(node.bind.requiredMessage)) {
      issues.push(warning(
        'kobo.required-without-message',
        `La pregunta ${quoteName(node)} es obligatoria pero no tiene mensaje de error; quien llena verá un texto genérico.`,
        { nodeId: node.id }
      ))
    }
    const constraint = (node.bind.constraint ?? '').trim()
    if (constraint !== '' && !hasText(node.bind.constraintMessage)) {
      issues.push(warning(
        'kobo.constraint-without-message',
        `La pregunta ${quoteName(node)} tiene una restricción pero no tiene mensaje de restricción; quien llena no sabrá qué corregir.`,
        { nodeId: node.id }
      ))
    }
    return undefined
  })
  return issues
}

// ---------------------------------------------------------------- (3)

/**
 * Parte `expr` en el nivel superior (fuera de comillas y paréntesis) por la
 * palabra `word` (and/or). Devuelve null si hay desbalance de comillas o
 * paréntesis (en ese caso no se analiza nada).
 */
const splitTop = (expr: string, word: 'and' | 'or'): string[] | null => {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  const width = word.length + 2 // espacio + palabra + espacio
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i]
    if (quote !== null) { if (c === quote) quote = null; continue }
    if (c === '\'' || c === '"') { quote = c; continue }
    if (c === '(') { depth++; continue }
    if (c === ')') { depth--; if (depth < 0) return null; continue }
    if (depth === 0 && /\s/.test(c) && expr.slice(i + 1, i + 1 + word.length).toLowerCase() === word &&
      /\s/.test(expr[i + width - 1] ?? '')) {
      parts.push(expr.slice(start, i))
      start = i + width
      i = start - 1
    }
  }
  if (quote !== null || depth !== 0) return null
  parts.push(expr.slice(start))
  return parts
}

/**
 * Términos de una conjunción pura. Si hay un `or` en el nivel superior la
 * expresión no es una conjunción y devolvemos null: no se analiza (seguro).
 * Los términos que no entendemos no coinciden con ningún patrón, así que
 * ignorarlos solo pierde detecciones, nunca crea falsos positivos.
 */
const conjuncts = (expr: string): string[] | null => {
  const ors = splitTop(expr, 'or')
  if (ors === null || ors.length > 1) return null
  const ands = splitTop(expr, 'and')
  return ands === null ? null : ands.map((t) => t.trim())
}

type Op = '=' | '!=' | '<' | '<=' | '>' | '>='
const NUM_TERM = /^(\.|\$\{([^}]+)\})\s*(!=|<=|>=|=|<|>)\s*(-?\d+(?:\.\d+)?)$/
const STR_TERM = /^\$\{([^}]+)\}\s*=\s*(?:'([^']*)'|"([^"]*)")$/
const SELECTED_TERM = /^selected\(\s*\$\{([^}]+)\}\s*,\s*(?:'([^']*)'|"([^"]*)")\s*\)$/

interface Bounds {
  lo: number;
  loIncl: boolean
  hi: number;
  hiIncl: boolean
  eq: Set<number>;
  ne: Set<number>
}
const emptyBounds = (): Bounds => ({
  lo: -Infinity, loIncl: true, hi: Infinity, hiIncl: true, eq: new Set(), ne: new Set(),
})

const addBound = (b: Bounds, op: Op, n: number): void => {
  if (op === '=') b.eq.add(n)
  else if (op === '!=') b.ne.add(n)
  else if (op === '>' || op === '>=') {
    const incl = op === '>='
    if (n > b.lo || (n === b.lo && !incl)) { b.lo = n; b.loIncl = incl }
  } else {
    const incl = op === '<='
    if (n < b.hi || (n === b.hi && !incl)) { b.hi = n; b.hiIncl = incl }
  }
}

/** Sobre los reales: vacío solo si es imposible para cualquier valor numérico. */
const boundsEmpty = (b: Bounds): boolean => {
  if (b.lo > b.hi) return true
  if (b.lo === b.hi && !(b.loIncl && b.hiIncl)) return true
  if (b.eq.size > 1) return true
  for (const e of b.eq) {
    if (b.ne.has(e)) return true
    if (e < b.lo || (e === b.lo && !b.loIncl)) return true
    if (e > b.hi || (e === b.hi && !b.hiIncl)) return true
  }
  // Intervalo de un solo punto y ese punto excluido con !=.
  return b.lo === b.hi && b.ne.has(b.lo)
}

/** Condición numérica imposible: p. ej. `.>5 and .<3`. */
export const numericContradiction = (expr: string, selfName: string, allowDot: boolean): boolean => {
  const terms = conjuncts(expr)
  if (terms === null) return false
  const byVar = new Map<string, Bounds>()
  for (const t of terms) {
    const m = NUM_TERM.exec(t)
    if (m === null) continue
    const isDot = m[1] === '.'
    if (isDot && !allowDot) continue
    // En un constraint, `.` y ${propio} son el mismo valor.
    const key = isDot ? selfName : m[2]
    const b = byVar.get(key) ?? emptyBounds()
    addBound(b, m[3] as Op, Number(m[4]))
    byVar.set(key, b)
  }
  for (const b of byVar.values()) if (boundsEmpty(b)) return true
  return false
}

const findQuestion = (doc: FormDocument, name: string): QuestionNode | null => {
  const found: QuestionNode[] = []
  visit(doc.children, (n) => { if (n.kind === 'question' && n.name === name) found.push(n); return undefined })
  return found.length === 1 ? found[0] : null // ambiguo: no se analiza
}

/** Opciones de un select de lista del propio formulario, o null si no es seguro. */
const fixedOptions = (doc: FormDocument, q: QuestionNode): Set<string> | null => {
  if (q.type !== 'select_one' && q.type !== 'select_multiple') return null
  if (q.listRef === undefined) return null
  const list = doc.choiceLists[q.listRef]
  if (list === undefined) return null
  // Un valor por defecto o calculado podría traer una opción fuera de lista.
  if ((q.defaultValue ?? '').trim() !== '' || (q.bind.calculation ?? '').trim() !== '') return null
  return new Set(list.choices.map((c) => c.name))
}

/**
 * Texto imposible: `${a}='x'` con `a` select_one sin la opción 'x',
 * `selected(${a},'x')` sin esa opción, o `${a}='x' and ${a}='y'`.
 */
export const textContradiction = (doc: FormDocument, expr: string): boolean => {
  const terms = conjuncts(expr)
  if (terms === null) return false
  const equalsOf = new Map<string, Set<string>>()
  for (const t of terms) {
    const eq = STR_TERM.exec(t)
    if (eq !== null) {
      const value = eq[2] ?? eq[3]
      const set = equalsOf.get(eq[1]) ?? new Set<string>()
      set.add(value)
      equalsOf.set(eq[1], set)
      const q = findQuestion(doc, eq[1])
      if (q !== null && q.type === 'select_one') {
        const opts = fixedOptions(doc, q)
        if (opts !== null && !opts.has(value)) return true
      }
      continue
    }
    const sel = SELECTED_TERM.exec(t)
    if (sel !== null) {
      const q = findQuestion(doc, sel[1])
      const value = sel[2] ?? sel[3]
      if (q !== null) {
        const opts = fixedOptions(doc, q)
        if (opts !== null && !opts.has(value)) return true
      }
    }
  }
  for (const set of equalsOf.values()) if (set.size > 1) return true
  return false
}

export const lintImpossible = (doc: FormDocument): Issue[] => {
  const issues: Issue[] = []
  visit(doc.children, (node) => {
    const sites: Array<['relevant' | 'constraint', string | undefined]> = [
      ['relevant', node.bind.relevant],
      ['constraint', node.bind.constraint],
    ]
    for (const [field, raw] of sites) {
      const expr = (raw ?? '').trim()
      if (expr === '') continue
      if (numericContradiction(expr, node.name, field === 'constraint') || textContradiction(doc, expr)) {
        issues.push(warning(
          `kobo.${field}-impossible`,
          field === 'relevant'
            ? `La condición de visibilidad de ${quoteName(node)} nunca puede cumplirse (${expr}); la pregunta quedaría siempre oculta.`
            : `La restricción de ${quoteName(node)} nunca puede cumplirse (${expr}); ninguna respuesta sería válida.`,
          { nodeId: node.id }
        ))
      }
    }
    return undefined
  })
  return issues
}

// ---------------------------------------------------------------- (4)

const LADDER_NAME = /^na([0-4])(?:_(.+))?$/i
const MIN_LEVELS_TO_JUDGE = 2 // un `na1` suelto no se considera una escalera

const ladderIn = (children: FormNode[], anchor: FormNode | null): Issue[] => {
  const issues: Issue[] = []
  const bySuffix = new Map<string, Map<number, FormNode>>()
  for (const child of children) {
    if (child.kind !== 'question') continue
    const m = LADDER_NAME.exec(child.name)
    if (m === null) continue
    const suffix = (m[2] ?? '').toLowerCase()
    const levels = bySuffix.get(suffix) ?? new Map<number, FormNode>()
    levels.set(Number(m[1]), child)
    bySuffix.set(suffix, levels)
  }
  for (const [suffix, levels] of bySuffix) {
    if (levels.size < MIN_LEVELS_TO_JUDGE) continue
    const anchorNode = anchor ?? [...levels.values()][0]
    const sfx = suffix === '' ? '' : `_${suffix}`
    const label = `na0${sfx} a na4${sfx}`
    const missing = [0, 1, 2, 3, 4].filter((n) => !levels.has(n))
    if (missing.length > 0) {
      issues.push(warning(
        'kobo.ladder-incomplete',
        `La escalera de abundancia (${label}) está incompleta: faltan ${missing.map((n) => `na${n}${sfx}`).join(', ')}.`,
        { nodeId: anchorNode.id }
      ))
    }
    const hasTotal = children.some((c) => c.kind === 'question' && /total/i.test(c.name) &&
      (suffix === '' || c.name.toLowerCase().includes(suffix)))
    if (!hasTotal) {
      issues.push(warning(
        'kobo.ladder-no-total',
        `La escalera de abundancia (${label}) no tiene un campo de total (por ejemplo «total${sfx}») para verificar la suma.`,
        { nodeId: anchorNode.id }
      ))
    }
  }
  return issues
}

export const lintLadder = (doc: FormDocument): Issue[] => {
  const issues = ladderIn(doc.children, null)
  visit(doc.children, (node) => {
    if (isContainer(node)) issues.push(...ladderIn(node.children, node))
    return undefined
  })
  return issues
}

// ---------------------------------------------------------------- (5)

export const KOBO_MAX_CHOICES = 3000

const tokens = (appearance: string | undefined): string[] =>
  (appearance ?? '').split(/\s+/).filter((t) => t !== '')

const NOW_CALL = /\bnow\s*\(\s*\)/

export const lintCompat = (doc: FormDocument): Issue[] => {
  const issues: Issue[] = []
  const walk = (nodes: FormNode[], fieldListAncestor: ContainerNode | null): void => {
    for (const node of nodes) {
      const toks = tokens(node.body.appearance)
      if (toks.includes('horizontal') || toks.includes('horizontal-compact')) {
        issues.push(warning(
          'kobo.appearance-horizontal',
          `La pregunta ${quoteName(node)} usa la apariencia «horizontal», que solo funciona en la versión web; en KoboCollect se ve en vertical. Use «columns» (por ejemplo columns-2).`,
          { nodeId: node.id }
        ))
      }
      if (node.kind === 'repeat' && fieldListAncestor !== null) {
        issues.push(warning(
          'kobo.repeat-in-field-list',
          `La repetición ${quoteName(node)} está dentro del grupo ${quoteName(fieldListAncestor)} con apariencia «field-list»; KoboCollect no lo admite. Saque la repetición del grupo o quite «field-list».`,
          { nodeId: node.id }
        ))
      }
      if (node.kind === 'question' && node.type === 'time' && NOW_CALL.test(node.defaultValue ?? '')) {
        issues.push(warning(
          'kobo.time-now-experimental',
          `La pregunta de hora ${quoteName(node)} usa now() como valor inicial; en Kobo esto es experimental y puede guardar una hora distinta a la esperada.`,
          { nodeId: node.id }
        ))
      }
      if (isContainer(node)) {
        const isFieldList = node.kind === 'group' && toks.includes('field-list')
        walk(node.children, isFieldList ? node : fieldListAncestor)
      }
    }
  }
  walk(doc.children, null)
  for (const list of Object.values(doc.choiceLists)) {
    if (list.choices.length > KOBO_MAX_CHOICES) {
      issues.push(warning(
        'kobo.list-too-large',
        `La lista «${list.name}» tiene ${list.choices.length} opciones; Kobo se vuelve lento sobre ${KOBO_MAX_CHOICES}. Use un archivo CSV externo (select_one_from_file).`,
        { listName: list.name }
      ))
    }
  }
  return issues
}

/** Todas las reglas Kobo de SigeApp, en orden estable. */
export const validateKobo = (doc: FormDocument): Issue[] => [
  ...lintMessages(doc),
  ...lintImpossible(doc),
  ...lintLadder(doc),
  ...lintCompat(doc),
]
