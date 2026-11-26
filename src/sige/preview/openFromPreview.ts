// SIGE: «tocar en el celular → ir al módulo correcto». Une el detector de partes (DOM), la lógica pura
// (parte → pestaña/campo) y el puente de Ajustes que ya usa la lupa (Ctrl+K). No escribe en el modelo:
// un clic nunca crea entradas de deshacer.
import type { RenderedQuestion } from '@/preview/followSelection'
import type { useEditorStore } from '@/stores/editor'
import type { useFormStore } from '@/stores/form'
import type { useUiStore } from '@/stores/ui'

import { showQuestionSettings } from '../commands/bridge'
import type { PartHit } from './detectPart'
import { previewMode } from './mode'
import { previewSync } from './sync'
import { choiceIndexFor, containerIdForPanel, targetForPart, type PartContext } from './previewParts'
import { nodeIdAtRenderedIndex } from './selectFromPreview'

const norm = (s: string): string => s.replace(/[*_~]/g, '').replace(/\s+/g, ' ').trim()

export const handlePreviewClick = (
  index: number | null,
  rendered: RenderedQuestion[],
  hit: PartHit | null,
  stores: { form: ReturnType<typeof useFormStore>, editor: ReturnType<typeof useEditorStore>, ui: ReturnType<typeof useUiStore> },
): void => {
  const { form, editor, ui } = stores
  // «Probar»: el celular funciona como un formulario normal, no se toca el editor.
  if (previewMode.value === 'test' || !previewSync.value || form.doc === null) return
  const id = index !== null
    ? nodeIdAtRenderedIndex(form.doc, rendered, index)
    : hit?.panel != null ? containerIdForPanel(form.doc, hit.panel.titles, hit.panel.ordinal) : null
  if (id === null) return
  editor.select(id)
  editor.revealNodeId = id

  const node = form.getNode(id)
  if (hit === null || node === null || hit.part === 'none') return
  const ctx: PartContext = {
    kind: node.kind,
    type: node.kind === 'question' ? node.type : undefined,
    hasRequired: (node.bind.required ?? '').trim() !== '',
    hasConstraint: (node.bind.constraint ?? '').trim() !== '',
    constraintMessages: Object.values(node.bind.constraintMessage ?? {})
      .filter((v): v is string => typeof v === 'string').map(norm),
    message: hit.message,
  }
  if (hit.part === 'options' && node.kind === 'question' && node.listRef !== undefined) {
    const list = form.doc.choiceLists[node.listRef]
    if (list !== undefined && hit.optionIndex !== undefined) {
      ctx.choiceIndex = choiceIndexFor(list.choices, hit.optionLabel ?? '', hit.optionIndex)
    }
  }
  const target = targetForPart(hit.part, ctx)
  if (target === null) return
  showQuestionSettings(editor, ui, target.tab, {
    sectionKey: target.sectionKey,
    focusTestId: target.focusTestId,
    flash: target.flash,
  })
}
