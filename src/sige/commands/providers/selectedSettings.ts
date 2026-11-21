import { getQuestionType } from '@/core/registry/question-types'
import { hasNoDefaultSupport } from '@/sige/defaultPresets'

import { showQuestionSettings, type PropertyTab } from '../bridge'
import type { Command, CommandContext } from '../types'

/**
 * (5) Ajustes de la pregunta seleccionada. Cada comando abre el panel de
 * Ajustes en la pestaña correcta (y deja el cursor en el campo); «obligatoria»
 * y «solo lectura» además aplican el cambio con la misma entrada de deshacer
 * que el interruptor del panel. Sin pregunta seleccionada (o si el ajuste no
 * aplica a ese tipo) el comando sale deshabilitado con su motivo.
 */
export const selectedSettingsProvider = (ctx: CommandContext): Command[] => {
  const { t, form, editor, ui } = ctx
  const node = form.getNode(editor.selectedNodeId)
  const single = editor.selectedNodeIds.size === 1 && node !== null
  const def = node === null ? undefined : getQuestionType(node.kind === 'question' ? node.type : node.kind)
  const isQuestion = node?.kind === 'question'
  const isMeta = def?.category === 'meta'
  const isCalculate = isQuestion && node.type === 'calculate'
  const cat = t('sigePalette.cat.settings')

  /** `null` = aplica; texto = motivo de que no. */
  const gate = (applies: boolean): (() => boolean | string) => () => {
    if (!single) return t('sigePalette.reason.noSelection')
    return applies || t('sigePalette.reason.notApplicable')
  }
  const open = (tab: PropertyTab, sectionKey: string, focusTestId?: string): void => {
    showQuestionSettings(editor, ui, tab, { sectionKey, focusTestId })
  }
  const toggles = isQuestion && !isMeta && !isCalculate
  const required = node?.bind.required !== undefined
  const readonly = node?.bind.readonly !== undefined

  const base = { categoria: cat, tipo: 'ajuste' as const }
  const out: Command[] = [
    {
      ...base,
      id: 'set:required',
      icono: 'pi pi-asterisk',
      titulo: required ? t('sigePalette.set.notRequired') : t('sigePalette.set.required'),
      palabrasClave: ['obligatoria', 'obligatorio', 'requerida', 'requerido', 'required', 'mandatory', 'obligatoire', 'opcional'],
      habilitado: gate(toggles),
      ejecutar: () => {
        const id = editor.selectedNodeId
        if (id === null) return
        form.updateNode(id, t('properties.basic.undoToggleRequired'), (n) => {
          n.bind.required = required ? undefined : 'true()'
        })
        open('rules', 'rules-basic', 'prop-required')
      },
    },
    {
      ...base,
      id: 'set:readonly',
      icono: 'pi pi-lock',
      titulo: readonly ? t('sigePalette.set.notReadOnly') : t('sigePalette.set.readOnly'),
      palabrasClave: ['solo lectura', 'bloqueada', 'no editable', 'read only', 'readonly', 'lecture seule'],
      habilitado: gate(toggles),
      ejecutar: () => {
        const id = editor.selectedNodeId
        if (id === null) return
        form.updateNode(id, t('properties.basic.undoToggleReadOnly'), (n) => {
          n.bind.readonly = readonly ? undefined : 'true()'
        })
        open('rules', 'rules-basic', 'prop-readonly')
      },
    },
    {
      ...base,
      id: 'set:default',
      icono: 'pi pi-pencil',
      titulo: t('sigePalette.set.defaultValue'),
      palabrasClave: ['valor inicial', 'valor por defecto', 'predeterminado', 'default', 'hoy', 'valeur par défaut'],
      habilitado: gate(isQuestion && !isMeta && node !== null && !hasNoDefaultSupport(node.type)),
      ejecutar: () => { open('rules', 'rules-basic', 'prop-default-preset-select') },
    },
    {
      ...base,
      id: 'set:relevant',
      icono: 'pi pi-eye-slash',
      titulo: t('sigePalette.set.relevant'),
      palabrasClave: ['condicion', 'mostrar si', 'relevante', 'relevant', 'visible', 'salto', 'skip logic', 'condition'],
      habilitado: gate(node !== null && !isMeta),
      ejecutar: () => { open('rules', 'logic') },
    },
    {
      ...base,
      id: 'set:constraint',
      icono: 'pi pi-shield',
      titulo: t('sigePalette.set.constraint'),
      palabrasClave: ['validacion', 'restriccion', 'limite', 'minimo', 'maximo', 'constraint', 'validation', 'contrainte'],
      habilitado: gate(isQuestion && !isMeta),
      ejecutar: () => { open('rules', 'logic') },
    },
    {
      ...base,
      id: 'set:calculation',
      icono: 'pi pi-calculator',
      titulo: t('sigePalette.set.calculation'),
      palabrasClave: ['calculo', 'formula', 'calcular', 'calculation', 'calculate', 'calcul'],
      habilitado: gate(isQuestion && (isCalculate || !isMeta)),
      ejecutar: () => { open('rules', 'logic') },
    },
    {
      ...base,
      id: 'set:choices',
      icono: 'pi pi-list',
      titulo: t('sigePalette.set.choices'),
      palabrasClave: ['opciones', 'lista', 'alternativas', 'choices', 'options', 'choix'],
      habilitado: gate(def?.requiresChoices === true),
      ejecutar: () => { open('rules', 'choices', 'prop-choice-list') },
    },
    {
      ...base,
      id: 'set:label',
      icono: 'pi pi-align-left',
      titulo: t('sigePalette.set.label'),
      palabrasClave: ['etiqueta', 'texto de la pregunta', 'enunciado', 'label', 'libellé'],
      habilitado: gate(node !== null && !isMeta && !isCalculate),
      ejecutar: () => { open('content', 'basics', 'prop-label') },
    },
    {
      ...base,
      id: 'set:hint',
      icono: 'pi pi-info-circle',
      titulo: t('sigePalette.set.hint'),
      palabrasClave: ['ayuda', 'pista', 'indicacion', 'hint', 'aide', 'texto de ayuda'],
      habilitado: gate(node !== null && !isMeta && !isCalculate),
      ejecutar: () => { open('content', 'basics', 'prop-hint') },
    },
    {
      ...base,
      id: 'set:appearance',
      icono: 'pi pi-palette',
      titulo: t('sigePalette.set.appearance'),
      palabrasClave: ['apariencia', 'aspecto', 'columnas', 'desplegable', 'appearance', 'apparence'],
      habilitado: gate((def?.appearances?.length ?? 0) > 0),
      ejecutar: () => { open('content', 'appearance') },
    },
    {
      ...base,
      id: 'set:name',
      icono: 'pi pi-tag',
      titulo: t('sigePalette.set.name'),
      palabrasClave: ['nombre', 'identificador', 'id', 'columna', 'name', 'nom'],
      habilitado: gate(node !== null),
      ejecutar: () => { open('adv', 'adv-basic', 'prop-name') },
    },
    {
      ...base,
      id: 'set:type-help',
      icono: 'pi pi-question-circle',
      titulo: t('sigePalette.set.typeHelp'),
      palabrasClave: ['ayuda', 'que es este tipo', 'help', 'aide', 'tipo de pregunta'],
      habilitado: gate(def !== undefined),
      ejecutar: () => { if (def !== undefined) editor.openTypeHelp(def.type) },
    },
  ]
  return out
}
