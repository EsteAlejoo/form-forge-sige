import { findNode, locateNode, topMostNodes } from '@/core/model/ops'
import { ref } from 'vue'

import type { FormDocument, FormNode, QuestionNode } from '@/core/model/types'
import { getAllQuestionTypes, getQuestionType, type QuestionTypeDefinition } from '@/core/registry/question-types'
import { translate } from '@/i18n'
import type { useEditorStore } from '@/stores/editor'
import type { useFormStore } from '@/stores/form'

type FormStore = ReturnType<typeof useFormStore>
type EditorStore = ReturnType<typeof useEditorStore>

/** Selecciona el nodo tocado salvo que ya sea parte de la selección múltiple. */
export const selectForMenu = (editor: EditorStore, nodeId: string): void => {
  if (!editor.selectedNodeIds.has(nodeId)) editor.select(nodeId)
}

const reveal = (editor: EditorStore, ids: string[]): void => {
  if (ids.length === 0) return
  editor.selectMany(ids)
  editor.revealNodeId = ids[0]
}

/**
 * Duplicar la selección. Una pregunta: acción existente `duplicateNodeById`.
 * Varias: copia + pega justo después de la última (una sola entrada de deshacer,
 * sin tocar el portapapeles).
 */
export const duplicateSelection = (form: FormStore, editor: EditorStore): void => {
  const doc = form.doc as FormDocument | null
  if (doc === null || editor.selectedNodeIds.size === 0) return
  const tops = topMostNodes(doc, editor.selectedNodeIds)
  if (tops.length === 0) return
  if (tops.length === 1) {
    const id = form.duplicateNodeById(tops[0].id)
    if (id !== null) reveal(editor, [id])
    return
  }
  const payload = form.copyNodes(tops.map((n) => n.id))
  const last = locateNode(doc, tops[tops.length - 1].id)
  if (payload === null || last === null) return
  const result = form.pasteNodes(payload, { parentId: last.parent?.id ?? null, index: last.index + 1 })
  if (result !== null) reveal(editor, result.insertedIds)
}

/** Subir (-1) / Bajar (+1): misma lógica que las flechas Alt de TreeNodeCard. */
export const moveSelection = (form: FormStore, editor: EditorStore, nodeId: string, delta: -1 | 1): void => {
  if (editor.selectedNodeIds.size > 1 && editor.selectedNodeIds.has(nodeId)) {
    form.moveSelectionBy(editor.selectedNodeIds, delta)
  } else {
    form.moveBy(nodeId, delta)
  }
}

/** Posición del nodo entre sus hermanos (para desactivar Subir/Bajar en los extremos). */
export const siblingPosition = (doc: FormDocument, nodeId: string): { first: boolean, last: boolean } => {
  const loc = locateNode(doc, nodeId)
  if (loc === null) return { first: true, last: true }
  const siblings = loc.parent === null ? doc.children : loc.parent.children
  return { first: loc.index === 0, last: loc.index === siblings.length - 1 }
}

/** Tipos agregables desde el menú (los de metadatos se omiten, como en la paleta de uso común). */
export const addableTypes = (): QuestionTypeDefinition[] =>
  getAllQuestionTypes().filter((d) => d.category !== 'meta')

/** Agrega una pregunta del tipo dado antes/después de `nodeId`, o dentro (al final) si `where` es 'inside'. */
export const addRelative = (
  form: FormStore,
  editor: EditorStore,
  nodeId: string,
  where: 'before' | 'after' | 'inside',
  type: string
): void => {
  const doc = form.doc as FormDocument | null
  if (doc === null) return
  let id: string | null = null
  if (where === 'inside') {
    id = form.addNode(type, nodeId)
  } else {
    const loc = locateNode(doc, nodeId)
    if (loc === null) return
    id = form.addNode(type, loc.parent?.id ?? null, where === 'before' ? loc.index : loc.index + 1)
  }
  if (id !== null) {
    editor.select(id)
    editor.revealNodeId = id
  }
}

/**
 * Tipos a los que se puede cambiar una pregunta sin perder datos de forma
 * silenciosa: misma categoría, mismo requisito de lista de opciones, sin
 * archivo adjunto ni contenedores.
 */
export const compatibleTypes = (node: QuestionNode): QuestionTypeDefinition[] => {
  const current = getQuestionType(node.type)
  if (current === undefined || current.isContainer === true || current.requiresFile === true) return []
  return getAllQuestionTypes().filter((d) =>
    d.type !== node.type &&
    d.category === current.category &&
    d.category !== 'meta' &&
    d.isContainer !== true &&
    d.requiresFile !== true &&
    (d.requiresChoices === true) === (current.requiresChoices === true) &&
    typeof d.xform.bodyElement === 'string')
}

/**
 * Copiar / pegar estilo (idea de Elementor «Copy/Paste Style»): lo que se copia es la
 * apariencia (`body.appearance`, p. ej. columns-pack, minimal, multiline). Al pegar, cada
 * destino conserva solo las partes que su tipo admite (como al cambiar de tipo); un
 * contenedor solo recibe el estilo de otro contenedor. Una sola entrada de deshacer.
 */
export interface CopiedStyle { kind: FormNode['kind'], appearance: string }
export const copiedStyle = ref<CopiedStyle | null>(null)

export const copyStyle = (form: FormStore, nodeId: string): void => {
  const node = form.getNode(nodeId)
  if (node === null) return
  copiedStyle.value = { kind: node.kind, appearance: node.body.appearance ?? '' }
}

const adaptAppearance = (target: FormNode, src: CopiedStyle): string | undefined | null => {
  if (target.kind !== src.kind && (target.kind !== 'question' || src.kind !== 'question')) {
    // contenedor ↔ pregunta: el estilo no es transferible
    if (target.kind === 'question' || src.kind === 'question') return null
  }
  const tokens = src.appearance.split(/\s+/).filter((tok) => tok !== '')
  if (target.kind !== 'question') return tokens.length > 0 ? tokens.join(' ') : undefined
  const names = (getQuestionType(target.type)?.appearances ?? []).map((a) => a.name)
  const kept = tokens.filter((tok) => names.some((n) => tok.startsWith(n)))
  return kept.length > 0 ? kept.join(' ') : undefined
}

/** ¿Hay estilo copiado que se pueda pegar en algún nodo de la selección? */
export const canPasteStyle = (form: FormStore, editor: EditorStore): boolean => {
  const src = copiedStyle.value
  if (src === null) return false
  return [...editor.selectedNodeIds].some((id) => {
    const n = form.getNode(id)
    return n !== null && adaptAppearance(n, src) !== null
  })
}

export const pasteStyle = (form: FormStore, editor: EditorStore): void => {
  const src = copiedStyle.value
  if (src === null || editor.selectedNodeIds.size === 0) return
  const ids = [...editor.selectedNodeIds]
  form.mutate(translate('sigeMenu.undoPasteStyle'), (d) => {
    for (const id of ids) {
      const node = findNode(d, id)
      if (node === null) continue
      const next = adaptAppearance(node, src)
      if (next === null) continue
      node.body.appearance = next
    }
  })
}

/** Cambia el tipo en una sola entrada de deshacer; limpia apariencia/parámetros que el tipo nuevo no admite. */
export const changeNodeType = (form: FormStore, nodeId: string, type: string): void => {
  const target = getQuestionType(type)
  if (target === undefined) return
  form.mutate(translate('sigeMenu.undoChangeType'), (d) => {
    const node = findNode(d, nodeId)
    if (node === null || node.kind !== 'question') return
    node.type = type
    if (node.body.appearance !== undefined) {
      const names = (target.appearances ?? []).map((a) => a.name)
      const kept = node.body.appearance.split(/\s+/).filter((tok) => tok !== '' && names.some((n) => tok.startsWith(n)))
      node.body.appearance = kept.length > 0 ? kept.join(' ') : undefined
    }
    if (node.body.parameters !== undefined) {
      const allowed = new Set((target.parameters ?? []).map((p) => p.name))
      const kept = Object.fromEntries(Object.entries(node.body.parameters).filter(([k]) => allowed.has(k)))
      node.body.parameters = Object.keys(kept).length > 0 ? kept : undefined
    }
  })
}
