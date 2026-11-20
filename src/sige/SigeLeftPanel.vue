<script setup lang="ts">
import { ref, watch } from 'vue'

import QuestionPalette from '@/components/palette/QuestionPalette.vue'
import PropertyPanel from '@/components/properties/PropertyPanel.vue'
import { useEditorStore } from '@/stores/editor'

import type { Variant } from './palette/variants'

/**
 * Panel izquierdo único estilo Elementor (aporte SigeApp):
 *  - sin nada seleccionado → «Elementos» (paleta por categorías);
 *  - al seleccionar una pregunta → «Ajustes» (Contenido / Datos y reglas / Avanzado).
 * Se puede volver a «Elementos» con la pestaña o haciendo clic en el lienzo vacío.
 */
const emit = defineEmits<{ add: [type: string], addVariant: [variant: Variant] }>()

const editor = useEditorStore()
const tab = ref<'add' | 'props'>(editor.selectedNodeId === null ? 'add' : 'props')

watch(() => editor.selectedNodeId, (id) => {
  tab.value = id === null ? 'add' : 'props'
})
</script>

<template>
  <div class="sige-left" data-testid="sige-left-panel">
    <div class="sige-left-head">
      <i class="pi pi-bars" aria-hidden="true" />
      <strong>ElMemento Kobo</strong>
      <button class="sige-grid" title="Elementos" aria-label="Elementos" @click="tab = 'add'">
        <i class="pi pi-th-large" />
      </button>
    </div>
    <div class="sige-left-tabs" role="tablist">
      <button
        role="tab"
        :aria-selected="tab === 'add'"
        :class="{ on: tab === 'add' }"
        data-testid="sige-tab-add"
        @click="tab = 'add'"
      >
        <i class="pi pi-th-large" /> Elementos
      </button>
      <button
        role="tab"
        :aria-selected="tab === 'props'"
        :class="{ on: tab === 'props' }"
        :disabled="editor.selectedNodeId === null"
        data-testid="sige-tab-props"
        @click="tab = 'props'"
      >
        <i class="pi pi-sliders-h" /> Ajustes
      </button>
    </div>
    <div v-show="tab === 'add'" class="sige-left-body">
      <QuestionPalette @add="emit('add', $event)" @add-variant="emit('addVariant', $event)" />
    </div>
    <div v-show="tab === 'props'" class="sige-left-body">
      <PropertyPanel :railed="false" />
    </div>
  </div>
</template>

<style scoped>
.sige-left {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--builder-panel-bg);
  border-inline-end: var(--builder-panel-border);
}

.sige-left-head {
  display: flex;
  align-items: center;
  gap: var(--odk-spacing-m);
  padding: var(--odk-spacing-m) var(--odk-spacing-l);
  background: var(--odk-primary-color);
  color: var(--odk-primary-contrast-color, #fff);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.sige-left-head strong { flex: 1; font-weight: 600; }

.sige-grid {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.05rem;
  opacity: 0.9;
}

.sige-grid:hover { opacity: 1; }

.sige-left-tabs {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  border-bottom: var(--builder-panel-border);
}

.sige-left-tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--odk-spacing-s);
  padding: var(--odk-spacing-m);
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--odk-muted-text-color);
  font-family: inherit;
  font-size: var(--odk-hint-font-size);
  font-weight: 500;
  cursor: pointer;
}

.sige-left-tabs button.on {
  color: var(--odk-primary-text-color, var(--odk-primary-color));
  border-bottom-color: var(--odk-primary-color);
}

.sige-left-tabs button:disabled {
  opacity: 0.45;
  cursor: default;
}

.sige-left-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sige-left-body > :deep(.palette),
.sige-left-body > :deep(.property-panel) {
  flex: 1;
  min-height: 0;
  border: none;
}
</style>
