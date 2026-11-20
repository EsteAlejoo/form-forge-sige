<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { parseFormFile } from '@/core/import-form'
import * as formsRepo from '@/persistence/forms-repo'

/**
 * Ejemplos agrícolas (aporte SigeApp): formularios de 4 pasos con tablas
 * enlazadas, listas filtradas y campos calculados. Todos con datos INVENTADOS.
 * Se importan con el mismo lector de XLSForm del proyecto.
 */
const urls = import.meta.glob('./*.xlsx', { query: '?url', import: 'default', eager: true }) as Record<string, string>

interface Ejemplo { file: string, icon: string, title: string, desc: string }
const EJEMPLOS: Ejemplo[] = [
  { file: 'monitoreo_plagas.xlsx', icon: '🌿', title: 'Monitoreo de plagas', desc: 'Estructura principal por plaga, niveles de abundancia y % de aparición por estadio' },
  { file: 'calidad_fruta.xlsx', icon: '🍋', title: 'Calidad de fruta', desc: 'Especie → variedad, defectos de condición y de calidad, % y categoría' },
  { file: 'aforo_riego.xlsx', icon: '💧', title: 'Aforo de riego', desc: 'Sector → caudal medido por método, comparado con el caudal de diseño' },
  { file: 'asistencia.xlsx', icon: '🧑‍🌾', title: 'Asistencia de personal', desc: 'Cuadrilla → trabajador, estado, jornada y horas desde tablas' },
]

const router = useRouter()
const busy = ref<string | null>(null)
const error = ref('')

const abrir = async (e: Ejemplo): Promise<void> => {
  if (busy.value !== null) return
  busy.value = e.file
  error.value = ''
  try {
    const res = await fetch(urls[`./${e.file}`])
    const file = new File([await res.blob()], e.file)
    const parsed = await parseFormFile(file)
    if (parsed.document == null) throw new Error(parsed.issues[0]?.message ?? 'No se pudo leer el ejemplo')
    const record = await formsRepo.createForm(parsed.document)
    await router.push({ name: 'editor', params: { formId: record.id } })
  } catch (err) {
    error.value = String(err)
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section class="ej" data-testid="ejemplos-agricolas">
    <h2 class="ej-title">Ejemplos agrícolas <small>4 pasos · sin internet · datos inventados</small></h2>
    <div class="ej-grid">
      <button
        v-for="e in EJEMPLOS"
        :key="e.file"
        class="ej-card"
        :disabled="busy !== null"
        :data-testid="`ejemplo-${e.file.replace('.xlsx', '')}`"
        @click="abrir(e)"
      >
        <span class="ej-icon">{{ e.icon }}</span>
        <span class="ej-name">{{ busy === e.file ? 'Abriendo…' : e.title }}</span>
        <span class="ej-desc">{{ e.desc }}</span>
      </button>
    </div>
    <p v-if="error !== ''" class="ej-error">{{ error }}</p>
  </section>
</template>

<style scoped>
.ej { margin-bottom: var(--odk-spacing-xl); }
.ej-title { font-size: 1rem; margin: 0 0 var(--odk-spacing-m); }
.ej-title small { font-weight: 400; color: var(--odk-muted-text-color); margin-inline-start: var(--odk-spacing-m); }
.ej-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: var(--odk-spacing-l); }
.ej-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: start;
  padding: var(--odk-spacing-l); border: 1px solid var(--odk-border-color); border-radius: 10px;
  background: var(--odk-base-background-color); color: var(--odk-text-color); font-family: inherit; cursor: pointer;
}
.ej-card:hover:not(:disabled) { border-color: var(--odk-primary-color); box-shadow: 0 2px 10px rgb(0 0 0 / 12%); }
.ej-card:disabled { opacity: 0.6; cursor: progress; }
.ej-icon { font-size: 1.8rem; }
.ej-name { font-weight: 600; }
.ej-desc { font-size: var(--odk-hint-font-size); color: var(--odk-muted-text-color); }
.ej-error { color: var(--odk-error-text-color, #c0392b); }
</style>
