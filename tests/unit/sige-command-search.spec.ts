import { beforeEach, describe, expect, it } from 'vitest'

import { clearCommandProviders, collectCommands, providerIds, registerCommandProvider } from '@/sige/commands/registry'
import { commandState, normalize, parseMode, scoreCommand, scoreToken, searchCommands } from '@/sige/commands/search'
import type { Command, CommandContext } from '@/sige/commands/types'

const cmd = (id: string, titulo: string, extra: Partial<Command> = {}): Command => ({
  id, titulo, palabrasClave: [], categoria: 'Edición', ejecutar: () => undefined, ...extra,
})

describe('lupita: normalize y puntaje (puro)', () => {
  it('quita tildes, mayúsculas y signos', () => {
    expect(normalize('  Fecha DE Revisión… ')).toBe('fecha de revision')
    expect(normalize('¿Qué más?')).toBe('que mas')
  })

  it('orden de calidad: igual > prefijo > prefijo de palabra > subcadena > subsecuencia', () => {
    const exact = scoreToken('fecha', 'fecha')
    const prefix = scoreToken('fec', 'fecha de revision')
    const word = scoreToken('rev', 'fecha de revision')
    const sub = scoreToken('echa', 'fecha de revision')
    const seq = scoreToken('oblgtoria', 'marcar como obligatoria')
    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(word)
    expect(word).toBeGreaterThan(sub)
    expect(sub).toBeGreaterThan(seq)
    expect(seq).toBeGreaterThan(0)
  })

  it('subsecuencia: no inventa coincidencias dispersas ni con 1-2 letras', () => {
    expect(scoreToken('xz', 'marcar como obligatoria')).toBe(0)
    expect(scoreToken('oa', 'obligatoria como marcar de verdad esto es largo')).toBe(0) // 2 letras: solo prefijo/subcadena
    expect(scoreToken('mcr', 'marcar como obligatoria')).toBeGreaterThan(0)
    expect(scoreToken('zzz', 'marcar')).toBe(0)
  })

  it('«obligat» encuentra «Marcar como obligatoria» aunque lleve tilde o mayúsculas', () => {
    const c = cmd('set:required', 'Marcar como obligatoria', { palabrasClave: ['requerida'] })
    expect(scoreCommand(c, 'OBLIGAT')).toBeGreaterThan(0)
    expect(scoreCommand(c, 'oblígat')).toBeGreaterThan(0)
    expect(scoreCommand(c, 'requerid')).toBeGreaterThan(0) // palabra clave
    expect(scoreCommand(c, 'fecha')).toBe(0)
  })

  it('varias palabras: todas deben coincidir', () => {
    const c = cmd('a', 'Agregar pregunta: Fecha')
    expect(scoreCommand(c, 'agre fecha')).toBeGreaterThan(0)
    expect(scoreCommand(c, 'agre numero')).toBe(0)
  })
})

describe('lupita: searchCommands', () => {
  const cmds = [
    cmd('goto:1', 'Fecha de revisión', { tipo: 'ir', categoria: 'Ir a la pregunta' }),
    cmd('add:date', 'Agregar pregunta: Fecha', { tipo: 'agregar', categoria: 'Agregar pregunta' }),
    cmd('add:text', 'Agregar pregunta: Texto', { tipo: 'agregar', categoria: 'Agregar pregunta' }),
    cmd('act:undo', 'Deshacer', { palabrasClave: ['undo'] }),
    cmd('set:required', 'Marcar como obligatoria', { tipo: 'ajuste', habilitado: () => 'Selecciona una pregunta primero' }),
  ]

  it('«fecha»: aparece la pregunta del formulario y «Agregar pregunta: Fecha»', () => {
    const ids = searchCommands(cmds, 'fecha').map((r) => r.command.id)
    expect(ids).toEqual(['goto:1', 'add:date'])
  })

  it('deshabilitado: se muestra con su motivo y no se oculta', () => {
    const [r] = searchCommands(cmds, 'obligat')
    expect(r.command.id).toBe('set:required')
    expect(r.state).toEqual({ enabled: false, reason: 'Selecciona una pregunta primero' })
  })

  it('sin consulta: recientes primero, luego orden de registro', () => {
    const ids = searchCommands(cmds, '', { recent: ['act:undo', 'add:text'] }).map((r) => r.command.id)
    expect(ids).toEqual(['act:undo', 'add:text', 'goto:1', 'add:date', 'set:required'])
  })

  it('con consulta: el reciente sube entre aciertos de la misma calidad', () => {
    const ids = searchCommands(cmds, 'agregar', { recent: ['add:text'] }).map((r) => r.command.id)
    expect(ids[0]).toBe('add:text')
  })

  it('modo «>» solo acciones y ajustes, «@» solo preguntas del formulario', () => {
    expect(parseMode('>des')).toEqual({ query: 'des', kinds: new Set(['accion', 'ajuste']) })
    expect(searchCommands(cmds, '>').map((r) => r.command.id)).toEqual(['act:undo', 'set:required'])
    expect(searchCommands(cmds, '@fecha').map((r) => r.command.id)).toEqual(['goto:1'])
    expect(searchCommands(cmds, 'fecha').length).toBe(2)
  })

  it('respeta el límite y ejecuta habilitado() una vez por comando', () => {
    let calls = 0
    const many = Array.from({ length: 80 }, (_, i) => cmd(`c${i}`, `Comando ${i}`, { habilitado: () => { calls++; return true } }))
    expect(searchCommands(many, '', { limit: 10 })).toHaveLength(10)
    expect(calls).toBe(80)
  })

  it('commandState: true, texto, false y excepción', () => {
    expect(commandState(cmd('a', 'a'))).toEqual({ enabled: true })
    expect(commandState(cmd('a', 'a', { habilitado: () => false }))).toEqual({ enabled: false })
    expect(commandState(cmd('a', 'a', { habilitado: () => { throw new Error('x') } }))).toEqual({ enabled: false })
  })
})

describe('lupita: registro', () => {
  beforeEach(() => { clearCommandProviders() })
  const ctx = {} as CommandContext

  it('junta proveedores, ignora ids repetidos y proveedores que fallan, y se puede desregistrar', () => {
    registerCommandProvider('a', () => [cmd('x', 'Uno'), cmd('y', 'Dos')])
    registerCommandProvider('b', () => [cmd('x', 'Repetido'), cmd('z', 'Tres')])
    registerCommandProvider('rota', () => { throw new Error('boom') })
    const off = registerCommandProvider('c', () => [cmd('w', 'Cuatro')])
    expect(collectCommands(ctx).map((c) => c.titulo)).toEqual(['Uno', 'Dos', 'Tres', 'Cuatro'])
    off()
    expect(providerIds()).toEqual(['a', 'b', 'rota'])
  })
})
