import { describe, expect, it } from 'vitest'

import { detectPreset, hasNoDefaultSupport, inputFor, presetsFor, presetToDefault } from '@/sige/defaultPresets'

const lista = ['si', 'no', 'quiza']

describe('presetsFor', () => {
  it('ofrece presets por tipo', () => {
    expect(presetsFor('date')).toEqual(['none', 'today', 'fixed'])
    expect(presetsFor('datetime')).toEqual(['none', 'now', 'fixed'])
    expect(presetsFor('integer')).toContain('zero')
    expect(presetsFor('select_multiple')).toEqual(['none', 'chosen'])
  })
  it('time solo ofrece hora fija (now() es experimental)', () => {
    expect(presetsFor('time')).toEqual(['none', 'fixed'])
    expect(presetToDefault('time', 'now')).toBeUndefined()
  })
  it('sin presets en geo/medios/acknowledge/note', () => {
    for (const t of ['geopoint', 'image', 'audio', 'acknowledge', 'note']) {
      expect(hasNoDefaultSupport(t)).toBe(true)
    }
    expect(presetsFor('geopoint')).toEqual([])
  })
  it('inputFor', () => {
    expect(inputFor('date', 'fixed')).toBe('date')
    expect(inputFor('select_multiple', 'chosen')).toBe('choices')
    expect(inputFor('date', 'today')).toBeNull()
  })
})

describe('presetToDefault', () => {
  it('fechas y números', () => {
    expect(presetToDefault('date', 'today')).toBe('today()')
    expect(presetToDefault('datetime', 'now')).toBe('now()')
    expect(presetToDefault('date', 'fixed', '2026-11-21')).toBe('2026-11-21')
    expect(presetToDefault('date', 'fixed', '21/11/2026')).toBeUndefined()
    expect(presetToDefault('datetime', 'fixed', '2026-11-21T14:30')).toBe('2026-11-21T14:30:00')
    expect(presetToDefault('time', 'fixed', '08:05')).toBe('08:05:00')
    expect(presetToDefault('integer', 'zero')).toBe('0')
    expect(presetToDefault('integer', 'fixed', '150')).toBe('150')
    expect(presetToDefault('integer', 'fixed', '1.5')).toBeUndefined()
    expect(presetToDefault('decimal', 'fixed', '0.75')).toBe('0.75')
    expect(presetToDefault('text', 'fixed', 'Campo Ficticio')).toBe('Campo Ficticio')
  })
  it('none y presets no ofrecidos limpian', () => {
    expect(presetToDefault('date', 'none')).toBeUndefined()
    expect(presetToDefault('text', 'today')).toBeUndefined()
    expect(presetToDefault('geopoint', 'fixed', 'x')).toBeUndefined()
  })
  it('selects usan el name de la opción', () => {
    expect(presetToDefault('select_one', 'first', '', lista)).toBe('si')
    expect(presetToDefault('select_one', 'first', '', [])).toBeUndefined()
    expect(presetToDefault('select_one', 'chosen', 'no', lista)).toBe('no')
    expect(presetToDefault('select_one', 'chosen', 'otra', lista)).toBeUndefined()
    expect(presetToDefault('select_multiple', 'chosen', ['quiza', 'si'], lista)).toBe('si quiza')
    expect(presetToDefault('select_multiple', 'chosen', [], lista)).toBeUndefined()
  })
})

describe('detectPreset', () => {
  it('reconoce los presets', () => {
    expect(detectPreset('date', undefined).preset).toBe('none')
    expect(detectPreset('date', 'today()').preset).toBe('today')
    expect(detectPreset('datetime', 'now()').preset).toBe('now')
    expect(detectPreset('date', '2026-11-21')).toEqual({ preset: 'fixed', value: '2026-11-21' })
    expect(detectPreset('integer', '0').preset).toBe('zero')
    expect(detectPreset('decimal', '2.5').preset).toBe('fixed')
    expect(detectPreset('select_one', 'si', lista).preset).toBe('first')
    expect(detectPreset('select_one', 'no', lista).preset).toBe('chosen')
    expect(detectPreset('select_multiple', 'si quiza', lista)).toEqual({ preset: 'chosen', value: ['si', 'quiza'] })
  })
  it('lo que no calza es custom y se conserva', () => {
    expect(detectPreset('date', 'today() + 1')).toEqual({ preset: 'custom', value: 'today() + 1' })
    expect(detectPreset('date', 'once(today())').preset).toBe('custom')
    expect(detectPreset('time', 'now()').preset).toBe('custom')
    expect(detectPreset('text', '${otro}').preset).toBe('custom')
    expect(detectPreset('integer', '${n} + 1').preset).toBe('custom')
    expect(detectPreset('select_one', 'borrada', lista).preset).toBe('custom')
    expect(detectPreset('select_multiple', 'si borrada', lista).preset).toBe('custom')
    expect(detectPreset('geopoint', 'algo').preset).toBe('custom')
    expect(detectPreset('date', '21/11/2026').preset).toBe('custom')
  })
  it('ida y vuelta', () => {
    const v = presetToDefault('datetime', 'fixed', '2026-11-21T09:00')
    expect(detectPreset('datetime', v)).toEqual({ preset: 'fixed', value: '2026-11-21T09:00:00' })
  })
})
