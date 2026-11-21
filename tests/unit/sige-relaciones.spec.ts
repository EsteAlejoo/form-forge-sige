/**
 * SIGE · Fase 1 de tablas relacionadas. SOLO datos ficticios (repo público).
 *
 * Caso «listo» (regla 6): importo cuarteles_demo.csv (id;nombre;especie;variedad)
 * con name=id, label=nombre → lista con 6 opciones y columnas extra especie y
 * variedad; en una pregunta calculate elijo origen=cuartel, columna=especie →
 * calculate = instance('cuarteles')/root/item[name=${cuartel}]/especie; al elegir
 * el cuartel 2 la expresión devuelve su especie («Cerezo»).
 */
import { describe, expect, it } from 'vitest'

import { addTableAsList, analyzeNameColumn, buildChoiceListFromTable, safeColumnNames, safeListName, slugify, tableFromRows, uniqueSafeNames } from '@/sige/relaciones/importTable'
import { buildLookupExpression, checkLookup, lookupExample, lookupOrigins, parseLookupExpression } from '@/sige/relaciones/lookupExpression'
import { inferColumnType, profileColumns } from '@/sige/relaciones/profileColumns'
import { serializeXForm } from '@/core/xform/serializer'
import { readCsvRows } from '@/core/xlsform/workbook-read'

import { doc, q } from '../helpers/doc-builders'

const CUARTELES_CSV = [
  'id;nombre;especie;variedad',
  '1;Cuartel Norte;Cerezo;Lapins',
  '2;Cuartel Sur;Cerezo;Santina',
  '3;Cuartel Ñandú;Uva de mesa;Thompson',
  '4;Cuartel Este;Uva de mesa;Crimson',
  '5;Cuartel Oeste;Palto;Hass',
  '6;Cuartel Bajo;Palto;Fuerte',
].join('\n')

const cuarteles = () => tableFromRows(readCsvRows(CUARTELES_CSV))

const TRABAJADORES = tableFromRows([
  ['rut', 'nombre', 'cuadrilla', 'ingreso', 'jornal'],
  ['0001', 'Persona Uno', 'A', '2025-03-01', '25000'],
  ['0002', 'Persona Dos', 'A', '2025-03-15', '25000,5'],
  ['0003', 'Persona Tres', 'B', '15/04/2025', '24000'],
  ['0004', 'Persona Tres', 'B', '2025-05-02', ''],
  ['0005', '', 'C', '2025-05-10', '26000'],
  ['', 'Persona Siete', 'C', '2025-06-01', '26000'],
])

describe('tableFromRows / lectura CSV con ;', () => {
  it('lee el CSV de cuarteles demo con punto y coma', () => {
    const t = cuarteles()
    expect(t.columns).toEqual(['id', 'nombre', 'especie', 'variedad'])
    expect(t.rows).toHaveLength(6)
    expect(t.rows[2]).toEqual(['3', 'Cuartel Ñandú', 'Uva de mesa', 'Thompson'])
  })
  it('completa cabeceras vacías/repetidas y descarta filas en blanco y columnas finales vacías', () => {
    const t = tableFromRows([['a', '', 'a', ''], ['1', '2', '3', ''], ['', '', '', ''], ['4', '5', '6', '']])
    expect(t.columns).toEqual(['a', 'columna_2', 'a_2'])
    expect(t.rows).toEqual([['1', '2', '3'], ['4', '5', '6']])
  })
  it('tabla vacía', () => {
    expect(tableFromRows([])).toEqual({ columns: [], rows: [] })
  })
})

describe('profileColumns', () => {
  it('cuarteles: id y nombre son llave; especie no (repetida); tipos', () => {
    const p = profileColumns(cuarteles())
    expect(p.map((c) => [c.name, c.nRows, c.unique, c.empty, c.type, c.keyCandidate])).toEqual([
      ['id', 6, 6, 0, 'entero', true],
      ['nombre', 6, 6, 0, 'texto', true],
      ['especie', 6, 3, 0, 'texto', false],
      ['variedad', 6, 6, 0, 'texto', true],
    ])
  })
  it('trabajadores: vacíos, duplicados, códigos con ceros, fechas mezcladas, decimal con coma', () => {
    const p = Object.fromEntries(profileColumns(TRABAJADORES).map((c) => [c.name, c]))
    expect(p.rut).toMatchObject({ unique: 5, empty: 1, type: 'texto', keyCandidate: false }) // «0001» es código
    expect(p.nombre).toMatchObject({ unique: 4, empty: 1, keyCandidate: false })
    expect(p.cuadrilla).toMatchObject({ unique: 3, empty: 0, keyCandidate: false })
    expect(p.ingreso).toMatchObject({ type: 'fecha', unique: 6, keyCandidate: true }) // ISO y dd/mm/aaaa
    expect(p.jornal).toMatchObject({ type: 'decimal', empty: 1, unique: 4 })
  })
  it('tipos sueltos', () => {
    expect(inferColumnType(['1', '2', '-3'])).toBe('entero')
    expect(inferColumnType(['1', '2,5', '3.25'])).toBe('decimal')
    expect(inferColumnType(['007', '8'])).toBe('texto')
    expect(inferColumnType(['2026-02-30x'])).toBe('texto')
    expect(inferColumnType(['2026-13-01'])).toBe('texto')
    expect(inferColumnType(['', '  '])).toBe('texto')
  })
  it('tabla sin filas: nada es llave', () => {
    const p = profileColumns({ columns: ['a'], rows: [] })
    expect(p[0]).toMatchObject({ nRows: 0, keyCandidate: false })
  })
})

describe('nombres seguros', () => {
  it('slugify quita tildes, espacios y signos', () => {
    expect(slugify('Cuartel Ñandú 2')).toBe('Cuartel_Nandu_2')
    expect(slugify(' Año/plantación ', { lower: true })).toBe('ano_plantacion')
    expect(slugify('###')).toBe('')
  })
  it('uniqueSafeNames: únicos, el primero conserva el nombre, sin chocar con los naturales', () => {
    expect(uniqueSafeNames(['a', 'a', 'a_2', 'a'])).toEqual(['a', 'a_3', 'a_2', 'a_4'])
    expect(uniqueSafeNames(['Ñ b', 'N_b'])).toEqual(['N_b', 'N_b_2'])
  })
  it('vacío: se genera de la etiqueta o fila_N', () => {
    expect(uniqueSafeNames(['', ''], ['Cuartel Sur', ''])).toEqual(['Cuartel_Sur', 'fila_2'])
  })
  it('columnas extra: minúsculas, reservadas con prefijo, únicas', () => {
    expect(safeColumnNames(['Especie', 'Name', 'Año', '2026', 'especie', ''])).toEqual(
      ['especie', 'col_name', 'ano', 'c_2026', 'especie_2', 'columna_6'])
  })
  it('safeListName desde archivo, único', () => {
    expect(safeListName('cuarteles_demo.csv')).toBe('cuarteles_demo')
    expect(safeListName('2026 Plan.xlsx')).toBe('lista_2026_plan')
    expect(safeListName('Cuarteles.csv', { cuarteles: {} })).toBe('cuarteles_2')
  })
})

describe('analyzeNameColumn (avisos de la vista previa)', () => {
  it('cuarteles.id: sin avisos', () => {
    expect(analyzeNameColumn(['1', '2', '3'])).toEqual({ emptyRows: [], duplicates: [], unsafe: 0 })
  })
  it('trabajadores.nombre: un vacío y un duplicado', () => {
    const a = analyzeNameColumn(TRABAJADORES.rows.map((r) => r[1]))
    expect(a.emptyRows).toEqual([5])
    expect(a.duplicates).toEqual([{ value: 'Persona_Tres', rows: [3, 4] }])
    expect(a.unsafe).toBe(5) // todos tienen espacio
  })
  it('detecta duplicados que solo aparecen al limpiar (Ñ b / N_b)', () => {
    expect(analyzeNameColumn(['Ñ b', 'N_b']).duplicates).toEqual([{ value: 'N_b', rows: [1, 2] }])
  })
})

describe('buildChoiceListFromTable', () => {
  it('«listo»: name=id, label=nombre → 6 opciones, extras especie y variedad', () => {
    const { list, report } = buildChoiceListFromTable(cuarteles(), { listName: 'cuarteles', nameColumn: 'id', labelColumn: 'nombre' })
    expect(list.choices).toHaveLength(6)
    expect(list.extraColumnOrder).toEqual(['especie', 'variedad'])
    expect(list.choices[1]).toEqual({
      name: '2',
      label: { default: 'Cuartel Sur' },
      extras: { especie: 'Cerezo', variedad: 'Santina' },
    })
    expect(report).toMatchObject({ rowsRead: 6, rowsKept: 6, generatedNames: 0, changedNames: 0, suffixedNames: 0, size: 'ok' })
    expect(report.extraColumns).toEqual([{ source: 'especie', name: 'especie' }, { source: 'variedad', name: 'variedad' }])
  })
  it('sin columna de etiqueta: la etiqueta es el valor de name', () => {
    const { list } = buildChoiceListFromTable(cuarteles(), { listName: 'c', nameColumn: 'id' })
    expect(list.choices[0].label).toEqual({ default: '1' })
    expect(list.extraColumnOrder).toEqual(['nombre', 'especie', 'variedad'])
  })
  it('trabajadores con vacío y duplicado: nombres únicos y el informe lo cuenta', () => {
    const { list, report } = buildChoiceListFromTable(TRABAJADORES, { listName: 'trabajadores', nameColumn: 'nombre', labelColumn: 'nombre' })
    const names = list.choices.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(['Persona_Uno', 'Persona_Dos', 'Persona_Tres', 'Persona_Tres_2', 'fila_5', 'Persona_Siete'])
    expect(report).toMatchObject({ generatedNames: 1, changedNames: 5, suffixedNames: 1 })
    // La etiqueta conserva el texto original, con tildes y espacios.
    expect(list.choices[2].label).toEqual({ default: 'Persona Tres' })
    expect(list.choices[4].label).toEqual({ default: 'fila_5' })
  })
  it('acentos en datos y en nombres de columna', () => {
    const t = tableFromRows([['Código', 'Año plantación', 'Nombre'], ['A-1', '2019', 'Lote Ñuble']])
    const { list } = buildChoiceListFromTable(t, { listName: 'lotes', nameColumn: 'Código', labelColumn: 'Nombre' })
    expect(list.choices[0]).toEqual({ name: 'A_1', label: { default: 'Lote Ñuble' }, extras: { ano_plantacion: '2019' } })
  })
  it('escribe la etiqueta en el idioma principal indicado', () => {
    const { list } = buildChoiceListFromTable(cuarteles(), { listName: 'c', nameColumn: 'id', labelColumn: 'nombre', lang: 'Español' })
    expect(list.choices[0].label).toEqual({ Español: 'Cuartel Norte' })
  })
  it('filas totalmente vacías no cuentan; avisos de tamaño', () => {
    const rows = Array.from({ length: 501 }, (_, i) => [String(i + 1), `Fila ${i + 1}`])
    const { report } = buildChoiceListFromTable({ columns: ['id', 'n'], rows: [...rows, ['', '']] }, { listName: 'g', nameColumn: 'id', labelColumn: 'n' })
    expect(report).toMatchObject({ rowsRead: 502, rowsKept: 501, size: 'preview-cap' })
    const big = Array.from({ length: 3001 }, (_, i) => [String(i), 'x'])
    expect(buildChoiceListFromTable({ columns: ['id', 'n'], rows: big }, { listName: 'g', nameColumn: 'id' }).report.size).toBe('kobo-advisory')
  })
  it('columna inexistente → error claro', () => {
    expect(() => buildChoiceListFromTable(cuarteles(), { listName: 'c', nameColumn: 'zzz' })).toThrow(/name column/)
    expect(() => buildChoiceListFromTable(cuarteles(), { listName: 'c', nameColumn: 'id', labelColumn: 'zzz' })).toThrow(/label column/)
  })
  it('addTableAsList no pisa una lista existente', () => {
    const d = doc({ title: 'T', formId: 't', children: [], choiceLists: {} })
    addTableAsList(d, cuarteles(), { listName: 'cuarteles', nameColumn: 'id', labelColumn: 'nombre' })
    expect(Object.keys(d.choiceLists)).toEqual(['cuarteles'])
    expect(() => addTableAsList(d, cuarteles(), { listName: 'cuarteles', nameColumn: 'id' })).toThrow(/already exists/)
  })
})

describe('Traer columna (lookupExpression)', () => {
  const build = () => {
    const d = doc({
      title: 'T',
      formId: 't',
      children: [q('select_one', 'cuartel', 'Cuartel', { listRef: 'cuarteles' }), q('calculate', 'especie', undefined)],
    })
    addTableAsList(d, cuarteles(), { listName: 'cuarteles', nameColumn: 'id', labelColumn: 'nombre' })
    return d
  }

  it('construye la expresión exacta del ejemplo «listo»', () => {
    expect(buildLookupExpression('cuarteles', 'cuartel', 'especie'))
      .toBe('instance(\'cuarteles\')/root/item[name=${cuartel}]/especie')
  })
  it('coincide con el patrón de los ejemplos agrícolas (aforo_riego)', () => {
    expect(buildLookupExpression('sectores', 'sector', 'caudal_diseno'))
      .toBe('instance(\'sectores\')/root/item[name=${sector}]/caudal_diseno')
  })
  it('parse es inverso de build, acepta comillas dobles y rechaza lo demás', () => {
    const e = buildLookupExpression('cuarteles', 'cuartel', 'especie')
    expect(parseLookupExpression(e)).toEqual({ listName: 'cuarteles', originField: 'cuartel', column: 'especie' })
    expect(parseLookupExpression('instance("cuarteles")/root/item[name=${cuartel}]/especie')).not.toBeNull()
    expect(parseLookupExpression('instance(\'c\')/root/item[name=${a}]/b + 1')).toBeNull()
    expect(parseLookupExpression('pulldata(\'c\',\'b\',\'k\',${a})')).toBeNull()
    expect(parseLookupExpression(undefined)).toBeNull()
  })
  it('orígenes: solo select_one cuya lista tiene columnas extra', () => {
    const d = build()
    d.children.push(q('select_one', 'sin_extras', 'X', { listRef: 'plana' }))
    d.choiceLists.plana = { name: 'plana', choices: [{ name: 'a' }] }
    d.children.push(q('select_multiple', 'varios', 'V', { listRef: 'cuarteles' }))
    expect(lookupOrigins(d)).toEqual([
      { field: 'cuartel', label: 'cuartel', listName: 'cuarteles', columns: ['especie', 'variedad'] },
    ])
  })
  it('avisos: lista o columna inexistente, origen faltante u otra lista', () => {
    const d = build()
    expect(checkLookup(d, { listName: 'cuarteles', originField: 'cuartel', column: 'especie' })).toEqual([])
    expect(checkLookup(d, { listName: 'cuarteles', originField: 'cuartel', column: 'riego' }).map((p) => p.code)).toEqual(['column-missing'])
    expect(checkLookup(d, { listName: 'otra', originField: 'cuartel', column: 'especie' }).map((p) => p.code)).toEqual(['list-missing', 'origin-other-list'])
    expect(checkLookup(d, { listName: 'cuarteles', originField: 'nada', column: 'especie' }).map((p) => p.code)).toEqual(['origin-missing'])
  })
  it('ejemplo de la primera fila con valor', () => {
    expect(lookupExample(build(), 'cuarteles', 'especie')).toEqual({ name: '1', value: 'Cerezo' })
    expect(lookupExample(build(), 'cuarteles', 'zzz')).toBeNull()
  })

  it('de punta a punta: el XForm trae la lista con sus columnas y el calculate correcto; cuartel 2 → Cerezo', () => {
    const d = build()
    const calc = d.children[1]
    if (calc.kind !== 'question') throw new Error('calc')
    calc.bind.calculation = buildLookupExpression('cuarteles', 'cuartel', 'especie')
    const xml = serializeXForm(d).xml.replace(/>\s+</g, '><')
    expect(xml).toContain('<instance id="cuarteles">')
    expect(xml).toContain('<item><name>2</name><label>Cuartel Sur</label><especie>Cerezo</especie><variedad>Santina</variedad></item>')
    expect(xml).toContain('calculate="instance(\'cuarteles\')/root/item[name=/data/cuartel]/especie"')
    // Evaluación local de la consulta (lo que haría el motor): item cuyo name = 2 → su especie.
    const hit = d.choiceLists.cuarteles.choices.find((c) => c.name === '2')
    expect(hit?.extras?.especie).toBe('Cerezo')
  })
})
