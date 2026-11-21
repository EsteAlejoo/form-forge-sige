import { computed, ref } from 'vue'

/**
 * Zoom del texto de la vista previa (aporte SigeApp): botones A− / A+ en la
 * barra de la vista previa. Se recuerda en el navegador. Usa la propiedad CSS
 * `zoom` sobre el formulario dibujado, así el texto y el ancho útil cambian
 * juntos y caben más preguntas en pantalla.
 */
const KEY = 'sige.preview.zoom'
const MIN = 60
const MAX = 140
const STEP = 10
const DEFAULT = 85

const read = (): number => {
  try {
    const v = Number(localStorage.getItem(KEY))
    if (Number.isFinite(v) && v >= MIN && v <= MAX) return v
  } catch { /* sin almacenamiento */ }
  return DEFAULT
}

const percent = ref(read())

export const previewZoomPercent = computed(() => percent.value)
export const previewZoom = computed(() => percent.value / 100)

export const stepPreviewZoom = (direction: 1 | -1): void => {
  percent.value = Math.min(MAX, Math.max(MIN, percent.value + direction * STEP))
  try { localStorage.setItem(KEY, String(percent.value)) } catch { /* sin almacenamiento */ }
}

export const resetPreviewZoom = (): void => {
  percent.value = DEFAULT
  try { localStorage.setItem(KEY, String(DEFAULT)) } catch { /* sin almacenamiento */ }
}
