<script setup lang="ts">
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import { computed, ref, watch } from 'vue'

import { displayText } from '@/core/model/display'
import type { QuestionNode } from '@/core/model/types'
import { useAppI18n } from '@/i18n'
import { useFormStore } from '@/stores/form'

import { detectPreset, inputFor, presetsFor, presetToDefault } from './defaultPresets'
import type { PresetId } from './defaultPresets'

/**
 * SIGE: «Valor inicial» amigable. Escribe el `default` del XLSForm según el
 * preset; un default que no calza queda como «Personalizado» (se muestra y
 * edita tal cual, nunca se pisa salvo que el usuario elija otro preset).
 * Cada cambio es una sola entrada de deshacer (form.updateNode).
 */
const props = defineProps<{ node: QuestionNode }>()
const { t } = useAppI18n()
const form = useFormStore()

const list = computed(() => props.node.listRef !== undefined ? form.doc?.choiceLists[props.node.listRef] : undefined)
const choiceNames = computed(() => (list.value?.choices ?? []).map((c) => c.name))
const choiceOptions = computed(() =>
  (list.value?.choices ?? []).map((c) => {
    const label = displayText(c.label)
    return { name: c.name, text: label === '' || label === c.name ? c.name : `${label} (${c.name})` }
  })
)

const detected = computed(() => detectPreset(props.node.type, props.node.defaultValue, choiceNames.value))
// «Valor fijo» recién elegido y aún vacío: no hay default que lo delate, así que se recuerda aquí
// para mostrar el control. Se descarta apenas el default cambia o se elige otro preset.
const pendingFixed = ref(false)
watch(() => props.node.id, () => { pendingFixed.value = false })
watch(() => props.node.defaultValue, (v) => { if (v !== undefined) pendingFixed.value = false })
const preset = computed<PresetId>(() =>
  pendingFixed.value && detected.value.preset === 'none' ? 'fixed' : detected.value.preset
)
const input = computed(() => inputFor(props.node.type, preset.value))

const presetOptions = computed(() => {
  const ids = presetsFor(props.node.type).filter((id) => id !== 'first' || choiceNames.value.length > 0)
  const all: PresetId[] = preset.value === 'custom' ? [...ids, 'custom'] : ids
  return all.map((id) => ({ id, label: t(`properties.basic.defaultPreset.${id}`) }))
})

const write = (value: string | undefined): void => {
  form.updateNode(props.node.id, t('properties.basic.defaultPreset.undo'), (n) => { n.defaultValue = value })
}

const choose = (id: PresetId | null): void => {
  if (id === null || id === 'custom' || id === preset.value) return
  if (id === 'fixed') {
    // Sin valor todavía: si había uno (ej. today()) se quita y se espera el valor del usuario.
    pendingFixed.value = true
    if (props.node.defaultValue !== undefined) write(undefined)
    return
  }
  pendingFixed.value = false
  // `chosen` arranca con la primera opción para que haya algo que editar.
  write(presetToDefault(props.node.type, id, id === 'chosen' ? choiceNames.value[0] ?? '' : '', choiceNames.value))
}

const setFixed = (v: string | null | undefined): void => {
  write(presetToDefault(props.node.type, 'fixed', v ?? '', choiceNames.value))
}
const setChosen = (v: string | string[] | null): void => {
  write(presetToDefault(props.node.type, 'chosen', v ?? [], choiceNames.value))
}
const setCustom = (v: string | undefined): void => {
  write(v === undefined || v === '' ? undefined : v)
}

const htmlType = computed(() => {
  switch (input.value) {
    case 'date': return 'date'
    case 'datetime': return 'datetime-local'
    case 'time': return 'time'
    case 'integer': case 'decimal': return 'number'
    default: return 'text'
  }
})
const fixedValue = computed(() => {
  const v = String(detected.value.value)
  return input.value === 'datetime' ? v.slice(0, 16) : input.value === 'time' ? v.slice(0, 5) : v
})
</script>

<template>
  <div class="sige-default" data-testid="prop-default-preset">
    <Select
      :model-value="preset"
      :options="presetOptions"
      option-label="label"
      option-value="id"
      :aria-label="t('properties.basic.defaultPreset.label')"
      data-testid="prop-default-preset-select"
      @update:model-value="choose"
    />
    <input
      v-if="input === 'date' || input === 'datetime' || input === 'time' || input === 'integer' || input === 'decimal'"
      class="p-inputtext sige-default-input"
      :type="htmlType"
      :step="input === 'decimal' ? 'any' : undefined"
      :value="fixedValue"
      :aria-label="t('properties.basic.defaultPreset.value')"
      data-testid="prop-default-fixed"
      @change="setFixed(($event.target as HTMLInputElement).value)"
    >
    <InputText
      v-else-if="input === 'text'"
      :model-value="detected.value as string"
      :aria-label="t('properties.basic.defaultPreset.value')"
      data-testid="prop-default-fixed"
      @update:model-value="setFixed"
    />
    <Select
      v-else-if="input === 'choice'"
      :model-value="detected.value as string"
      :options="choiceOptions"
      option-label="text"
      option-value="name"
      :placeholder="t('properties.basic.defaultPreset.pickOne')"
      :aria-label="t('properties.basic.defaultPreset.pickOne')"
      data-testid="prop-default-choice"
      @update:model-value="setChosen"
    />
    <MultiSelect
      v-else-if="input === 'choices'"
      :model-value="detected.value as string[]"
      :options="choiceOptions"
      option-label="text"
      option-value="name"
      :placeholder="t('properties.basic.defaultPreset.pickMany')"
      :aria-label="t('properties.basic.defaultPreset.pickMany')"
      data-testid="prop-default-choices"
      @update:model-value="setChosen"
    />
    <template v-else-if="preset === 'custom'">
      <InputText
        :model-value="node.defaultValue ?? ''"
        :aria-label="t('properties.basic.defaultValue')"
        data-testid="prop-default"
        @update:model-value="setCustom($event ?? undefined)"
      />
      <small class="sige-default-hint">{{ t('properties.basic.defaultPreset.customHint') }}</small>
    </template>
  </div>
</template>

<style scoped>
.sige-default {
  display: flex;
  flex-direction: column;
  gap: var(--odk-spacing-s);
}

.sige-default-hint {
  color: var(--odk-muted-text-color);
  font-size: var(--odk-hint-font-size);
}
</style>
