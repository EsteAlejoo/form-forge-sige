<script setup lang="ts">
import { computed } from 'vue'

import type { QuestionTypeDefinition } from '@/core/registry/question-types'

/**
 * Selector de apariencia (aporte SigeApp): lista de botones de radio CON etiqueta.
 * Con el teclado (flechas ↑ ↓) cada opción se aplica al instante, así la vista
 * previa se ve cambiar sin abrir menús. Deja fuera las apariencias que solo
 * tienen sentido dentro de una tabla de opciones (`label`, `list-nolabel`),
 * que sueltas dibujan botones sin etiquetas.
 */
const props = defineProps<{
  def: QuestionTypeDefinition
  /** Apariencia actual (cadena cruda; puede combinar varias). */
  modelValue: string | undefined
  nodeId: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string | undefined] }>()

const ES: Record<string, string> = {
  minimal: 'Lista desplegable',
  search: 'Con buscador',
  autocomplete: 'Escribir y elegir (autocompletar)',
  'columns-pack': 'Botones en columnas (recomendada)',
  columns: 'Columnas fijas (pueden cortar etiquetas)',
  'no-buttons': 'Botón (sin círculo ni casilla)',
  'columns-pack no-buttons': 'Botones en fila (sin círculo ni casilla)',
  list: 'Horizontal con etiquetas',
  multiline: 'Varias líneas',
  numbers: 'Teclado numérico',
  masked: 'Texto oculto',
  'thousands-sep': 'Separador de miles',
  'month-year': 'Mes y año',
  year: 'Solo año',
  'no-calendar': 'Sin calendario',
  annotate: 'Dibujar encima',
  signature: 'Firma',
  draw: 'Dibujo libre',
  new: 'Solo cámara nueva',
  'new-front': 'Cámara frontal',
  maps: 'Con mapa',
  map: 'Mapa',
  'placement-map': 'Marcar en mapa',
  url: 'Enlace (URL)',
  quick: 'Selección rápida (pasa a la siguiente al elegir)',
  likert: 'Escala Likert',
  bearing: 'Rumbo (brújula)',
  counter: 'Contador (+ / −)',
  rating: 'Estrellas',
  picker: 'Selector de ruedas',
  vertical: 'Vertical',
  'no-ticks': 'Sin marcas',
  'field-list': 'Varias preguntas en una pantalla',
  'table-list': 'Tabla de opciones',
  'hidden-answer': 'Respuesta oculta',
  'hide-input': 'Ocultar lo escrito',
  'identify-user': 'Identificar al usuario',
  printer: 'Imprimir',
  ethiopian: 'Calendario etíope',
  coptic: 'Calendario copto',
  islamic: 'Calendario islámico',
  'bikram-sambat': 'Calendario Bikram Sambat',
  myanmar: 'Calendario birmano',
  persian: 'Calendario persa',
}
/** Descripciones en español de las opciones de elección (las demás muestran la descripción original). */
const DESC_ES: Record<string, string> = {
  minimal: 'Un cuadro que al tocarlo despliega las opciones',
  search: 'Permite buscar entre las opciones',
  autocomplete: 'Filtra las opciones mientras se escribe',
  'columns-pack': 'Tantas opciones por línea como quepan',
  columns: 'Opciones en 2 a 5 columnas según el ancho',
  'no-buttons': 'Cada opción es un botón; se oculta el círculo o la casilla',
  'columns-pack no-buttons': 'Botones en fila, tantos como quepan, sin círculo ni casilla',
  list: 'Botones horizontales con su etiqueta',
  quick: 'Al elegir una opción, pasa solo a la siguiente pregunta',
  likert: 'Escala horizontal tipo Likert (de menos a más)',
}
const HIDDEN = new Set(['label', 'list-nolabel', 'image-map', 'columns-n'])

interface Opt { value: string, name: string, desc: string, web: boolean }
const opts = computed<Opt[]>(() => [
  { value: '', name: 'Normal', desc: 'Sin apariencia especial', web: false },
  ...(props.def.appearances ?? [])
    .filter((a) => !HIDDEN.has(a.name) && !a.name.endsWith(':'))
    .map((a) => ({ value: a.name, name: ES[a.name] ?? a.name, desc: DESC_ES[a.name] ?? a.description, web: !a.collectSupported })),
  // Combinación frecuente: botones en fila sin círculo/casilla (solo si el tipo admite ambas partes).
  ...(['columns-pack', 'no-buttons'].every((n) => (props.def.appearances ?? []).some((a) => a.name === n))
    ? [{ value: 'columns-pack no-buttons', name: ES['columns-pack no-buttons'], desc: DESC_ES['columns-pack no-buttons'], web: false }]
    : []),
])
const current = computed(() => (props.modelValue ?? '').trim().split(/\s+/).filter((t) => t !== '').join(' '))
const known = computed(() => opts.value.some((o) => o.value === current.value))
</script>

<template>
  <fieldset class="ap" data-testid="appearance-picker">
    <legend class="ap-legend">Apariencia · usa ↑ ↓ para probar</legend>
    <label v-for="o in opts" :key="o.value || 'normal'" class="ap-opt" :class="{ on: current === o.value }">
      <input
        type="radio"
        :name="`ap-${nodeId}`"
        :value="o.value"
        :checked="current === o.value"
        :data-testid="`appearance-opt-${o.value || 'normal'}`"
        @change="emit('update:modelValue', o.value === '' ? undefined : o.value)"
      >
      <span class="ap-name">{{ o.name }}<em v-if="o.web"> · solo web</em></span>
      <small class="ap-desc">{{ o.desc }}</small>
    </label>
    <p v-if="!known && current !== ''" class="ap-custom">Apariencia propia en uso: <code>{{ current }}</code></p>
  </fieldset>
</template>

<style scoped>
.ap { border: none; margin: 0 0 var(--odk-spacing-m); padding: 0; display: flex; flex-direction: column; gap: 2px; }
.ap-legend { padding: 0; margin-bottom: var(--odk-spacing-s); font-size: var(--odk-hint-font-size); color: var(--odk-muted-text-color); }
.ap-opt {
  display: grid; grid-template-columns: auto 1fr; column-gap: var(--odk-spacing-m); align-items: center;
  padding: 6px var(--odk-spacing-m); border: 1px solid transparent; border-radius: var(--odk-radius); cursor: pointer;
}
.ap-opt:hover { background: var(--odk-primary-lighter-background-color); }
.ap-opt.on { border-color: var(--odk-primary-color); background: var(--odk-primary-lighter-background-color); }
.ap-opt:focus-within { outline: 2px solid var(--odk-primary-color); outline-offset: 1px; }
.ap-opt input { accent-color: var(--odk-primary-color); margin: 0; }
.ap-name { font-weight: 500; font-size: 0.85rem; color: var(--odk-text-color); }
.ap-name em { font-style: normal; font-weight: 400; color: var(--odk-muted-text-color); }
.ap-desc { grid-column: 2; font-size: 0.72rem; color: var(--odk-muted-text-color); }
.ap-custom { margin: var(--odk-spacing-s) 0 0; font-size: var(--odk-hint-font-size); color: var(--odk-muted-text-color); }
</style>
