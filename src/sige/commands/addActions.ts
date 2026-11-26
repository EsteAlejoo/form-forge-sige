import { applyVariantPreset } from '@/sige/applyVariant'
import type { Variant } from '@/sige/palette/variants'

import type { CommandContext } from './types'

/**
 * Agrega una pregunta con la MISMA regla de inserción que la paleta
 * (`selection.insertionTarget`: dentro del grupo abierto, después de la
 * selección, o al final) y la deja seleccionada y a la vista.
 */
export const addTypeAtSelection = (ctx: CommandContext, type: string): string | null => {
  const target = ctx.selection.insertionTarget()
  const id = ctx.form.addNode(type, target.parentId, target.index)
  if (id !== null) {
    ctx.editor.select(id)
    ctx.editor.revealNodeId = id
  }
  return id
}

/** Igual, con el preajuste de una variante de la paleta propia. */
export const addVariantAtSelection = (ctx: CommandContext, variant: Variant): string | null => {
  const id = addTypeAtSelection(ctx, variant.type)
  if (id !== null) applyVariantPreset(ctx.form.updateNode, id, variant.preset)
  return id
}
