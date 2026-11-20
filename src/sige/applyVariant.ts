import { primaryLang } from '@/core/model/translations'
import type { FormDocument, FormNode } from '@/core/model/types'

import type { VariantPreset } from './palette/variants'

type UpdateNode = (id: string, label: string, fn: (node: FormNode, doc: FormDocument) => void) => void

/**
 * Aplica el preajuste de una variante de la paleta a un nodo recién creado
 * (apariencia, etiqueta, validación, valor inicial, cálculo). Una sola
 * entrada de deshacer: se usa `updateNode` del store del formulario.
 */
export const applyVariantPreset = (updateNode: UpdateNode, id: string, preset: VariantPreset): void => {
  updateNode(id, 'Aplicar variante', (node, doc) => {
    const lang = primaryLang(doc)
    if (preset.label !== undefined) node.label = { [lang]: preset.label }
    if (preset.appearance !== undefined) node.body.appearance = preset.appearance
    if (preset.constraint !== undefined) {
      node.bind.constraint = preset.constraint
      if (preset.constraintMessage !== undefined) node.bind.constraintMessage = { [lang]: preset.constraintMessage }
    }
    if (preset.defaultValue !== undefined) node.defaultValue = preset.defaultValue
    if (preset.calculation !== undefined) node.bind.calculation = preset.calculation
  })
}
