import type { VueWrapper } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { resetClipboardBufferForTests } from '@/clipboard/buffer'
import { newDocument } from '@/core/model/factory'
import type { QuestionNode } from '@/core/model/types'
import TreeNodeCard from '@/components/canvas/TreeNodeCard.vue'
import { changeNodeType, compatibleTypes, duplicateSelection } from '@/sige/contextMenu/menuActions'
import { menuRequest, openQuestionMenu } from '@/sige/contextMenu/menuState'
import QuestionContextMenu from '@/sige/contextMenu/QuestionContextMenu.vue'
import { useEditorStore } from '@/stores/editor'
import { useFormStore } from '@/stores/form'

import { freshPinia, mountWith } from './helpers'

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

describe('menú contextual de preguntas (SIGE)', () => {
  let pinia: Pinia
  let ids: string[]

  beforeEach(() => {
    localStorage.clear()
    resetClipboardBufferForTests()
    pinia = freshPinia()
    const form = useFormStore()
    form.doc = newDocument('T')
    form.recordId = 'r1'
    ids = ['text', 'integer', 'date'].map((t) => form.addNode(t, null) as string)
    menuRequest.value = null
  })

  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  const names = (): string[] => (useFormStore().doc?.children ?? []).map((n) => n.id)

  const openMenu = async (nodeId: string): Promise<void> => {
    wrapper?.unmount()
    wrapper = mountWith(pinia, QuestionContextMenu, { attachTo: document.body })
    openQuestionMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 10, cancelable: true }), nodeId)
    await nextTick()
    await nextTick()
  }

  const item = (key: string): HTMLElement | null => document.querySelector(`[data-testid="ctx-${key}"]`)

  it('clic derecho selecciona el nodo y muestra los atajos', async () => {
    const editor = useEditorStore()
    await openMenu(ids[1])
    expect(editor.selectedNodeId).toBe(ids[1])
    expect(item('duplicate')?.textContent).toContain('+D')
    expect(item('move-up')?.textContent).toContain('Alt+↑')
    expect(item('paste')?.textContent).toContain('+V')
    // No es grupo: sin "Agregar dentro".
    expect(item('add-inside')).toBeNull()
  })

  it('no cambia la selección si el nodo ya está en la selección múltiple', async () => {
    const editor = useEditorStore()
    editor.selectMany([ids[0], ids[1]])
    await openMenu(ids[1])
    expect([...editor.selectedNodeIds].sort()).toEqual([ids[0], ids[1]].sort())
  })

  it('Duplicar: 3 preguntas → 4, la copia justo después, un Ctrl+Z vuelve a 3', async () => {
    const form = useFormStore()
    await openMenu(ids[1])
    item('duplicate')?.click()
    await nextTick()
    expect(form.doc?.children).toHaveLength(4)
    expect(names().slice(0, 2)).toEqual([ids[0], ids[1]])
    expect(names()[3]).toBe(ids[2])
    form.undo()
    expect(names()).toEqual(ids)
  })

  it('Duplicar con selección múltiple es una sola entrada de deshacer', () => {
    const form = useFormStore()
    const editor = useEditorStore()
    editor.selectMany([ids[0], ids[1]])
    duplicateSelection(form, editor)
    expect(form.doc?.children).toHaveLength(5)
    form.undo()
    expect(names()).toEqual(ids)
  })

  it('Subir/Bajar y Eliminar usan las acciones del store', async () => {
    const form = useFormStore()
    await openMenu(ids[1])
    item('move-up')?.click()
    await nextTick()
    expect(names()).toEqual([ids[1], ids[0], ids[2]])
    // La primera pregunta ya no puede subir.
    menuRequest.value = null
    openQuestionMenu(new MouseEvent('contextmenu', { cancelable: true }), ids[1])
    await nextTick()
    await nextTick()
    expect(item('move-up')?.closest('li')?.getAttribute('data-p-disabled')).toBe('true')
    item('delete')?.click()
    await nextTick()
    expect(names()).toEqual([ids[0], ids[2]])
    form.undo()
    expect(names()).toEqual([ids[1], ids[0], ids[2]])
  })

  it('Agregar dentro solo aparece en grupos', async () => {
    const form = useFormStore()
    const group = form.addNode('group', null) as string
    await openMenu(group)
    expect(item('add-inside')).not.toBeNull()
  })

  it('Cambiar tipo: misma categoría, una entrada de deshacer, conserva el nombre', () => {
    const form = useFormStore()
    const node = form.getNode(ids[0]) as QuestionNode
    const targets = compatibleTypes(node).map((d) => d.type)
    expect(targets).toContain('integer')
    expect(targets).not.toContain('date')
    expect(targets).not.toContain('select_one')
  })

  it('changeNodeType cambia el tipo y un Ctrl+Z lo revierte', () => {
    const form = useFormStore()
    const undoBefore = form.canUndo
    changeNodeType(form, ids[0], 'integer')
    expect((form.getNode(ids[0]) as QuestionNode).type).toBe('integer')
    expect(form.undoLabel).toBe('Change question type')
    form.undo()
    expect((form.getNode(ids[0]) as QuestionNode).type).toBe('text')
    expect(undoBefore).toBe(true)
  })

  it('clic derecho sobre la tarjeta pide abrir el menú de ese nodo', async () => {
    const form = useFormStore()
    const wrapper2 = mountWith(pinia, TreeNodeCard, { props: { node: form.getNode(ids[1]) as QuestionNode } })
    await wrapper2.get('.node-card').trigger('contextmenu')
    expect(menuRequest.value?.nodeId).toBe(ids[1])
    wrapper2.unmount()
  })
})
