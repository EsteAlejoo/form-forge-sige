import type { VueWrapper } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import TreeNodeCard from '@/components/canvas/TreeNodeCard.vue'
import { newDocument } from '@/core/model/factory'
import { addLanguage } from '@/core/model/translations'
import type { QuestionNode } from '@/core/model/types'
import { commitInline, normalizeDraft, writeLang } from '@/sige/inlineEdit/inlineEdit'
import { useEditorStore } from '@/stores/editor'
import { useFormStore } from '@/stores/form'

import { freshPinia, mountWith } from './helpers'

describe('edición en línea: lógica pura', () => {
  it('writeLang nunca devuelve default si hay idiomas', () => {
    expect(writeLang([], 'default')).toBe('default')
    expect(writeLang(['Español (es)'], 'default')).toBe('Español (es)')
    expect(writeLang(['Español (es)', 'English (en)'], 'English (en)')).toBe('English (en)')
  })

  it('normaliza y detecta "sin cambios"', () => {
    expect(normalizeDraft('  Hola \r\n')).toBe('Hola')
    expect(commitInline({ default: 'Cuartel' }, ' Cuartel ', 'default')).toBeNull()
    expect(commitInline({ default: 'Cuartel' }, 'Cuartel del monitoreo', 'default')?.next)
      .toEqual({ default: 'Cuartel del monitoreo' })
    expect(commitInline({ default: 'Cuartel' }, '   ', 'default')?.next).toBeUndefined()
  })
})

describe('edición en línea sobre el lienzo (SIGE)', () => {
  let pinia: Pinia
  let id: string
  let wrapper: VueWrapper | null = null

  const mountCard = (): VueWrapper => {
    const form = useFormStore()
    wrapper = mountWith(pinia, TreeNodeCard, {
      props: { node: form.getNode(id) as QuestionNode },
      attachTo: document.body,
    })
    return wrapper
  }
  /** Profundidad de deshacer (el store no la expone): deshace todo y rehace. */
  const depth = (): number => {
    const form = useFormStore()
    let n = 0
    while (form.canUndo) { form.undo(); n++ }
    for (let i = 0; i < n; i++) form.redo()
    return n
  }
  const label = (): string => (useFormStore().getNode(id) as QuestionNode).label?.default ?? ''
  const typeIn = async (w: VueWrapper, text: string): Promise<HTMLTextAreaElement> => {
    const ta = w.get('[data-testid="inline-edit"]')
    ;(ta.element as HTMLTextAreaElement).value = text
    await ta.trigger('input')
    return ta.element as HTMLTextAreaElement
  }

  beforeEach(() => {
    pinia = freshPinia()
    const form = useFormStore()
    form.doc = newDocument('T')
    form.recordId = 'r1'
    id = form.addNode('text', null) as string
    form.mutate('set', (d) => { (d.children[0] as QuestionNode).label = { default: 'Cuartel' } })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('doble clic + Enter cambia la etiqueta; un deshacer la devuelve', async () => {
    const form = useFormStore()
    const w = mountCard()
    await w.get('.node-label').trigger('dblclick')
    await typeIn(w, 'Cuartel del monitoreo')
    const before = depth()
    await w.get('[data-testid="inline-edit"]').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(label()).toBe('Cuartel del monitoreo')
    expect(depth()).toBe(before + 1)
    expect(w.find('[data-testid="inline-edit"]').exists()).toBe(false)
    form.undo()
    expect(label()).toBe('Cuartel')
  })

  it('Esc a mitad no cambia nada ni agrega deshacer', async () => {
    const w = mountCard()
    await w.get('.node-label').trigger('dblclick')
    await typeIn(w, 'otra cosa')
    const before = depth()
    await w.get('[data-testid="inline-edit"]').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(label()).toBe('Cuartel')
    expect(depth()).toBe(before)
    expect(w.find('[data-testid="inline-edit"]').exists()).toBe(false)
  })

  it('perder el foco confirma; sin cambios no crea entrada', async () => {
    const w = mountCard()
    await w.get('.node-label').trigger('dblclick')
    await w.get('[data-testid="inline-edit"]').trigger('blur')
    expect(depth()).toBe(2) // addNode + preparar etiqueta; la edición sin cambios no suma
    await w.get('.node-label').trigger('dblclick')
    await typeIn(w, 'Nuevo')
    await w.get('[data-testid="inline-edit"]').trigger('blur')
    expect(label()).toBe('Nuevo')
  })

  it('F2 sobre la tarjeta abre el editor; Supr dentro del texto no borra la pregunta', async () => {
    const form = useFormStore()
    const w = mountCard()
    await w.get('.node-card').trigger('keydown', { key: 'F2' })
    expect(w.find('[data-testid="inline-edit"]').exists()).toBe(true)
    await w.get('[data-testid="inline-edit"]').trigger('keydown', { key: 'Delete' })
    expect(form.getNode(id)).not.toBeNull()
  })

  it('con idiomas escribe en el idioma de edición y jamás en default', async () => {
    const form = useFormStore()
    form.mutate('lang', (d) => { addLanguage(d, 'Español (es)') })
    useEditorStore().displayLanguage = null
    const w = mountCard()
    await w.get('.node-label').trigger('dblclick')
    await typeIn(w, 'Cuartel 2')
    await w.get('[data-testid="inline-edit"]').trigger('keydown', { key: 'Enter' })
    const node = form.getNode(id) as QuestionNode
    expect(node.label?.['Español (es)']).toBe('Cuartel 2')
    expect(node.label?.default).toBeUndefined()
  })
})
