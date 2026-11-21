import { describe, expect, it } from 'vitest'

import { createNode, newChoiceList, newDocument } from '@/core/model/factory'
import { insertNode } from '@/core/model/ops'
import type { ContainerNode, FormDocument, FormNode, QuestionNode } from '@/core/model/types'
import { KOBO_MAX_CHOICES, validateKobo } from '@/sige/lint/rules'

const add = (doc: FormDocument, type: string, name: string, parent: ContainerNode | null = null): FormNode => {
  const node = createNode(doc, type)
  node.name = name
  insertNode(doc, node, parent === null ? null : parent.id)
  return node
}
const codes = (doc: FormDocument): string[] => validateKobo(doc).map((i) => i.code)

describe('kobo.required-without-message / constraint-without-message', () => {
  it('n_hojas required sin mensaje -> 1 aviso; con mensaje -> 0', () => {
    const doc = newDocument('T')
    const q = add(doc, 'integer', 'n_hojas')
    q.bind.required = 'true()'
    expect(codes(doc)).toEqual(['kobo.required-without-message'])
    expect(validateKobo(doc)[0].severity).toBe('warning')
    q.bind.requiredMessage = { default: 'Indique el número de hojas' }
    expect(codes(doc)).toEqual([])
  })

  it('required=false() no avisa', () => {
    const doc = newDocument('T')
    add(doc, 'integer', 'a').bind.required = 'false()'
    expect(codes(doc)).toEqual([])
  })

  it('constraint sin mensaje avisa; con mensaje no', () => {
    const doc = newDocument('T')
    const q = add(doc, 'integer', 'edad')
    q.bind.constraint = '. >= 0'
    expect(codes(doc)).toEqual(['kobo.constraint-without-message'])
    q.bind.constraintMessage = { default: 'Debe ser positivo' }
    expect(codes(doc)).toEqual([])
  })
})

describe('imposibles', () => {
  it('.>5 and .<3 en constraint es imposible', () => {
    const doc = newDocument('T')
    const q = add(doc, 'integer', 'x')
    q.bind.constraintMessage = { default: 'm' }
    q.bind.constraint = '.>5 and .<3'
    expect(codes(doc)).toEqual(['kobo.constraint-impossible'])
  })

  it('rangos posibles, límites inclusivos y or no avisan', () => {
    const doc = newDocument('T')
    const q = add(doc, 'integer', 'x')
    q.bind.constraintMessage = { default: 'm' }
    for (const ok of ['.>=3 and .<=3', '.>3 and .<4', '.>5 or .<3', '. > 0 and . < 10', '.>5 and (.<3 or .>7)', "regex(., '^a and b$')"]) {
      q.bind.constraint = ok
      expect(codes(doc)).toEqual([])
    }
  })

  it('.>3 and .<=3 es imposible; .=5 and .!=5 también', () => {
    const doc = newDocument('T')
    const q = add(doc, 'integer', 'x')
    q.bind.constraintMessage = { default: 'm' }
    q.bind.constraint = '.>3 and .<=3'
    expect(codes(doc)).toEqual(['kobo.constraint-impossible'])
    q.bind.constraint = '.=5 and .!=5'
    expect(codes(doc)).toEqual(['kobo.constraint-impossible'])
  })

  it('relevant ${a}>5 and ${a}<3 es imposible; ${a}>5 and ${b}<3 no', () => {
    const doc = newDocument('T')
    add(doc, 'integer', 'a')
    add(doc, 'integer', 'b')
    const q = add(doc, 'text', 'c')
    q.bind.relevant = '${a}>5 and ${a}<3'
    expect(codes(doc)).toEqual(['kobo.relevant-impossible'])
    q.bind.relevant = '${a}>5 and ${b}<3'
    expect(codes(doc)).toEqual([])
  })

  it("${a}='x' con a select_one sin la opción 'x' es imposible; con 'x' no", () => {
    const doc = newDocument('T')
    newChoiceList(doc, 'si').choices = [{ name: 'si' }, { name: 'no' }]
    const a = add(doc, 'select_one', 'a') as QuestionNode
    a.listRef = 'si'
    const b = add(doc, 'text', 'b')
    b.bind.relevant = "${a}='x'"
    expect(codes(doc)).toEqual(['kobo.relevant-impossible'])
    b.bind.relevant = "${a}='si'"
    expect(codes(doc)).toEqual([])
    b.bind.relevant = "${a}='x' or ${a}='si'"
    expect(codes(doc)).toEqual([])
    b.bind.relevant = "selected(${a}, 'zzz')"
    expect(codes(doc)).toEqual(['kobo.relevant-impossible'])
  })

  it('select con valor por defecto no se analiza (podría salir de la lista)', () => {
    const doc = newDocument('T')
    newChoiceList(doc, 'si').choices = [{ name: 'si' }]
    const a = add(doc, 'select_one', 'a') as QuestionNode
    a.listRef = 'si'
    a.defaultValue = 'x'
    add(doc, 'text', 'b').bind.relevant = "${a}='x'"
    expect(codes(doc)).toEqual([])
  })

  it("${t}='x' and ${t}='y' es imposible para cualquier texto", () => {
    const doc = newDocument('T')
    add(doc, 'text', 't')
    add(doc, 'text', 'b').bind.relevant = "${t}='x' and ${t}='y'"
    expect(codes(doc)).toEqual(['kobo.relevant-impossible'])
  })
})

describe('escalera de abundancia', () => {
  const ladder = (doc: FormDocument, levels: number[], suffix = ''): ContainerNode => {
    const g = add(doc, 'group', 'abundancia') as ContainerNode
    for (const n of levels) add(doc, 'integer', `na${n}${suffix}`, g)
    return g
  }

  it('na0,na1,na3,na4 sin total: falta na2 y falta total', () => {
    const doc = newDocument('T')
    ladder(doc, [0, 1, 3, 4])
    expect(codes(doc)).toEqual(['kobo.ladder-incomplete', 'kobo.ladder-no-total'])
  })

  it('escalera completa con total no avisa', () => {
    const doc = newDocument('T')
    const g = ladder(doc, [0, 1, 2, 3, 4])
    add(doc, 'integer', 'total', g)
    expect(codes(doc)).toEqual([])
  })

  it('sufijo _hoja: total_brote no sirve para _hoja', () => {
    const doc = newDocument('T')
    const g = ladder(doc, [0, 1, 2, 3, 4], '_hoja')
    add(doc, 'integer', 'total_brote', g)
    expect(codes(doc)).toEqual(['kobo.ladder-no-total'])
    add(doc, 'integer', 'total_hoja', g)
    expect(codes(doc)).toEqual([])
  })

  it('un na1 suelto no cuenta como escalera', () => {
    const doc = newDocument('T')
    add(doc, 'integer', 'na1')
    expect(codes(doc)).toEqual([])
  })
})

describe('compatibilidad Kobo', () => {
  it('appearance horizontal avisa; columns no', () => {
    const doc = newDocument('T')
    const q = add(doc, 'select_one', 'q')
    q.body.appearance = 'horizontal-compact'
    expect(codes(doc)).toEqual(['kobo.appearance-horizontal'])
    q.body.appearance = 'columns-2'
    expect(codes(doc)).toEqual([])
  })

  it('repeat dentro de grupo field-list avisa; en grupo normal no', () => {
    const doc = newDocument('T')
    const g = add(doc, 'group', 'g') as ContainerNode
    g.body.appearance = 'field-list'
    add(doc, 'repeat', 'r', g)
    expect(codes(doc)).toEqual(['kobo.repeat-in-field-list'])
    g.body.appearance = undefined
    expect(codes(doc)).toEqual([])
  })

  it('now() en pregunta time avisa; en dateTime no', () => {
    const doc = newDocument('T')
    const t = add(doc, 'time', 'h')
    t.defaultValue = 'now()'
    expect(codes(doc)).toEqual(['kobo.time-now-experimental'])
    const doc2 = newDocument('T')
    add(doc2, 'dateTime', 'h').defaultValue = 'now()'
    expect(codes(doc2)).toEqual([])
  })

  it('lista de más de 3000 opciones avisa; de exactamente 3000 no', () => {
    const doc = newDocument('T')
    const list = newChoiceList(doc, 'grande')
    list.choices = Array.from({ length: KOBO_MAX_CHOICES }, (_, i) => ({ name: `o${i}` }))
    expect(codes(doc)).toEqual([])
    list.choices.push({ name: 'extra' })
    expect(codes(doc)).toEqual(['kobo.list-too-large'])
  })
})

describe('plantillas incluidas', () => {
  it('ninguna plantilla de inicio dispara reglas Kobo (e2e templates exige 0 problemas)', async () => {
    const { bundledTemplates } = await import('@/templates')
    for (const t of bundledTemplates) {
      expect(validateKobo(await t.load()).map((i) => i.code), t.id).toEqual([])
    }
  })
})
