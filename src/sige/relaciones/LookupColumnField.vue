<script setup lang="ts">
import Select from 'primevue/select'
import { computed, ref, watch } from 'vue'

import type { QuestionNode } from '@/core/model/types'
import { useAppI18n } from '@/i18n'
import { useFormStore } from '@/stores/form'

import {
  buildLookupExpression,
  checkLookup,
  lookupExample,
  lookupOrigins,
  parseLookupExpression,
} from './lookupExpression'
import type { LookupProblem } from './lookupExpression'

/**
 * SIGE: «Traer columna» para preguntas `calculate`. El usuario elige la pregunta de
 * origen (select_one con lista de columnas extra) y la columna; se escribe el
 * `calculate` correcto en una sola entrada de deshacer. Si el cálculo ya es un
 * lookup, se muestran sus valores y se avisa si la lista ya no tiene esa columna.
 */
const props = defineProps<{ node: QuestionNode }>()

const { t } = useAppI18n()
const form = useFormStore()

const origins = computed(() => (form.doc === null ? [] : lookupOrigins(form.doc)))
const current = computed(() => parseLookupExpression(props.node.bind.calculation))

const origin = ref<string | null>(current.value?.originField ?? null)
const column = ref<string | null>(current.value?.column ?? null)

// Si el cálculo cambia por fuera (deshacer, edición a mano), el selector lo sigue.
watch(() => props.node.bind.calculation, () => {
  origin.value = current.value?.originField ?? null
  column.value = current.value?.column ?? null
})
watch(() => props.node.id, () => {
  origin.value = current.value?.originField ?? null
  column.value = current.value?.column ?? null
})

const selected = computed(() => origins.value.find((o) => o.field === origin.value))
const originOptions = computed(() => origins.value.map((o) => ({ value: o.field, label: o.field })))
const columnOptions = computed(() => (selected.value?.columns ?? []).map((c) => ({ value: c, label: c })))

const hasManualCalc = computed(() =>
  (props.node.bind.calculation ?? '') !== '' && current.value === null
)

const write = (): void => {
  const o = selected.value
  const c = column.value
  if (o === undefined || c === null || !o.columns.includes(c)) return
  const expr = buildLookupExpression(o.listName, o.field, c)
  if (expr === props.node.bind.calculation) return
  form.updateNode(props.node.id, t('sigeTables.lookup.undo'), (n) => { n.bind.calculation = expr })
}

const setOrigin = (field: string | null): void => {
  origin.value = field
  const cols = origins.value.find((o) => o.field === field)?.columns ?? []
  if (column.value !== null && !cols.includes(column.value)) column.value = null
  if (column.value === null && cols.length === 1) column.value = cols[0]
  write()
}

const setColumn = (c: string | null): void => {
  column.value = c
  write()
}

const example = computed(() => {
  const o = selected.value
  const c = column.value
  if (form.doc === null || o === undefined || c === null) return null
  const ex = lookupExample(form.doc, o.listName, c)
  return ex === null ? null : { field: o.field, column: c, ...ex }
})

const problemText = (p: LookupProblem): string => {
  switch (p.code) {
    case 'list-missing': return t('sigeTables.lookup.listMissing', { list: p.listName })
    case 'column-missing': return t('sigeTables.lookup.columnMissing', { list: p.listName, column: p.column })
    case 'origin-missing': return t('sigeTables.lookup.originMissing', { field: p.field })
    case 'origin-other-list': return t('sigeTables.lookup.originOtherList', { field: p.field, list: p.listName })
  }
}

const problems = computed(() =>
  form.doc === null || current.value === null ? [] : checkLookup(form.doc, current.value).map(problemText)
)
</script>

<template>
  <div class="lookup" data-testid="sige-lookup">
    <span class="lookup-title"><i class="pi pi-link" /> {{ t('sigeTables.lookup.title') }}</span>
    <p v-if="origins.length === 0" class="note" data-testid="sige-lookup-none">{{ t('sigeTables.lookup.noOrigins') }}</p>
    <template v-else>
      <label class="lookup-field">
        <span>{{ t('sigeTables.lookup.origin') }}</span>
        <Select
          :model-value="origin"
          :options="originOptions"
          option-label="label"
          option-value="value"
          size="small"
          :placeholder="t('sigeTables.lookup.originPlaceholder')"
          data-testid="sige-lookup-origin"
          @update:model-value="setOrigin"
        />
      </label>
      <label class="lookup-field">
        <span>{{ t('sigeTables.lookup.column') }}</span>
        <Select
          :model-value="column"
          :options="columnOptions"
          option-label="label"
          option-value="value"
          size="small"
          :disabled="selected === undefined"
          :placeholder="t('sigeTables.lookup.columnPlaceholder')"
          data-testid="sige-lookup-column"
          @update:model-value="setColumn"
        />
      </label>
      <small v-if="hasManualCalc" class="note" data-testid="sige-lookup-replaces">{{ t('sigeTables.lookup.replaces') }}</small>
      <small v-if="example !== null" class="note" data-testid="sige-lookup-example">{{ t('sigeTables.lookup.example', example) }}</small>
    </template>
    <small v-for="p in problems" :key="p" class="problem" data-testid="sige-lookup-problem">{{ p }}</small>
  </div>
</template>

<style scoped>
.lookup {
  display: flex;
  flex-direction: column;
  gap: var(--odk-spacing-s);
  margin-top: var(--odk-spacing-m);
  padding-top: var(--odk-spacing-m);
  border-top: 1px dashed var(--odk-border-color);
}

.lookup-title {
  font-size: var(--odk-hint-font-size);
  font-weight: 600;
}

.lookup-field {
  display: flex;
  flex-direction: column;
  gap: var(--odk-spacing-s);
  font-size: var(--odk-hint-font-size);
}

.note {
  margin: 0;
  color: var(--odk-muted-text-color);
  font-size: var(--odk-hint-font-size);
}

.problem {
  color: var(--odk-warning-text-color);
}
</style>
