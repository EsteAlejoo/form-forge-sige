import { describe, expect, it } from 'vitest'

import type { FormDocument, LocalizedText } from '@/core/model/types'
import { choiceIndexFor, containerIdForPanel, targetForPart } from '@/sige/preview/previewParts'

const t = (s: string): LocalizedText => ({ default: s })

describe('targetForPart (pregunta «Plaga observada», select_one)', () => {
  const q = { kind: 'question' as const, type: 'select_one', hasRequired: false, hasConstraint: false }

  it('etiqueta → Contenido, foco en la etiqueta', () => {
    expect(targetForPart('label', q)).toEqual({ tab: 'content', sectionKey: 'basics', focusTestId: 'prop-label' })
  })
  it('ayuda → Contenido, foco en la ayuda', () => {
    expect(targetForPart('hint', q)?.focusTestId).toBe('prop-hint')
  })
  it('asterisco → Datos y reglas, interruptor de obligatoria', () => {
    expect(targetForPart('required', q)).toEqual({ tab: 'rules', sectionKey: 'rules-basic', focusTestId: 'prop-required' })
  })
  it('opción «Arañita» (posición 0) → Opciones, foco en la opción y pestañeo', () => {
    expect(targetForPart('options', { ...q, choiceIndex: 0 })).toEqual({
      tab: 'rules', sectionKey: 'choices', focusTestId: 'choice-label-0', flash: true,
    })
  })
  it('lista desplegable sin opción concreta → selector de lista', () => {
    expect(targetForPart('options', q)).toMatchObject({ sectionKey: 'choices', focusTestId: 'prop-choice-list', flash: false })
  })
  it('entrada: select_one → preset de valor inicial; texto → idem; geopoint → sin foco', () => {
    expect(targetForPart('input', q)?.focusTestId).toBe('prop-default-preset-select')
    expect(targetForPart('input', { kind: 'question', type: 'geopoint' })).toEqual({ tab: 'rules', sectionKey: 'rules-basic' })
    expect(targetForPart('input', { kind: 'question', type: 'barcode' })?.focusTestId).toBeUndefined()
    expect(targetForPart('input', { kind: 'question', type: 'range' })?.focusTestId).toBe('prop-default')
  })
  it('medios → Contenido (medios)', () => {
    expect(targetForPart('media', q)).toMatchObject({ tab: 'content', focusTestId: 'prop-media-section' })
  })
  it('sin parte reconocible → null (solo selecciona)', () => {
    expect(targetForPart('none', q)).toBeNull()
  })
})

describe('mensaje de error: restricción u obligatoria', () => {
  it('muestra el texto de la restricción → mensaje de restricción', () => {
    const ctx = { kind: 'question' as const, hasRequired: true, hasConstraint: true, constraintMessages: ['Muy corto'], message: 'Muy corto' }
    expect(targetForPart('error', ctx)?.focusTestId).toBe('prop-constraint-message')
  })
  it('texto del motor («This field is required.») con obligatoria → mensaje de obligatoria', () => {
    const ctx = { kind: 'question' as const, hasRequired: true, hasConstraint: true, constraintMessages: ['Muy corto'], message: 'This field is required.' }
    expect(targetForPart('error', ctx)?.focusTestId).toBe('prop-required-message')
  })
  it('solo restricción → mensaje de restricción', () => {
    expect(targetForPart('error', { kind: 'question', hasConstraint: true })?.focusTestId).toBe('prop-constraint-message')
  })
  it('ninguna de las dos → sección Lógica sin foco', () => {
    expect(targetForPart('error', { kind: 'question' })).toEqual({ tab: 'rules', sectionKey: 'logic' })
  })
})

describe('grupos y repeticiones', () => {
  it('encabezado o botón de repetición → ajustes del grupo sin mover el cursor', () => {
    expect(targetForPart('group', { kind: 'group' })).toEqual({ tab: 'content', sectionKey: 'basics' })
    expect(targetForPart('repeat-control', { kind: 'repeat' })).toEqual({ tab: 'content', sectionKey: 'basics' })
    expect(targetForPart('input', { kind: 'group' })).toBeNull()
  })
})

describe('choiceIndexFor', () => {
  const choices = [{ name: 'a', label: t('Arañita') }, { name: 'b', label: t('Trips') }, { name: 'c', label: t('Trips') }]
  it('por texto, aunque la opción dibujada esté en otra posición', () => {
    expect(choiceIndexFor(choices, 'Arañita', 2)).toBe(0)
  })
  it('texto repetido: prefiere la posición dibujada si coincide', () => {
    expect(choiceIndexFor(choices, 'Trips', 2)).toBe(2)
    expect(choiceIndexFor(choices, 'Trips', 0)).toBe(1)
  })
  it('sin coincidencia por texto cae a la posición; fuera de rango → null', () => {
    expect(choiceIndexFor(choices, '', 1)).toBe(1)
    expect(choiceIndexFor(choices, 'x', 9)).toBeNull()
    expect(choiceIndexFor(choices, 'x', undefined)).toBeNull()
  })
})

describe('containerIdForPanel', () => {
  const grp = (id: string, label: string, kind: 'group' | 'repeat', children: unknown[] = []) =>
    ({ id, kind, name: id, label: t(label), bind: {}, body: {}, children })
  const doc = {
    children: [
      grp('g1', 'Ubicación', 'group'),
      grp('g2', 'Plagas', 'group', [grp('g3', 'Detalle', 'group')]),
      grp('r1', 'Visitas', 'repeat'),
    ],
  } as unknown as FormDocument

  it('empareja paneles por título y orden', () => {
    const titles = ['Ubicación', 'Plagas', 'Detalle', 'Visitas']
    expect([0, 1, 2, 3].map((i) => containerIdForPanel(doc, titles, i))).toEqual(['g1', 'g2', 'g3', 'r1'])
  })
  it('varias instancias de una repetición apuntan a la misma repetición', () => {
    const titles = ['Ubicación', 'Visitas', 'Detalle', 'Visitas']
    expect(containerIdForPanel(doc, titles, 3)).toBe('r1')
  })
  it('título desconocido → null', () => {
    expect(containerIdForPanel(doc, ['Otro'], 0)).toBeNull()
  })
})
