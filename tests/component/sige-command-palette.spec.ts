import type { VueWrapper } from '@vue/test-utils'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { resetClipboardBufferForTests } from '@/clipboard/buffer'
import { newDocument } from '@/core/model/factory'
import { i18n } from '@/i18n'
import { setLocale } from '@/i18n/setLocale'
import { exportRequest, paletteOpen, propertyTabRequest } from '@/sige/commands/bridge'
import CommandPalette from '@/sige/commands/CommandPalette.vue'
import { RECENT_KEY, RECENT_MAX, loadRecent, pushRecent } from '@/sige/commands/recent'
import { useEditorStore } from '@/stores/editor'
import { useFormStore } from '@/stores/form'

import { freshPinia, mountWith } from './helpers'

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', name: 'library', component: { render: () => null } }] })

describe('lupita de funciones (SIGE)', () => {
  let pinia: Pinia
  let ids: string[]
  let wrapper: VueWrapper | null = null

  beforeEach(async () => {
    localStorage.clear()
    resetClipboardBufferForTests()
    await setLocale('es')
    pinia = freshPinia()
    const form = useFormStore()
    form.doc = newDocument('T')
    form.recordId = 'r1'
    ids = ['text', 'integer', 'date'].map((t) => form.addNode(t, null) as string)
    form.updateNode(ids[2], 'x', (n) => { n.label = { default: 'Fecha de revisión' } })
    paletteOpen.value = false
    propertyTabRequest.value = null
    exportRequest.value = null
  })

  afterEach(async () => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    await setLocale('en')
    expect(i18n.global.locale.value).toBe('en')
  })

  const open = async (): Promise<void> => {
    wrapper = mountWith(pinia, CommandPalette, { attachTo: document.body, global: { plugins: [router] } })
    paletteOpen.value = true
    await vi.waitUntil(() => document.querySelector('[data-testid="command-palette-input"]') !== null)
  }

  const type = async (text: string): Promise<HTMLInputElement> => {
    const input = document.querySelector<HTMLInputElement>('[data-testid="command-palette-input"]') as HTMLInputElement
    input.value = text
    input.dispatchEvent(new Event('input'))
    await nextTick()
    return input
  }

  const press = async (input: HTMLInputElement, key: string): Promise<void> => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    await nextTick()
    await nextTick()
  }

  const item = (id: string): HTMLElement | null => document.querySelector(`[data-testid="palette-item-${id}"]`)
  const itemIds = (): string[] =>
    [...document.querySelectorAll('[data-testid^="palette-item-"]')].map((e) => (e.getAttribute('data-testid') ?? '').replace('palette-item-', ''))

  it('«obligat» con la pregunta 2 seleccionada → Enter marca obligatoria, abre Datos y reglas y Ctrl+Z lo deshace', async () => {
    const form = useFormStore()
    const editor = useEditorStore()
    editor.select(ids[1])
    await open()
    const input = await type('obligat')
    expect(itemIds()[0]).toBe('set:required')
    expect(item('set:required')?.getAttribute('aria-disabled')).toBe('false')
    expect(item('set:required')?.textContent).toContain('Marcar como obligatoria')

    await press(input, 'Enter')
    await vi.waitUntil(() => form.getNode(ids[1])?.bind.required === 'true()')
    expect(localStorage.getItem('sige.props.tab')).toBe('rules')
    expect(propertyTabRequest.value?.tab).toBe('rules')
    expect(paletteOpen.value).toBe(false)
    expect(loadRecent()[0]).toBe('set:required')

    form.undo()
    expect(form.getNode(ids[1])?.bind.required).toBeUndefined()
  })

  it('sin pregunta seleccionada «obligat» sale deshabilitado con su motivo y Enter no cambia nada', async () => {
    const form = useFormStore()
    await open()
    const input = await type('obligat')
    const el = item('set:required')
    expect(el?.getAttribute('aria-disabled')).toBe('true')
    expect(el?.textContent).toContain('Selecciona una pregunta primero')
    await press(input, 'Enter')
    expect(form.getNode(ids[1])?.bind.required).toBeUndefined()
    expect(paletteOpen.value).toBe(true)
    expect(document.querySelector('[data-testid="command-palette-notice"]')?.textContent).toContain('Selecciona una pregunta primero')
  })

  it('«fecha» encuentra la pregunta «Fecha de revisión» y «Agregar pregunta: Fecha»; Enter en la pregunta la selecciona', async () => {
    const editor = useEditorStore()
    await open()
    const input = await type('fecha')
    const found = itemIds()
    expect(found).toContain(`goto:${ids[2]}`)
    expect(found).toContain('add:date')
    expect(item('add:date')?.textContent).toContain('Agregar pregunta: Fecha')
    expect(found[0]).toBe(`goto:${ids[2]}`) // prefijo del título gana
    await press(input, 'Enter')
    await vi.waitUntil(() => editor.selectedNodeId === ids[2])
    expect(editor.revealNodeId).toBe(ids[2])
  })

  it('agregar pregunta usa la regla de inserción de la selección (después de la seleccionada)', async () => {
    const form = useFormStore()
    const editor = useEditorStore()
    editor.select(ids[0])
    await open()
    const input = await type('agregar pregunta fecha')
    expect(itemIds()[0]).toBe('add:date')
    await press(input, 'Enter')
    await vi.waitUntil(() => (form.doc?.children.length ?? 0) === 4)
    const added = form.doc?.children[1]
    expect(added?.kind === 'question' && added.type).toBe('date')
    expect(editor.selectedNodeId).toBe(added?.id)
  })

  it('pegar sin portapapeles sale deshabilitado con motivo', async () => {
    await open()
    await type('pegar')
    expect(item('act:paste')?.getAttribute('aria-disabled')).toBe('true')
    expect(item('act:paste')?.textContent).toContain('Aún no has copiado nada')
    expect(item('act:paste')?.textContent).toMatch(/\+V/)
  })

  it('exportar pide el formato a ExportMenu', async () => {
    await open()
    const input = await type('excel')
    expect(itemIds()[0]).toBe('act:export-xlsform')
    await press(input, 'Enter')
    await vi.waitUntil(() => exportRequest.value === 'xlsform')
  })

  it('flechas mueven la selección y el último uso sube al tope al abrir de nuevo', async () => {
    await open()
    const input = await type('zoom')
    expect(itemIds().length).toBeGreaterThanOrEqual(3)
    await press(input, 'ArrowDown')
    expect(document.querySelector('[aria-selected="true"]')?.getAttribute('data-testid')).toBe(`palette-item-${itemIds()[1]}`)
    const second = itemIds()[1]
    await press(input, 'Enter')
    await vi.waitUntil(() => loadRecent()[0] === second)
    paletteOpen.value = true
    await vi.waitUntil(() => document.querySelector('[data-testid="command-palette-input"]') !== null)
    await nextTick()
    expect(itemIds()[0]).toBe(second)
  })

  it('modo «@» solo preguntas del formulario; «>» no las muestra', async () => {
    await open()
    await type('@')
    expect(itemIds()).toEqual(ids.map((id) => `goto:${id}`))
    await type('>fecha')
    expect(itemIds().some((id) => id.startsWith('goto:'))).toBe(false)
  })

  it('recientes: guarda 5 en sige.palette.recent, sin repetir', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) pushRecent(id)
    expect(loadRecent()).toEqual(['f', 'e', 'd', 'c', 'b'])
    expect(loadRecent()).toHaveLength(RECENT_MAX)
    pushRecent('c')
    expect(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')).toEqual(['c', 'f', 'e', 'd', 'b'])
    localStorage.setItem(RECENT_KEY, '{no json')
    expect(loadRecent()).toEqual([])
  })
})
