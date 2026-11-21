import type { Router } from 'vue-router'

import type { SelectionActions } from '@/composables/useSelectionActions'
import type { TypeLabels } from '@/composables/useTypeLabels'
import type { StrictTranslate } from '@/i18n'
import type { useEditorStore } from '@/stores/editor'
import type { useEmbedStore } from '@/stores/embed'
import type { useFormStore } from '@/stores/form'
import type { useUiStore } from '@/stores/ui'

/**
 * Registro de comandos de la «lupita» (aporte SigeApp). Este módulo solo tiene
 * tipos: el registro y el puntaje son funciones puras, sin Vue.
 */

/**
 * Familia del comando. Sirve para los modos del buscador:
 * `>` muestra solo `accion` y `ajuste`; `@` muestra solo `ir` (preguntas del formulario).
 */
export type CommandKind = 'accion' | 'agregar' | 'ir' | 'ayuda' | 'ajuste'

export interface Command {
  /** Único y estable (se guarda en «recientes»). */
  id: string
  /** Texto principal, ya traducido. */
  titulo: string
  /** Sinónimos y palabras que también encuentran el comando (se buscan sin tildes ni mayúsculas). */
  palabrasClave: string[]
  /** Nombre de la categoría, ya traducido (se muestra a la derecha). */
  categoria: string
  /** Por defecto `accion`. */
  tipo?: CommandKind
  /** Clase de PrimeIcons. */
  icono?: string
  /** Atajo de teclado ya formateado, p. ej. `Ctrl+D`. */
  atajo?: string
  /**
   * `true` (o ausente) = disponible. Un texto = deshabilitado y ese texto es el motivo.
   * `false` = deshabilitado sin motivo.
   */
  habilitado?: () => boolean | string
  ejecutar: () => void | Promise<void>
}

/** Todo lo que un proveedor necesita para construir comandos sin duplicar lógica. */
export interface CommandContext {
  t: StrictTranslate
  /** `Ctrl` o `⌘`. */
  mod: string
  form: ReturnType<typeof useFormStore>
  editor: ReturnType<typeof useEditorStore>
  ui: ReturnType<typeof useUiStore>
  embed: ReturnType<typeof useEmbedStore>
  selection: SelectionActions
  labels: TypeLabels
  router: Router
}

/**
 * Un proveedor devuelve los comandos vigentes (se llama cada vez que se abre
 * la lupita, así «Ir a pregunta» y los ajustes siempre reflejan el estado actual).
 */
export type CommandProvider = (ctx: CommandContext) => Command[]
