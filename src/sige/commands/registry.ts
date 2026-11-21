import type { Command, CommandContext, CommandProvider } from './types'

/**
 * Registro de proveedores de comandos. Cualquier módulo puede ampliar la
 * lupita con `registerCommandProvider('mi-modulo', (ctx) => [...])`; el
 * buscador no sabe de dónde viene cada comando. Puro: sin Vue ni tiendas.
 */
const providers = new Map<string, CommandProvider>()

/** Registra (o reemplaza) un proveedor. Devuelve la función que lo quita. */
export const registerCommandProvider = (id: string, provider: CommandProvider): (() => void) => {
  providers.set(id, provider)
  return () => { if (providers.get(id) === provider) providers.delete(id) }
}

export const providerIds = (): string[] => [...providers.keys()]

/** Quita todos los proveedores (solo para pruebas). */
export const clearCommandProviders = (): void => { providers.clear() }

/**
 * Junta los comandos de todos los proveedores, en orden de registro. Si dos
 * comandos repiten `id` gana el primero; un proveedor que falla se omite
 * (una lupita rota no debe dejar sin editor).
 */
export const collectCommands = (ctx: CommandContext): Command[] => {
  const seen = new Set<string>()
  const out: Command[] = []
  for (const provider of providers.values()) {
    let list: Command[]
    try { list = provider(ctx) } catch { continue }
    for (const command of list) {
      if (seen.has(command.id)) continue
      seen.add(command.id)
      out.push(command)
    }
  }
  return out
}
