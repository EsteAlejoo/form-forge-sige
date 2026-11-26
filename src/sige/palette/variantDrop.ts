import { locateNode } from '@/core/model/ops'
import type { FormDocument } from '@/core/model/types'
import { normalizeText, type RenderedQuestion } from '@/preview/followSelection'
import type { useEditorStore } from '@/stores/editor'
import type { useFormStore } from '@/stores/form'

import { applyVariantPreset } from '../applyVariant'
import { nodeIdAtRenderedIndex } from '../preview/selectFromPreview'
import type { Variant } from './variants'

/**
 * Arrastrar una tarjeta de «Elementos» al esquema (lienzo) o a la vista previa (aporte SigeApp).
 * HTML5 nativo, sin dependencias: el esquema ya usa SortableJS, que solo atiende sus propios
 * arrastres, así que no se pisan. Soltar sobre una pregunta la inserta antes o después según la
 * mitad (arriba/abajo) donde cae el cursor; soltar en vacío la agrega al final.
 */
type FormStore = ReturnType<typeof useFormStore>
type EditorStore = ReturnType<typeof useEditorStore>

let dragged: Variant | null = null

export const startVariantDrag = (variant: Variant, event: DragEvent): void => {
  dragged = variant
  if (event.dataTransfer !== null) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', variant.title) // Firefox exige datos para iniciar el arrastre
  }
}

export const endVariantDrag = (): void => {
  dragged = null
  clearMarks()
}

const MARKS = ['sige-drop-before', 'sige-drop-after'] as const
const clearMarks = (): void => {
  document.querySelectorAll('.sige-drop-before, .sige-drop-after').forEach((el) => { el.classList.remove(...MARKS) })
}

interface Hit { el: HTMLElement | null, nodeId: string | null, after: boolean }

const renderedOf = (containers: HTMLElement[]): RenderedQuestion[] => containers.map((el) => ({
  label: normalizeText(el.querySelector('.control-text label')?.textContent ?? ''),
  hint: normalizeText(el.querySelector('.control-text .hint')?.textContent ?? ''),
}))

const halfIsBottom = (el: HTMLElement, clientY: number): boolean => {
  const r = el.getBoundingClientRect()
  return clientY > r.top + r.height / 2
}

/** Qué hay bajo el cursor: una tarjeta del esquema, una pregunta de la vista previa o espacio vacío. */
const locate = (event: DragEvent, form: FormStore): Hit | 'outside' => {
  const target = event.target as Element | null
  if (target === null) return 'outside'
  const card = target.closest<HTMLElement>('.node-card[data-node-id]')
  if (card !== null) return { el: card, nodeId: card.dataset.nodeId ?? null, after: halfIsBottom(card, event.clientY) }
  const mount = target.closest<HTMLElement>('.preview-mount')
  if (mount !== null) {
    const containers = [...mount.querySelectorAll<HTMLElement>('.question-container')]
    const q = target.closest<HTMLElement>('.question-container')
    const index = q === null ? -1 : containers.indexOf(q)
    if (q !== null && index !== -1 && form.doc !== null) {
      const nodeId = nodeIdAtRenderedIndex(form.doc as FormDocument, renderedOf(containers), index)
      if (nodeId !== null) return { el: q, nodeId, after: halfIsBottom(q, event.clientY) }
    }
    return { el: null, nodeId: null, after: true }
  }
  if (target.closest('.canvas-panel') !== null) return { el: null, nodeId: null, after: true }
  return 'outside'
}

const insert = (form: FormStore, editor: EditorStore, variant: Variant, hit: Hit): void => {
  const doc = form.doc as FormDocument | null
  if (doc === null) return
  let parentId: string | null = null
  let index: number | undefined
  if (hit.nodeId !== null) {
    const loc = locateNode(doc, hit.nodeId)
    if (loc === null) return
    parentId = loc.parent?.id ?? null
    index = loc.index + (hit.after ? 1 : 0)
  }
  const id = form.addNode(variant.type, parentId, index)
  if (id === null) return
  applyVariantPreset(form.updateNode, id, variant.preset)
  editor.select(id)
  editor.revealNodeId = id
}

/** Instala los oyentes (una vez, desde el editor). Devuelve la función que los quita. */
export const installVariantDrop = (form: FormStore, editor: EditorStore): (() => void) => {
  const onOver = (event: DragEvent): void => {
    if (dragged === null) return
    const hit = locate(event, form)
    if (hit === 'outside') return
    event.preventDefault()
    if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'copy'
    clearMarks()
    hit.el?.classList.add(hit.after ? 'sige-drop-after' : 'sige-drop-before')
  }
  const onDrop = (event: DragEvent): void => {
    const variant = dragged
    if (variant === null) return
    const hit = locate(event, form)
    if (hit === 'outside') return
    event.preventDefault()
    endVariantDrag()
    insert(form, editor, variant, hit)
  }
  document.addEventListener('dragover', onOver)
  document.addEventListener('drop', onDrop)
  document.addEventListener('dragend', endVariantDrag)
  return () => {
    document.removeEventListener('dragover', onOver)
    document.removeEventListener('drop', onDrop)
    document.removeEventListener('dragend', endVariantDrag)
  }
}
