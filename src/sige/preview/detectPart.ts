// SIGE: detector de «parte tocada» en el DOM que dibuja @getodk/web-forms (sin Vue).
//
// Cómo se identifica cada parte (inspeccionado en el DOM real, web-forms 1.0.0, 2026-11-21):
//   pregunta   .question-container                         (ya lo usaba la vista previa)
//   etiqueta   .control-text > label                       (con asterisco: label.required)
//   asterisco  label.required::before "*" — es un pseudo-elemento: el clic cae en el <label>, así que se
//              distingue por posición: clientX a la izquierda del inicio del texto del label.
//   ayuda      .control-text > .hint
//   error      .validation-message con texto (vacío = sin error → no es una parte)
//   opciones   label.value-option (radio/checkbox; el texto va en .text-content) y .dropdown / .p-select /
//              .p-multiselect (lista desplegable; sin índice de opción)
//   entrada    .input-control-container, input, textarea, select, button, .geopoint-control,
//              .drag-and-drop, [role=region] dentro de la pregunta
//   medios     img, video, audio, .media-block, .image-block dentro de la pregunta (menos la zona de subir)
//   grupo      .p-panel > .p-panel-header (.panel-title[role=button]); repetición = .p-panel.is-repeat
//   +/− repet. button.button-add-instance (hermano posterior del panel .is-repeat) y .button-menu
// FRÁGIL ante versiones nuevas de web-forms: son clases de su Vue, no una API. Si un selector deja de
// coincidir el resultado cae a `none`/`question` y el clic solo selecciona (comportamiento anterior).
import type { PreviewPart } from './previewParts'

export interface PartHit {
  part: PreviewPart
  /** Índice entre los `.question-container` del montaje; null si el toque fue en un panel. */
  questionIndex: number | null
  /** Panel tocado (grupo/repetición): títulos de todos los paneles en orden y cuál es. */
  panel: { titles: string[], ordinal: number } | null
  optionIndex?: number
  optionLabel?: string
  /** Texto del mensaje de error tocado. */
  message?: string
}

export interface DetectOptions {
  clientX?: number
  /** Dónde empieza el texto de un label (para separar asterisco de etiqueta). Inyectable para pruebas. */
  textLeft?: (label: Element) => number | null
}

const MEDIA = 'img, video, audio, .media-block, .image-block'
const UPLOAD_ZONE = '.drag-and-drop, .choose-image-button, .canvas-mobile-button'
const INPUTISH = '.input-control-container, input, textarea, select, button, .geopoint-control, .drag-and-drop, [role="region"]'

/** Inicio del texto del label medido con un Range (en jsdom/happy-dom da 0 → se trata como «sin dato»). */
export const realTextLeft = (label: Element): number | null => {
  try {
    const r = label.ownerDocument.createRange()
    r.selectNodeContents(label)
    const left = r.getBoundingClientRect().left
    return Number.isFinite(left) && left !== 0 ? left : null
  } catch { return null }
}

const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

const panelInfo = (root: Element, panel: Element): PartHit['panel'] => {
  const panels = [...root.querySelectorAll('.p-panel')]
  const ordinal = panels.indexOf(panel)
  if (ordinal === -1) return null
  return { titles: panels.map((p) => text(p.querySelector('.panel-title h2') ?? p.querySelector('.panel-title'))), ordinal }
}

export const detectPart = (target: Element | null, root: Element, opts: DetectOptions = {}): PartHit | null => {
  if (target === null || !root.contains(target)) return null
  const questions = [...root.querySelectorAll('.question-container')]
  const question = target.closest('.question-container')

  if (question !== null) {
    const questionIndex = questions.indexOf(question)
    const base = { questionIndex, panel: null }
    // Solo cuenta lo que está DENTRO de la pregunta (el contenedor del panel también es [role=region]).
    const within = (el: Element | null): Element | null => (el !== null && question.contains(el) ? el : null)
    const hit = (part: PreviewPart, extra: Partial<PartHit> = {}): PartHit => ({ ...base, part, ...extra })

    const msg = within(target.closest('.validation-message'))
    if (msg !== null && text(msg) !== '') return hit('error', { message: text(msg) })

    const option = within(target.closest('label.value-option'))
    if (option !== null) {
      const opts2 = [...question.querySelectorAll('label.value-option')]
      return hit('options', { optionIndex: opts2.indexOf(option), optionLabel: text(option.querySelector('.text-content') ?? option) })
    }
    if (within(target.closest('.dropdown, .p-select, .p-multiselect')) !== null) return hit('options')

    if (within(target.closest('.hint')) !== null) return hit('hint')

    if (within(target.closest(UPLOAD_ZONE)) === null && within(target.closest(MEDIA)) !== null) return hit('media')

    const label = within(target.closest('.control-text label'))
    if (label !== null || within(target.closest('.control-text')) !== null) {
      if (label?.classList.contains('required') === true && opts.clientX !== undefined) {
        const left = (opts.textLeft ?? realTextLeft)(label)
        if (left !== null && opts.clientX < left) return hit('required')
      }
      return hit('label')
    }

    if (within(target.closest(INPUTISH)) !== null) return hit('input')
    return hit('none')
  }

  const addButton = target.closest('button.button-add-instance')
  const panel = target.closest('.p-panel') ?? addButton?.previousElementSibling?.closest('.p-panel.is-repeat') ?? null
  if (addButton !== null) {
    const prev = addButton.previousElementSibling
    const rep = prev?.classList.contains('is-repeat') === true ? prev : null
    return rep === null ? null : { part: 'repeat-control', questionIndex: null, panel: panelInfo(root, rep) }
  }
  if (panel !== null && target.closest('.p-panel-header') !== null && panel.contains(target)) {
    // Solo el encabezado del panel más cercano (no el de un panel padre).
    const header = target.closest('.p-panel-header')
    if (header?.closest('.p-panel') === panel) {
      const isMenu = target.closest('.button-menu') !== null
      return { part: isMenu ? 'repeat-control' : 'group', questionIndex: null, panel: panelInfo(root, panel) }
    }
  }
  return null
}
