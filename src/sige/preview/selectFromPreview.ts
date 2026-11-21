import { flatten } from '@/core/model/ops'
import type { FormDocument } from '@/core/model/types'
import { getQuestionType } from '@/core/registry/question-types'
import { buildFollowTarget, resolveRenderedIndex, type RenderedQuestion } from '@/preview/followSelection'

/**
 * Camino inverso de «la vista previa sigue a la selección» (aporte SigeApp):
 * dado el índice de la pregunta que el usuario tocó en el celular, devuelve el
 * id del nodo del modelo que le corresponde. Reutiliza la misma alineación
 * (etiqueta/pista + posición) que usa el camino directo, así que se comporta
 * igual con repeticiones y preguntas ocultas.
 */
export const nodeIdAtRenderedIndex = (
  doc: FormDocument,
  rendered: RenderedQuestion[],
  index: number,
): string | null => {
  const renderable = flatten(doc.children).filter((n) =>
    n.kind === 'question' && typeof getQuestionType(n.type)?.xform.bodyElement === 'string')
  for (const node of renderable) {
    const target = buildFollowTarget(doc, node.id)
    if (target === null) continue
    if (resolveRenderedIndex(target.entries, target.targetIndex, rendered) === index) return node.id
  }
  return null
}
