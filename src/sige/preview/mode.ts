import { computed, ref } from 'vue'

/**
 * Modo del celular (aporte SigeApp): «Editar al tocar» (tocar una parte lleva al módulo que corresponde)
 * o «Probar» (el celular se comporta como un formulario normal y no cambia nada del editor).
 * Se recuerda en localStorage `sige.preview.mode`; por defecto, editar.
 */
export type PreviewMode = 'edit' | 'test'
export const PREVIEW_MODE_KEY = 'sige.preview.mode'

const read = (): PreviewMode => {
  try { if (localStorage.getItem(PREVIEW_MODE_KEY) === 'test') return 'test' } catch { /* sin almacenamiento */ }
  return 'edit'
}

const mode = ref<PreviewMode>(read())

export const previewMode = computed(() => mode.value)

export const setPreviewMode = (m: PreviewMode): void => {
  mode.value = m
  try { localStorage.setItem(PREVIEW_MODE_KEY, m) } catch { /* sin almacenamiento */ }
}
