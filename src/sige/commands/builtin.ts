import { registerCommandProvider } from './registry'
import { addAndHelpProvider } from './providers/addAndHelp'
import { editorActionsProvider } from './providers/editorActions'
import { gotoQuestionProvider } from './providers/gotoQuestion'
import { selectedSettingsProvider } from './providers/selectedSettings'

/**
 * Proveedores de serie de la lupita. El orden de registro es el orden de la
 * lista sin consulta: ajustes de la pregunta seleccionada, acciones, agregar y ayuda, ir a.
 * Otros módulos amplían con `registerCommandProvider` (ver registry.ts).
 */
let installed = false
export const installBuiltinCommands = (): void => {
  if (installed) return
  installed = true
  registerCommandProvider('sige:selected-settings', selectedSettingsProvider)
  registerCommandProvider('sige:editor-actions', editorActionsProvider)
  registerCommandProvider('sige:add-and-help', addAndHelpProvider)
  registerCommandProvider('sige:goto-question', gotoQuestionProvider)
}
