// SIGE: lógica pura (sin Vue, sin DOM) del «clic en el celular → módulo correcto».
// Dice, dada la PARTE tocada del celular, a qué pestaña/sección/campo de Ajustes hay que ir.
import { flatten } from '@/core/model/ops'
import { isContainer, type ContainerNode, type FormDocument, type LocalizedText } from '@/core/model/types'

import { hasNoDefaultSupport, presetsFor } from '../defaultPresets'

/** Pestañas de Ajustes (mismo tipo que usa el puente de la lupa; se repite aquí para no arrastrar Vue). */
export type SettingsTab = 'content' | 'rules' | 'adv'

/** Qué parte del celular se tocó. `none` = pregunta sin parte reconocible (solo se selecciona). */
export type PreviewPart =
  | 'label'
  | 'hint'
  | 'required'
  | 'error'
  | 'options'
  | 'input'
  | 'media'
  | 'group'
  | 'repeat-control'
  | 'none'

/** Adónde llevar al usuario. */
export interface SettingsTarget {
  tab: SettingsTab
  sectionKey?: string
  focusTestId?: string
  /** Pestañear el campo enfocado para que se note cuál es. */
  flash?: boolean
}

/** Lo que hace falta saber del nodo tocado para decidir el campo exacto. */
export interface PartContext {
  kind: 'question' | 'group' | 'repeat'
  type?: string
  hasRequired?: boolean
  hasConstraint?: boolean
  /** Textos (normalizados) del mensaje de restricción, en todos los idiomas. */
  constraintMessages?: string[]
  /** Texto (normalizado) del mensaje que muestra el celular. */
  message?: string
  /** Posición de la opción en la lista del modelo (ya resuelta), si se pudo. */
  choiceIndex?: number | null
}

const norm = (s: string): string => s.replace(/[*_~]/g, '').replace(/\s+/g, ' ').trim()

/** ¿El mensaje de error visible es el de la restricción (y no el de «obligatoria»)? */
export const isConstraintMessage = (ctx: PartContext): boolean => {
  if (ctx.hasConstraint !== true) return false
  if (ctx.hasRequired !== true) return true
  const shown = norm(ctx.message ?? '')
  return shown !== '' && (ctx.constraintMessages ?? []).includes(shown)
}

/**
 * Parte → destino. `null` = no hay destino (solo selecciona, comportamiento anterior).
 * Los `data-testid` son los de BasicSection/ChoicesSection/LogicSection/DefaultPresetField.
 */
export const targetForPart = (part: PreviewPart, ctx: PartContext): SettingsTarget | null => {
  if (ctx.kind !== 'question') {
    // Un grupo o repetición: se muestran sus ajustes, sin mover el cursor (el clic también pliega el panel).
    return part === 'group' || part === 'repeat-control' || part === 'label'
      ? { tab: 'content', sectionKey: 'basics' }
      : null
  }
  switch (part) {
    case 'label':
      return { tab: 'content', sectionKey: 'basics', focusTestId: 'prop-label' }
    case 'hint':
      return { tab: 'content', sectionKey: 'basics', focusTestId: 'prop-hint' }
    case 'media':
      return { tab: 'content', sectionKey: 'basics', focusTestId: 'prop-media-section' }
    case 'required':
      return { tab: 'rules', sectionKey: 'rules-basic', focusTestId: 'prop-required' }
    case 'error': {
      if (isConstraintMessage(ctx)) return { tab: 'rules', sectionKey: 'logic', focusTestId: 'prop-constraint-message' }
      if (ctx.hasRequired === true) return { tab: 'rules', sectionKey: 'logic', focusTestId: 'prop-required-message' }
      return { tab: 'rules', sectionKey: 'logic' }
    }
    case 'options': {
      const i = ctx.choiceIndex
      return {
        tab: 'rules',
        sectionKey: 'choices',
        focusTestId: i === undefined || i === null ? 'prop-choice-list' : `choice-label-${i}`,
        flash: i !== undefined && i !== null,
      }
    }
    case 'input': {
      const type = ctx.type ?? ''
      if (hasNoDefaultSupport(type)) return { tab: 'rules', sectionKey: 'rules-basic' }
      return {
        tab: 'rules',
        sectionKey: 'rules-basic',
        focusTestId: presetsFor(type).length > 0 ? 'prop-default-preset-select' : 'prop-default',
      }
    }
    default:
      return null
  }
}

/**
 * Opción dibujada → posición en la lista del modelo. Primero por texto (en cualquier idioma, así
 * sobrevive a opciones filtradas o en otro orden); si no hay coincidencia, por posición.
 * `null` si no hay forma de saberlo.
 */
export const choiceIndexFor = (
  choices: ReadonlyArray<{ label?: LocalizedText, name?: string }>,
  renderedLabel: string,
  renderedIndex: number | undefined,
): number | null => {
  const shown = norm(renderedLabel)
  const hits: number[] = []
  if (shown !== '') {
    choices.forEach((c, i) => {
      const texts = Object.values(c.label ?? {}).filter((v): v is string => typeof v === 'string').map(norm)
      if (texts.includes(shown) || (texts.length === 0 && c.name === shown)) hits.push(i)
    })
  }
  if (hits.length === 1) return hits[0]
  if (hits.length > 1) return renderedIndex !== undefined && hits.includes(renderedIndex) ? renderedIndex : hits[0]
  if (renderedIndex !== undefined && renderedIndex >= 0 && renderedIndex < choices.length) return renderedIndex
  return null
}

/**
 * Panel (grupo/repetición) dibujado → nodo del modelo. Los paneles se alinean con los contenedores del
 * modelo por título y por orden: se busca hacia delante desde el último emparejado; si no hay, se acepta
 * una repetición con el mismo título (cada instancia de una repetición dibuja su propio panel).
 */
export const containerIdForPanel = (doc: FormDocument, panelTitles: string[], ordinal: number): string | null => {
  const containers = flatten(doc.children).filter((n): n is ContainerNode => isContainer(n))
  const titlesOf = (n: ContainerNode): string[] =>
    Object.values(n.label ?? {}).filter((v): v is string => typeof v === 'string').map(norm).filter((v) => v !== '')
  let cursor = 0
  let found: string | null = null
  for (let p = 0; p <= ordinal && p < panelTitles.length; p++) {
    const title = norm(panelTitles[p])
    let at = containers.findIndex((c, i) => i >= cursor && titlesOf(c).includes(title))
    if (at === -1) at = containers.findIndex((c) => c.kind === 'repeat' && titlesOf(c).includes(title))
    else cursor = at + 1
    found = at === -1 ? null : containers[at].id
  }
  return found
}
