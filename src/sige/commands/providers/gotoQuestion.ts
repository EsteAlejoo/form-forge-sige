import { displayText } from '@/core/model/display'
import { flatten, locateNode } from '@/core/model/ops'
import { primaryLang } from '@/core/model/translations'
import type { FormDocument, FormNode } from '@/core/model/types'
import { getQuestionType } from '@/core/registry/question-types'

import type { Command, CommandContext } from '../types'

/**
 * (3) Ir a una pregunta del formulario por su etiqueta o nombre: la selecciona,
 * despliega los grupos que la esconden y la revela en el lienzo.
 */
export const gotoQuestionProvider = (ctx: CommandContext): Command[] => {
  const { t, form, editor, labels } = ctx
  const doc = form.doc as FormDocument | null
  if (doc === null) return []
  const lang = editor.displayLanguage ?? primaryLang(doc)
  const category = t('sigePalette.cat.goto')

  const reveal = (node: FormNode): void => {
    // Despliega los grupos antepasados (collapsedIds es un Set que se reemplaza entero).
    const collapsed = new Set(editor.collapsedIds)
    let parent = locateNode(doc, node.id)?.parent ?? null
    while (parent !== null) {
      collapsed.delete(parent.id)
      parent = locateNode(doc, parent.id)?.parent ?? null
    }
    if (collapsed.size !== editor.collapsedIds.size) editor.collapsedIds = collapsed
    editor.select(node.id)
    editor.revealNodeId = node.id
  }

  return flatten(doc.children).map((node) => {
    const def = getQuestionType(node.kind === 'question' ? node.type : node.kind)
    const label = displayText(node.label, lang).trim()
    return {
      id: `goto:${node.id}`,
      titulo: label !== '' ? label : node.name,
      palabrasClave: [node.name, def === undefined ? node.kind : labels.typeTitle(def), 'ir a', 'buscar pregunta', 'go to'],
      categoria: category,
      tipo: 'ir' as const,
      icono: def?.icon ?? 'pi pi-minus',
      ejecutar: () => { reveal(node) },
    }
  })
}
