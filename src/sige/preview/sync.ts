import { computed, ref } from 'vue'

/**
 * Sincronización constructor ↔ vista previa (aporte SigeApp), en los dos sentidos:
 * seleccionar en el constructor desplaza la vista previa a esa pregunta, y tocar la
 * vista previa selecciona/abre el módulo. Un botón en la barra de la vista previa la
 * enciende o apaga. Se recuerda en localStorage `sige.preview.sync`; por defecto, encendida.
 */
export const PREVIEW_SYNC_KEY = 'sige.preview.sync'

const read = (): boolean => {
  try { if (localStorage.getItem(PREVIEW_SYNC_KEY) === 'off') return false } catch { /* sin almacenamiento */ }
  return true
}

const on = ref(read())

export const previewSync = computed(() => on.value)

export const togglePreviewSync = (): void => {
  on.value = !on.value
  try { localStorage.setItem(PREVIEW_SYNC_KEY, on.value ? 'on' : 'off') } catch { /* sin almacenamiento */ }
}
