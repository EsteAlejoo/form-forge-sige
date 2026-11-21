import { nextTick, ref } from 'vue'

import type { useEditorStore } from '@/stores/editor'
import type { ExportFormatId, useUiStore } from '@/stores/ui'

/**
 * Puentes entre la lupita y los componentes originales que ya hacen el trabajo
 * (así no se duplica lógica ni se mueven estados privados). Cada puente es un
 * `ref` que el componente dueño observa con un gancho mínimo marcado «SIGE».
 */

/** La lupita está abierta (la abre el botón de la cabecera y Ctrl+K). */
export const paletteOpen = ref(false)
export const openPalette = (): void => { paletteOpen.value = true }
export const togglePalette = (): void => { paletteOpen.value = !paletteOpen.value }

/** Pide a ExportMenu que exporte en ese formato (reusa sus funciones y su bloqueo por errores). */
export const exportRequest = ref<ExportFormatId | null>(null)

export type PropertyTab = 'content' | 'rules' | 'adv'
export const PROPERTY_TAB_KEY = 'sige.props.tab'

/** `n` crece en cada pedido, para que repetir el mismo pestaña también se note. */
export const propertyTabRequest = ref<{ tab: PropertyTab, n: number } | null>(null)

/**
 * Abre el panel de Ajustes de la pregunta seleccionada en la pestaña dada,
 * despliega la sección y (si puede) deja el cursor en el campo. Guarda la
 * pestaña en el mismo lugar que PropertyPanel, así también funciona si el
 * panel se monta después (vista de tableta).
 */
export const showQuestionSettings = (
  editor: ReturnType<typeof useEditorStore>,
  ui: ReturnType<typeof useUiStore>,
  tab: PropertyTab,
  opts: { sectionKey?: string, focusTestId?: string } = {}
): void => {
  try { localStorage.setItem(PROPERTY_TAB_KEY, tab) } catch { /* sin almacenamiento */ }
  if (opts.sectionKey !== undefined && ui.propSectionsCollapsed[opts.sectionKey] === true) {
    ui.propSectionsCollapsed = { ...ui.propSectionsCollapsed, [opts.sectionKey]: false }
  }
  editor.activePane = 'properties'
  propertyTabRequest.value = { tab, n: (propertyTabRequest.value?.n ?? 0) + 1 }
  const testId = opts.focusTestId
  if (testId === undefined) return
  void nextTick(() => {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
      const target = el?.matches('input,textarea,select,button') === true
        ? el
        : el?.querySelector<HTMLElement>('input,textarea,select,button') ?? null
      el?.scrollIntoView?.({ block: 'nearest' })
      target?.focus()
    }, 60)
  })
}
