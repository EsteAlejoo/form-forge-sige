import { SUPPORTED_LOCALES, type AppLocale } from '@/i18n'
import { setLocale } from '@/i18n/setLocale'
import { duplicateSelection, moveSelection, siblingPosition } from '@/sige/contextMenu/menuActions'
import { resetPreviewZoom, stepPreviewZoom } from '@/sige/preview/zoom'
import { ACCENTS, THEME_SCHEMES } from '@/theme/constants'
import type { FormDocument } from '@/core/model/types'

import { exportRequest } from '../bridge'
import type { Command, CommandContext } from '../types'

/**
 * Acciones del editor: deshacer, duplicar, mover, portapapeles, vista previa,
 * zoom, tema, exportar, ajustes del formulario, idioma y ayuda. Todas llaman
 * a lo que ya existe (form.*, useSelectionActions, tiendas): nada se duplica.
 */
export const editorActionsProvider = (ctx: CommandContext): Command[] => {
  const { t, mod, form, editor, ui, embed, selection, router } = ctx
  const cat = {
    edit: t('sigePalette.cat.edit'),
    preview: t('sigePalette.cat.preview'),
    appearance: t('sigePalette.cat.appearance'),
    exp: t('sigePalette.cat.export'),
    form: t('sigePalette.cat.form'),
    lang: t('sigePalette.cat.language'),
    help: t('sigePalette.cat.help'),
  }
  const needSelection = (): boolean | string =>
    editor.selectedNodeIds.size > 0 || t('sigePalette.reason.noSelection')
  const needForm = (): boolean | string => form.doc !== null || t('sigePalette.reason.noForm')
  const selectedPos = (): { first: boolean, last: boolean } | null => {
    const id = editor.selectedNodeId
    return id === null || form.doc === null ? null : siblingPosition(form.doc as FormDocument, id)
  }

  const out: Command[] = [
    {
      id: 'act:undo',
      titulo: t('shell.undoRedo.undo'),
      palabrasClave: ['deshacer', 'undo', 'annuler', 'revertir'],
      categoria: cat.edit,
      icono: 'pi pi-undo',
      atajo: `${mod}+Z`,
      habilitado: () => form.canUndo || t('sigePalette.reason.nothingToUndo'),
      ejecutar: () => { form.undo() },
    },
    {
      id: 'act:redo',
      titulo: t('shell.undoRedo.redo'),
      palabrasClave: ['rehacer', 'redo', 'refaire'],
      categoria: cat.edit,
      icono: 'pi pi-refresh',
      atajo: `${mod}+Y`,
      habilitado: () => form.canRedo || t('sigePalette.reason.nothingToRedo'),
      ejecutar: () => { form.redo() },
    },
    {
      id: 'act:duplicate',
      titulo: t('sigeMenu.duplicate'),
      palabrasClave: ['duplicar', 'copiar', 'clonar', 'duplicate', 'clone', 'dupliquer'],
      categoria: cat.edit,
      icono: 'pi pi-clone',
      atajo: `${mod}+D`,
      habilitado: needSelection,
      ejecutar: () => { duplicateSelection(form, editor) },
    },
    {
      id: 'act:delete',
      titulo: t('sigeMenu.delete'),
      palabrasClave: ['eliminar', 'borrar', 'quitar', 'delete', 'remove', 'supprimer'],
      categoria: cat.edit,
      icono: 'pi pi-trash',
      atajo: t('sigeMenu.shortcutDelete'),
      habilitado: () => selection.canDelete.value || t('sigePalette.reason.noSelection'),
      ejecutar: selection.deleteSelection,
    },
    {
      id: 'act:move-up',
      titulo: t('sigeMenu.moveUp'),
      palabrasClave: ['mover', 'subir', 'arriba', 'move up', 'monter'],
      categoria: cat.edit,
      icono: 'pi pi-arrow-up',
      atajo: 'Alt+↑',
      habilitado: () => {
        const pos = selectedPos()
        if (pos === null) return t('sigePalette.reason.noSelection')
        return !pos.first || t('sigePalette.reason.atTop')
      },
      ejecutar: () => { if (editor.selectedNodeId !== null) moveSelection(form, editor, editor.selectedNodeId, -1) },
    },
    {
      id: 'act:move-down',
      titulo: t('sigeMenu.moveDown'),
      palabrasClave: ['mover', 'bajar', 'abajo', 'move down', 'descendre'],
      categoria: cat.edit,
      icono: 'pi pi-arrow-down',
      atajo: 'Alt+↓',
      habilitado: () => {
        const pos = selectedPos()
        if (pos === null) return t('sigePalette.reason.noSelection')
        return !pos.last || t('sigePalette.reason.atBottom')
      },
      ejecutar: () => { if (editor.selectedNodeId !== null) moveSelection(form, editor, editor.selectedNodeId, 1) },
    },
    {
      id: 'act:copy',
      titulo: t('sigeMenu.copy'),
      palabrasClave: ['copiar', 'portapapeles', 'copy', 'clipboard', 'copier'],
      categoria: cat.edit,
      icono: 'pi pi-copy',
      atajo: `${mod}+C`,
      habilitado: () => selection.canCopy.value || t('sigePalette.reason.noSelection'),
      ejecutar: selection.copySelection,
    },
    {
      id: 'act:cut',
      titulo: t('sigeMenu.cut'),
      palabrasClave: ['cortar', 'cut', 'couper'],
      categoria: cat.edit,
      icono: 'pi pi-file-export',
      atajo: `${mod}+X`,
      habilitado: () => selection.canCut.value || t('sigePalette.reason.noSelection'),
      ejecutar: selection.cutSelection,
    },
    {
      id: 'act:paste',
      titulo: t('sigeMenu.paste'),
      palabrasClave: ['pegar', 'paste', 'coller', 'portapapeles'],
      categoria: cat.edit,
      icono: 'pi pi-file-import',
      atajo: `${mod}+V`,
      habilitado: () => selection.canPaste.value || t('sigePalette.reason.noClipboard'),
      ejecutar: selection.pasteClipboard,
    },
    {
      id: 'act:select-all',
      titulo: t('sigePalette.act.selectAll'),
      palabrasClave: ['seleccionar todo', 'select all', 'tout sélectionner'],
      categoria: cat.edit,
      icono: 'pi pi-check-square',
      atajo: `${mod}+A`,
      habilitado: needForm,
      ejecutar: () => { editor.selectMany((form.doc?.children ?? []).map((n) => n.id)) },
    },
    // Vista previa y zoom
    {
      id: 'act:preview-toggle',
      titulo: editor.previewVisible ? t('shell.editor.hidePreview') : t('shell.editor.showPreview'),
      palabrasClave: ['vista previa', 'preview', 'celular', 'telefono', 'aperçu', 'abrir vista previa'],
      categoria: cat.preview,
      icono: 'pi pi-eye',
      ejecutar: () => {
        editor.previewVisible = !editor.previewVisible
        if (editor.previewVisible) editor.activePane = 'preview'
      },
    },
    {
      id: 'act:preview-full',
      titulo: t('preview.toolbar.openFullPage'),
      palabrasClave: ['pantalla completa', 'probar', 'full page', 'preview', 'vista previa'],
      categoria: cat.preview,
      icono: 'pi pi-window-maximize',
      habilitado: () => form.recordId !== null || t('sigePalette.reason.noForm'),
      ejecutar: () => { if (form.recordId !== null) void router.push({ name: 'preview', params: { formId: form.recordId } }) },
    },
    {
      id: 'act:zoom-out',
      titulo: t('sigePalette.act.zoomOut'),
      palabrasClave: ['zoom', 'texto mas pequeno', 'achicar', 'A-', 'smaller', 'plus petit'],
      categoria: cat.preview,
      icono: 'pi pi-search-minus',
      ejecutar: () => { stepPreviewZoom(-1) },
    },
    {
      id: 'act:zoom-in',
      titulo: t('sigePalette.act.zoomIn'),
      palabrasClave: ['zoom', 'texto mas grande', 'agrandar', 'A+', 'bigger', 'plus grand'],
      categoria: cat.preview,
      icono: 'pi pi-search-plus',
      ejecutar: () => { stepPreviewZoom(1) },
    },
    {
      id: 'act:zoom-reset',
      titulo: t('sigePalette.act.zoomReset'),
      palabrasClave: ['zoom', 'restablecer', 'reset', '100'],
      categoria: cat.preview,
      icono: 'pi pi-search',
      ejecutar: resetPreviewZoom,
    },
  ]

  // Tema y color de acento
  for (const scheme of THEME_SCHEMES) {
    const name = t(`appSettings.appearance.scheme.${scheme}`)
    out.push({
      id: `act:theme-${scheme}`,
      titulo: t('sigePalette.act.theme', { name }),
      palabrasClave: ['tema', 'modo', 'oscuro', 'claro', 'dark', 'light', 'theme', 'apariencia', 'noche'],
      categoria: cat.appearance,
      icono: scheme === 'dark' ? 'pi pi-moon' : scheme === 'light' ? 'pi pi-sun' : 'pi pi-desktop',
      habilitado: () => ui.theme !== scheme || t('sigePalette.reason.alreadyActive'),
      ejecutar: () => { ui.theme = scheme },
    })
  }
  for (const accent of ACCENTS) {
    const name = t(`appSettings.appearance.accent.${accent.id}`)
    out.push({
      id: `act:accent-${accent.id}`,
      titulo: t('sigePalette.act.accent', { name }),
      palabrasClave: ['color', 'acento', 'accent', 'couleur', accent.id],
      categoria: cat.appearance,
      icono: 'pi pi-palette',
      habilitado: () => ui.accent !== accent.id || t('sigePalette.reason.alreadyActive'),
      ejecutar: () => { ui.accent = accent.id },
    })
  }

  // Exportar (ExportMenu ejecuta; así se respeta el bloqueo por errores y los formatos ocultos por el anfitrión)
  const exports: Array<{ id: 'xform' | 'xlsform' | 'zip-xform' | 'zip-xlsform', gate: 'xform' | 'xlsform' | 'zip', label: string, kw: string[] }> = [
    { id: 'xform', gate: 'xform', label: t('importExport.export.xformItem'), kw: ['xml', 'xform', 'odk'] },
    { id: 'xlsform', gate: 'xlsform', label: t('importExport.export.xlsformItem'), kw: ['excel', 'xlsx', 'xlsform', 'planilla'] },
    { id: 'zip-xform', gate: 'zip', label: t('importExport.export.zipXformItem'), kw: ['zip', 'paquete', 'bundle', 'xml'] },
    { id: 'zip-xlsform', gate: 'zip', label: t('importExport.export.zipXlsformItem'), kw: ['zip', 'paquete', 'bundle', 'excel', 'xlsx'] },
  ]
  for (const e of exports) {
    out.push({
      id: `act:export-${e.id}`,
      titulo: t('sigePalette.act.export', { name: e.label }),
      palabrasClave: ['exportar', 'descargar', 'guardar como', 'export', 'download', 'exporter', ...e.kw],
      categoria: cat.exp,
      icono: 'pi pi-download',
      habilitado: () => {
        if (form.doc === null) return t('sigePalette.reason.noForm')
        return embed.exportEnabled(e.gate) || t('sigePalette.reason.exportHidden')
      },
      ejecutar: () => { exportRequest.value = e.id },
    })
  }
  if (!embed.active) {
    out.push({
      id: 'act:import',
      titulo: t('sigePalette.act.import'),
      palabrasClave: ['importar', 'abrir archivo', 'subir', 'import', 'upload', 'importer', 'xlsx', 'xml'],
      categoria: cat.exp,
      icono: 'pi pi-upload',
      ejecutar: () => { void router.push({ name: 'library', query: { import: '1' } }) },
    })
  }

  // Formulario
  const dialogs: Array<{ id: string, dialog: 'settings' | 'translations' | 'choice-lists' | 'attachments' | 'insert-template', label: string, icon: string, kw: string[] }> = [
    { id: 'settings', dialog: 'settings', label: t('shell.editor.formSettings'), icon: 'pi pi-cog', kw: ['ajustes del formulario', 'titulo', 'id del formulario', 'version', 'settings', 'paramètres'] },
    { id: 'translations', dialog: 'translations', label: t('shell.editor.translations'), icon: 'pi pi-language', kw: ['traducciones', 'idiomas del formulario', 'translations', 'traductions'] },
    { id: 'choices', dialog: 'choice-lists', label: t('shell.editor.choiceLists'), icon: 'pi pi-list', kw: ['listas de opciones', 'opciones', 'choices', 'listes'] },
    { id: 'attachments', dialog: 'attachments', label: t('shell.editor.attachments'), icon: 'pi pi-paperclip', kw: ['adjuntos', 'archivos', 'imagenes', 'csv', 'attachments', 'pièces jointes'] },
    { id: 'template', dialog: 'insert-template', label: t('shell.editor.insertFromTemplate'), icon: 'pi pi-clone', kw: ['plantilla', 'insertar', 'template', 'modèle'] },
  ]
  for (const d of dialogs) {
    out.push({
      id: `act:dialog-${d.id}`,
      titulo: d.label,
      palabrasClave: d.kw,
      categoria: cat.form,
      icono: d.icon,
      habilitado: needForm,
      ejecutar: () => { editor.activeDialog = d.dialog },
    })
  }

  // Idioma de la aplicación
  for (const code of Object.keys(SUPPORTED_LOCALES) as AppLocale[]) {
    out.push({
      id: `act:locale-${code}`,
      titulo: t('sigePalette.act.language', { name: SUPPORTED_LOCALES[code] }),
      palabrasClave: ['idioma', 'lenguaje', 'language', 'langue', code],
      categoria: cat.lang,
      icono: 'pi pi-globe',
      habilitado: () => ui.locale !== code || t('sigePalette.reason.alreadyActive'),
      ejecutar: async () => { await setLocale(code); ui.locale = code },
    })
  }

  // Ayuda general
  out.push({
    id: 'help:open',
    titulo: t('help.ui.openHelp'),
    palabrasClave: ['ayuda', 'help', 'aide', 'manual', 'documentacion'],
    categoria: cat.help,
    icono: 'pi pi-question-circle',
    tipo: 'ayuda',
    ejecutar: () => { editor.helpTypeId = null; editor.helpGuideId = null; editor.activeDialog = 'help-reference' },
  })
  return out
}
