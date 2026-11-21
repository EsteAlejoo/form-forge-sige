<script setup lang="ts">
import Button from 'primevue/button'

import { previewMode, setPreviewMode } from '@/sige/preview/mode' // SIGE
import { previewZoomPercent, resetPreviewZoom, stepPreviewZoom } from '@/sige/preview/zoom'
import { useRouter } from 'vue-router'

import { useAppI18n } from '@/i18n'
import { useEditorStore } from '@/stores/editor'
import { useFormStore } from '@/stores/form'
import { usePreviewStore } from '@/stores/preview'
import { PREVIEW_PRESET_WIDTHS, useUiStore, type PreviewPreset } from '@/stores/ui'

const { t } = useAppI18n()
const form = useFormStore()
const editor = useEditorStore()
const preview = usePreviewStore()
const ui = useUiStore()
const router = useRouter()

const PRESETS = [
  { preset: 'phone', icon: 'pi pi-mobile', tooltip: t('preview.toolbar.phonePreset') },
  { preset: 'tablet', icon: 'pi pi-tablet', tooltip: t('preview.toolbar.tabletPreset') },
  { preset: 'fill', icon: 'pi pi-arrows-h', tooltip: t('preview.toolbar.fillPreset') },
] as const

const selectPreset = (preset: PreviewPreset): void => {
  ui.previewPreset = preset
  if (preset === 'fill') return
  // Widen the pane so the device frame fits; the store clamps to 60vw.
  const contentPx = PREVIEW_PRESET_WIDTHS[preset]
  ui.setPanelWidth('preview', Math.max(ui.previewWidth, contentPx + 40))
}

const openFullPreview = (): void => {
  if (form.recordId !== null) {
    void router.push({ name: 'preview', params: { formId: form.recordId } })
  }
}
</script>

<template>
  <header class="preview-toolbar" data-testid="preview-toolbar">
    <span class="preview-title">{{ t('preview.toolbar.title') }}</span>
    <span class="preview-actions">
      <Button
        v-tooltip.bottom="t('preview.toolbar.refresh')"
        icon="pi pi-refresh"
        severity="secondary"
        text
        size="small"
        :aria-label="t('preview.toolbar.refresh')"
        data-testid="preview-refresh"
        @click="preview.refreshNow()"
      />
      <!-- SIGE: conmutador «Editar al tocar / Probar» (se recuerda en sige.preview.mode) -->
      <span class="preset-group sige-mode" role="group" :aria-label="t('sigePreview.modeGroup')" data-testid="sige-preview-mode">
        <button
          type="button"
          class="preset-button sige-mode-btn"
          :class="{ active: previewMode === 'edit' }"
          :aria-pressed="previewMode === 'edit'"
          :title="previewMode === 'edit' ? t('sigePreview.modeEditHint') : t('sigePreview.modeEditSwitch')"
          data-testid="sige-preview-mode-edit"
          @click="setPreviewMode('edit')"
        >
          <i class="pi pi-pencil" /> {{ t('sigePreview.modeEdit') }}
        </button>
        <button
          type="button"
          class="preset-button sige-mode-btn"
          :class="{ active: previewMode === 'test' }"
          :aria-pressed="previewMode === 'test'"
          :title="previewMode === 'test' ? t('sigePreview.modeTestHint') : t('sigePreview.modeTestSwitch')"
          data-testid="sige-preview-mode-test"
          @click="setPreviewMode('test')"
        >
          <i class="pi pi-play" /> {{ t('sigePreview.modeTest') }}
        </button>
      </span>
      <span class="sige-zoom" role="group" aria-label="Tamaño del texto" data-testid="sige-zoom">
        <button type="button" class="preset-button" title="Texto más pequeño" aria-label="Texto más pequeño" data-testid="sige-zoom-out" @click="stepPreviewZoom(-1)">A−</button>
        <button type="button" class="sige-zoom-pct" title="Restablecer tamaño" aria-label="Restablecer tamaño del texto" data-testid="sige-zoom-reset" @click="resetPreviewZoom()">{{ previewZoomPercent }}%</button>
        <button type="button" class="preset-button" title="Texto más grande" aria-label="Texto más grande" data-testid="sige-zoom-in" @click="stepPreviewZoom(1)">A+</button>
      </span>
      <span class="preset-group" role="group" :aria-label="t('preview.toolbar.widthPresetGroup')">
        <button
          v-for="p in PRESETS"
          :key="p.preset"
          v-tooltip.bottom="p.tooltip"
          type="button"
          class="preset-button"
          :class="{ active: ui.previewPreset === p.preset }"
          :aria-pressed="ui.previewPreset === p.preset"
          :aria-label="p.tooltip"
          :data-testid="`preview-preset-${p.preset}`"
          @click="selectPreset(p.preset)"
        >
          <i :class="p.icon" />
        </button>
      </span>
      <Button
        v-tooltip.bottom="t('preview.toolbar.openFullPage')"
        icon="pi pi-window-maximize"
        severity="secondary"
        text
        size="small"
        :aria-label="t('preview.toolbar.openFullPage')"
        @click="openFullPreview"
      />
      <Button
        icon="pi pi-times"
        severity="secondary"
        text
        size="small"
        :aria-label="t('preview.toolbar.close')"
        data-testid="preview-close"
        @click="editor.previewVisible = false"
      />
    </span>
  </header>
</template>

<style scoped>
.sige-mode { margin-inline-end: var(--odk-spacing-s); }
.sige-mode .sige-mode-btn { white-space: nowrap; width: auto; padding: 0 8px; gap: 4px; font-size: 0.72rem; font-weight: 600; }
.sige-zoom { display: inline-flex; align-items: center; gap: 2px; margin-inline-end: var(--odk-spacing-s); }
.sige-zoom .preset-button { font-size: 0.72rem; font-weight: 600; min-width: 28px; }
.sige-zoom-pct { border: none; background: none; color: var(--odk-muted-text-color); font-family: inherit; font-size: 0.7rem; cursor: pointer; padding: 0 2px; }
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--odk-spacing-s);
  padding: var(--odk-spacing-s) var(--odk-spacing-m);
  border-bottom: var(--builder-panel-border);
  background: var(--odk-base-background-color);
}

.preview-title {
  font-weight: 500;
}

.preview-actions {
  display: inline-flex;
  flex-wrap: wrap; /* SIGE: con el conmutador Editar/Probar la barra no cabe en una línea en paneles angostos */
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.preset-group {
  display: inline-flex;
  border: 1px solid var(--odk-border-color);
  border-radius: var(--odk-radius);
  overflow: hidden;
}

.preset-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--odk-muted-text-color);
  font-size: var(--odk-hint-font-size);
  cursor: pointer;
}

.preset-button + .preset-button {
  border-inline-start: 1px solid var(--odk-border-color);
}

.preset-button:hover {
  background: var(--odk-muted-background-color);
}

.preset-button.active {
  background: var(--p-primary-50, #e9f8ff);
  color: var(--p-primary-700, #297193);
}
</style>
