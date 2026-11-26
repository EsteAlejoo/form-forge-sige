import { beforeEach, describe, expect, it } from 'vitest'

import { detectPart } from '@/sige/preview/detectPart'
import { PREVIEW_MODE_KEY, previewMode, setPreviewMode } from '@/sige/preview/mode'

// Fragmento FICTICIO con la misma forma que dibuja @getodk/web-forms 1.0.0 (inspeccionado en el DOM real).
const HTML = `
<div class="odk-form"><div class="form-questions"><div class="flex flex-column gap-2">
  <div class="p-panel p-panel-toggleable no-context-menu" id="p-ub">
    <div class="p-panel-header"><div class="panel-title" role="button"><h2><span>Ubicación</span></h2></div>
      <div class="p-panel-header-actions"><button class="p-panel-toggle-button"><svg/></button></div></div>
    <div class="p-panel-content-container" role="region"><div class="p-panel-content"><div class="content-wrapper">
      <div class="question-container" id="q-plaga">
        <div class="control-text"><label class="required" id="l-plaga">Plaga observada</label><div class="hint" id="h-plaga">Elija una</div></div>
        <div class="default-appearance">
          <label class="value-option" id="o0"><div><input type="radio"></div><span class="text-content">Arañita</span></label>
          <label class="value-option" id="o1"><div><input type="radio"></div><span class="text-content">Trips</span></label>
          <label class="value-option" id="o2"><div><input type="radio"></div><span class="text-content">Chanchito</span></label>
        </div>
        <div class="validation-placeholder"><span class="validation-message" id="m-plaga">This field is required.</span></div>
      </div>
      <div class="question-container" id="q-fecha">
        <div class="control-text"><label id="l-fecha">Fecha</label></div>
        <div class="input-control-container"><span><input role="combobox" type="text" id="i-fecha"></span></div>
        <div class="validation-placeholder"><span class="validation-message" id="m-vacio"></span></div>
      </div>
      <div class="question-container" id="q-lista">
        <div class="control-text"><label>Cuartel</label></div>
        <div class="dropdown"><span role="combobox" id="dd"><span>Select answer</span></span></div>
      </div>
      <div class="question-container" id="q-foto">
        <div class="control-text"><label>Foto</label><img id="img-foto" src="x.png"></div>
        <div><button class="choose-image-button" id="btn-foto"><span>Choose image</span></button>
          <div class="drag-and-drop" id="dnd"><div class="placeholder">Drop</div></div></div>
      </div>
      <div class="question-container" id="q-vacia"><div id="hueco"></div></div>
    </div></div></div>
  </div>
  <div class="p-panel p-panel-toggleable is-repeat with-context-menu" id="p-rep">
    <div class="p-panel-header"><div class="panel-title" role="button"><h2><span>Visitas</span></h2><span class="label-number">1</span></div>
      <div class="p-panel-header-actions"><button class="button-menu" id="menu"><svg/></button></div></div>
    <div class="p-panel-content-container"><div class="p-panel-content"><div class="content-wrapper">
      <div class="question-container" id="q-obs"><div class="control-text"><label>Observación</label></div>
        <div class="input-control-container"><input type="text" id="i-obs"></div></div>
    </div></div></div>
  </div>
  <button class="button-add-instance" id="add">Add Visitas</button>
</div></div></div>`

let root: HTMLElement
const $ = (id: string): Element => root.querySelector(`#${id}`) as Element

beforeEach(() => {
  document.body.innerHTML = `<div id="root">${HTML}</div>`
  root = document.getElementById('root') as HTMLElement
})

describe('detectPart sobre el DOM de web-forms', () => {
  it('etiqueta, ayuda, mensaje con texto', () => {
    expect(detectPart($('l-plaga'), root)).toMatchObject({ part: 'label', questionIndex: 0 })
    expect(detectPart($('h-plaga'), root)).toMatchObject({ part: 'hint', questionIndex: 0 })
    expect(detectPart($('m-plaga'), root)).toMatchObject({ part: 'error', message: 'This field is required.' })
  })
  it('mensaje vacío no es una parte (cae a la pregunta sin parte)', () => {
    expect(detectPart($('m-vacio'), root)).toMatchObject({ part: 'none', questionIndex: 1 })
  })
  it('asterisco = clic a la izquierda del texto del label.required; en el texto = etiqueta', () => {
    const textLeft = () => 100
    expect(detectPart($('l-plaga'), root, { clientX: 95, textLeft })?.part).toBe('required')
    expect(detectPart($('l-plaga'), root, { clientX: 130, textLeft })?.part).toBe('label')
    // sin medida (happy-dom no tiene layout): no se adivina, es etiqueta
    expect(detectPart($('l-plaga'), root, { clientX: 5 })?.part).toBe('label')
    // un label sin .required nunca es asterisco
    expect(detectPart($('l-fecha'), root, { clientX: 1, textLeft })?.part).toBe('label')
  })
  it('opciones: índice y texto de la opción tocada (clic en el texto o en el input)', () => {
    const textClick = detectPart($('o1').querySelector('.text-content'), root)
    expect(textClick).toMatchObject({ part: 'options', optionIndex: 1, optionLabel: 'Trips', questionIndex: 0 })
    expect(detectPart($('o2').querySelector('input'), root)).toMatchObject({ part: 'options', optionIndex: 2, optionLabel: 'Chanchito' })
  })
  it('lista desplegable → opciones sin índice', () => {
    const hit = detectPart($('dd'), root)
    expect(hit?.part).toBe('options')
    expect(hit?.optionIndex).toBeUndefined()
  })
  it('campo de entrada', () => {
    expect(detectPart($('i-fecha'), root)).toMatchObject({ part: 'input', questionIndex: 1 })
    expect(detectPart($('i-obs'), root)).toMatchObject({ part: 'input', questionIndex: 5 })
  })
  it('imagen de la pregunta = medios; subir archivo = entrada', () => {
    expect(detectPart($('img-foto'), root)?.part).toBe('media')
    expect(detectPart($('btn-foto'), root)?.part).toBe('input')
    expect(detectPart($('dnd'), root)?.part).toBe('input')
  })
  it('lugar sin parte reconocible → none (solo selecciona)', () => {
    expect(detectPart($('hueco'), root)).toMatchObject({ part: 'none', questionIndex: 4 })
  })
  it('encabezado de grupo y de repetición → panel con su posición', () => {
    const g = detectPart($('p-ub').querySelector('.panel-title'), root)
    expect(g).toMatchObject({ part: 'group', questionIndex: null })
    expect(g?.panel).toEqual({ titles: ['Ubicación', 'Visitas'], ordinal: 0 })
    const r = detectPart($('p-rep').querySelector('h2'), root)
    expect(r?.panel?.ordinal).toBe(1)
  })
  it('menú de la repetición y botón «agregar» → repeat-control de esa repetición', () => {
    expect(detectPart($('menu'), root)).toMatchObject({ part: 'repeat-control', panel: { ordinal: 1 } })
    expect(detectPart($('add'), root)).toMatchObject({ part: 'repeat-control', panel: { ordinal: 1 } })
  })
  it('objetivo fuera del montaje o nulo → null', () => {
    expect(detectPart(null, root)).toBeNull()
    expect(detectPart(document.body, root)).toBeNull()
  })
})

describe('modo Editar/Probar', () => {
  it('por defecto edita, se recuerda en sige.preview.mode', () => {
    expect(previewMode.value).toBe('edit')
    setPreviewMode('test')
    expect(previewMode.value).toBe('test')
    expect(localStorage.getItem(PREVIEW_MODE_KEY)).toBe('test')
    setPreviewMode('edit')
    expect(localStorage.getItem(PREVIEW_MODE_KEY)).toBe('edit')
  })
})
