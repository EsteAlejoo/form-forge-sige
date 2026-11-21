<script setup lang="ts">
import Select from 'primevue/select'
import { computed, ref } from 'vue'

import BasicSection from '@/components/properties/BasicSection.vue'
import ChoicesSection from '@/components/properties/ChoicesSection.vue'
import EntitySection, { canSaveTo } from '@/components/properties/EntitySection.vue'
import LogicSection from '@/components/properties/LogicSection.vue'
import PropSection from '@/components/properties/PropSection.vue'
import TypeConfigSection, { hasTypeConfig } from '@/components/properties/TypeConfigSection.vue'
import { useEditingLanguage } from '@/composables/useEditingLanguage'
import { useTypeLabels } from '@/composables/useTypeLabels'
import { getQuestionType } from '@/core/registry/question-types'
import { useAppI18n } from '@/i18n'
import { useEditorStore } from '@/stores/editor'
import { useFormStore } from '@/stores/form'

withDefaults(defineProps<{
  /** Collapsed to a slim rail (docked layouts with no selection). */
  railed?: boolean
}>(), { railed: false })

const { t } = useAppI18n()
const { typeTitle } = useTypeLabels()

const form = useFormStore()
const editor = useEditorStore()

const node = computed(() => form.getNode(editor.selectedNodeId))

// SIGE: pestañas estilo Elementor (se recuerda la última usada).
type PTab = 'content' | 'rules' | 'adv'
const PTAB_KEY = 'sige.props.tab'
const readTab = (): PTab => {
  try { const v = localStorage.getItem(PTAB_KEY); if (v === 'rules' || v === 'adv') return v } catch { /* sin almacenamiento */ }
  return 'content'
}
const ptab = ref<PTab>(readTab())
const setTab = (t: PTab): void => {
  ptab.value = t
  try { localStorage.setItem(PTAB_KEY, t) } catch { /* sin almacenamiento */ }
}
const PTABS: Array<{ id: PTab, label: string, icon: string }> = [
  { id: 'content', label: 'Contenido', icon: 'pi pi-pencil' },
  { id: 'rules', label: 'Datos y reglas', icon: 'pi pi-link' },
  { id: 'adv', label: 'Avanzado', icon: 'pi pi-cog' },
]
const def = computed(() => {
  const n = node.value
  if (n === null) return undefined
  return getQuestionType(n.kind === 'question' ? n.type : n.kind)
})

// Compact editing-language control: the same editor.displayLanguage state as
// the Translations dialog's "Show in editor" select — one state, two access
// points. Hidden entirely for monolingual forms. Options are the named
// languages only; while editor.displayLanguage is null (or points at a
// language an undo removed) the Select shows the resolved editing language —
// the form's primary — and picking any option writes it explicitly.
const { editingLang, languageOptions } = useEditingLanguage()
const languages = computed(() => form.doc?.languages ?? [])
</script>

<template>
  <aside class="property-panel" :class="{ railed }" :aria-label="t('properties.panel.ariaLabel')" data-testid="property-panel">
    <div
      v-if="railed"
      v-tooltip.left="t('properties.panel.railTooltip')"
      class="property-rail"
      data-testid="property-rail"
    >
      <i class="pi pi-sliders-h" />
    </div>

    <div v-else-if="node === null" class="property-empty">
      <i class="pi pi-sliders-h" />
      <p>{{ t('properties.panel.empty') }}</p>
    </div>

    <template v-else>
      <header class="property-header">
        <i :class="def?.icon ?? 'pi pi-question'" />
        <span>{{ def ? typeTitle(def) : node.kind }}</span>
        <code class="property-header-name">{{ node.name }}</code>
        <button
          v-if="def"
          type="button"
          class="property-header-help"
          :aria-label="t('help.ui.typeHelp', { title: typeTitle(def) })"
          data-testid="property-help"
          @click="editor.openTypeHelp(def.type)"
        >
          <i class="pi pi-question-circle" />
        </button>
      </header>
      <div v-if="languages.length > 0" class="property-editing-language">
        <span class="editing-language-caption">{{ t('properties.panel.editingLanguage') }}</span>
        <Select
          :model-value="editingLang"
          :options="languageOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="editing-language-select"
          :aria-label="t('properties.panel.editingLanguageAria')"
          data-testid="panel-editing-language"
          @update:model-value="editor.displayLanguage = $event"
        />
      </div>
      <div class="sige-ptabs" role="tablist" data-testid="sige-ptabs">
        <button
          v-for="x in PTABS"
          :key="x.id"
          role="tab"
          :aria-selected="ptab === x.id"
          :class="{ on: ptab === x.id }"
          :data-testid="`sige-ptab-${x.id}`"
          @click="setTab(x.id)"
        >
          <i :class="x.icon" /> {{ x.label }}
        </button>
      </div>
      <div class="property-sections">
        <PropSection v-show="ptab === 'content'" :title="t('properties.panel.sectionBasics')" section-key="basics">
          <BasicSection :key="`basic-${node.id}`" :node="node" part="content" />
        </PropSection>
        <PropSection v-if="hasTypeConfig(def)" v-show="ptab === 'content'" :title="t('properties.panel.sectionAppearance')" section-key="appearance">
          <TypeConfigSection :key="`config-${node.id}`" :node="node" />
        </PropSection>
        <PropSection v-show="ptab === 'rules'" title="Valor y obligatoriedad" section-key="rules-basic">
          <BasicSection :key="`rules-${node.id}`" :node="node" part="rules" />
        </PropSection>
        <PropSection v-show="ptab === 'adv'" title="Identificación" section-key="adv-basic">
          <BasicSection :key="`adv-${node.id}`" :node="node" part="adv" />
        </PropSection>
        <PropSection
          v-if="node.kind === 'question' && def?.requiresChoices"
          v-show="ptab === 'rules'"
          :title="t('properties.panel.sectionChoices')"
          section-key="choices"
        >
          <ChoicesSection :key="`choices-${node.id}`" :node="node" />
        </PropSection>
        <PropSection v-show="ptab === 'rules'" :title="t('properties.panel.sectionLogic')" section-key="logic">
          <LogicSection :key="`logic-${node.id}`" :node="node" />
        </PropSection>
        <PropSection
          v-if="form.doc?.entities !== undefined && node.kind === 'question' && canSaveTo(node, def)"
          v-show="ptab === 'adv'"
          :title="t('properties.panel.sectionEntity')"
          section-key="entity"
        >
          <EntitySection :key="`entity-${node.id}`" :node="node" />
        </PropSection>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.property-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--odk-base-background-color);
  border-inline-start: var(--builder-panel-border);
}

.property-rail {
  flex: 1;
  display: flex;
  justify-content: center;
  padding-top: var(--odk-spacing-l);
  color: var(--odk-light-muted-text-color);
  font-size: var(--odk-icon-m);
}

.property-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--odk-spacing-m);
  color: var(--odk-muted-text-color);
  font-size: var(--odk-hint-font-size);
  text-align: center;
  padding: var(--odk-spacing-xl);
}

.property-empty i {
  font-size: 2rem;
  color: var(--odk-light-muted-text-color);
}

.property-header {
  display: flex;
  align-items: center;
  gap: var(--odk-spacing-m);
  padding: var(--odk-spacing-l);
  border-bottom: var(--builder-panel-border);
  font-weight: 500;
}

.property-header i {
  color: var(--odk-muted-text-color);
}

.property-header-name {
  margin-inline-start: auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--odk-hint-font-size);
  font-weight: 400;
  color: var(--odk-muted-text-color);
}

.property-header-help {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  color: var(--odk-light-muted-text-color);
  font-size: var(--odk-icon-s);
  cursor: pointer;
  border-radius: 50%;
}

.property-header-help:hover,
.property-header-help:focus-visible {
  color: var(--odk-primary-text-color);
}

.property-editing-language {
  display: flex;
  align-items: center;
  gap: var(--odk-spacing-m);
  padding: var(--odk-spacing-s) var(--odk-spacing-l);
  border-bottom: var(--builder-panel-border);
}

.editing-language-caption {
  flex-shrink: 0;
  font-size: var(--odk-hint-font-size);
  color: var(--odk-muted-text-color);
}

.editing-language-select {
  flex: 1;
  min-width: 0;
}

.sige-ptabs {
  display: flex;
  border-bottom: var(--builder-panel-border);
}

.sige-ptabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--odk-spacing-m) var(--odk-spacing-s);
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--odk-muted-text-color);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.sige-ptabs button.on {
  color: var(--odk-primary-text-color, var(--odk-primary-color));
  border-bottom-color: var(--odk-primary-color);
}

.property-sections {
  flex: 1;
  overflow-y: auto;
  padding-bottom: var(--odk-spacing-l);
  display: flex;
  flex-direction: column;
}
</style>
