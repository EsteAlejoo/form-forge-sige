<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { computed, ref } from 'vue'

import { primaryLang } from '@/core/model/display'
import { useAppI18n } from '@/i18n'
import { useFormStore } from '@/stores/form'

import {
  addTableAsList,
  analyzeNameColumn,
  buildChoiceListFromTable,
  ROWS_KOBO_ADVISORY,
  ROWS_PREVIEW_CAP,
  safeListName,
  tableFromRows,
} from './importTable'
import { profileColumns } from './profileColumns'
import type { TableData } from './profileColumns'
import { readTableSheets } from './readTableFile'
import type { TableSheet } from './readTableFile'

/**
 * SIGE: «Importar tabla». Archivo .csv/.xlsx → vista previa → lista de opciones
 * con columnas extra. Toda la lógica está en importTable.ts (probada); aquí solo
 * se elige archivo, hoja y columnas, y se muestran los avisos.
 */
const visible = defineModel<boolean>('visible', { required: true })

const { t } = useAppI18n()
const form = useFormStore()

const PREVIEW_ROWS = 5

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const sheets = ref<TableSheet[]>([])
const sheetIdx = ref(0)
const readError = ref<string | null>(null)
const listName = ref('')
const nameColumn = ref<string | null>(null)
const labelColumn = ref<string | null>(null) // null = igual al nombre

const table = computed<TableData | null>(() => {
  const sheet = sheets.value[sheetIdx.value]
  return sheet === undefined ? null : tableFromRows(sheet.rows)
})
const profile = computed(() => (table.value === null ? [] : profileColumns(table.value)))

const columnOptions = computed(() =>
  profile.value.map((p) => ({
    value: p.name,
    label: p.keyCandidate ? `${p.name} (${t('sigeTables.import.keyTag')})` : p.name,
  }))
)

const reset = (): void => {
  fileName.value = ''
  sheets.value = []
  sheetIdx.value = 0
  readError.value = null
  listName.value = ''
  nameColumn.value = null
  labelColumn.value = null
}

/** Llave candidata como name (si hay); como etiqueta, la primera columna de texto que no sea el name. */
const chooseDefaults = (): void => {
  const p = profile.value
  nameColumn.value = (p.find((c) => c.keyCandidate) ?? p[0])?.name ?? null
  const label = p.find((c) => c.name !== nameColumn.value && c.type === 'texto' && c.unique > 0)
  labelColumn.value = label?.name ?? null
}

const onFile = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file === undefined) return
  reset()
  fileName.value = file.name
  try {
    sheets.value = await readTableSheets(file)
  } catch {
    readError.value = t('sigeTables.import.errRead')
    return
  }
  if (sheets.value.length === 0 || (table.value?.rows.length ?? 0) === 0) {
    readError.value = t('sigeTables.import.errEmpty')
    return
  }
  listName.value = safeListName(file.name, form.doc?.choiceLists ?? {})
  chooseDefaults()
}

const onSheet = (idx: number | null): void => {
  sheetIdx.value = idx ?? 0
  chooseDefaults()
}

const sheetOptions = computed(() => sheets.value.map((s, i) => ({ value: i, label: s.name })))

const nameAnalysis = computed(() => {
  const tb = table.value
  const idx = tb === null || nameColumn.value === null ? -1 : tb.columns.indexOf(nameColumn.value)
  return tb === null || idx < 0 ? null : analyzeNameColumn(tb.rows.map((r) => r[idx] ?? ''))
})

const listError = computed<string | null>(() => {
  const n = listName.value.trim()
  if (n === '') return t('sigeTables.import.errListInvalid')
  if (!/^[A-Za-z_][\w.-]*$/.test(n)) return t('sigeTables.import.errListInvalid')
  if (form.doc?.choiceLists[n] !== undefined) return t('sigeTables.import.errListExists', { name: n })
  return null
})

const extrasText = computed(() => {
  const tb = table.value
  if (tb === null || nameColumn.value === null) return ''
  const used = new Set([nameColumn.value, labelColumn.value ?? nameColumn.value])
  return tb.columns.filter((c) => !used.has(c)).join(', ')
})

const warnings = computed<string[]>(() => {
  const out: string[] = []
  const a = nameAnalysis.value
  if (a !== null) {
    if (a.emptyRows.length > 0) out.push(t('sigeTables.import.warnEmpty', { count: a.emptyRows.length }))
    if (a.duplicates.length > 0) out.push(t('sigeTables.import.warnDuplicate', { count: a.duplicates.length }))
    if (a.unsafe > 0) out.push(t('sigeTables.import.warnUnsafe', { count: a.unsafe }))
  }
  const rows = table.value?.rows.length ?? 0
  if (rows > ROWS_KOBO_ADVISORY) out.push(t('sigeTables.import.warnSizeKobo', { limit: ROWS_KOBO_ADVISORY }))
  else if (rows > ROWS_PREVIEW_CAP) out.push(t('sigeTables.import.warnSizePreview', { limit: ROWS_PREVIEW_CAP }))
  return out
})

const previewRows = computed(() => table.value?.rows.slice(0, PREVIEW_ROWS) ?? [])

const canCreate = computed(() => table.value !== null && nameColumn.value !== null && listError.value === null)

const create = (): void => {
  const tb = table.value
  if (tb === null || nameColumn.value === null || listError.value !== null || form.doc === null) return
  const opts = {
    listName: listName.value.trim(),
    nameColumn: nameColumn.value,
    ...(labelColumn.value !== null ? { labelColumn: labelColumn.value } : {}),
    lang: primaryLang(form.doc),
  }
  buildChoiceListFromTable(tb, opts) // falla antes de abrir la transacción si algo no cuadra
  form.mutate(t('sigeTables.import.undo'), (d) => { addTableAsList(d, tb, opts) })
  close()
}

const close = (): void => {
  visible.value = false
  reset()
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="t('sigeTables.import.title')"
    modal
    :style="{ width: '44rem' }"
    data-testid="sige-import-table"
    @hide="reset"
  >
    <p class="intro">{{ t('sigeTables.import.intro') }}</p>

    <input
      ref="fileInput"
      type="file"
      accept=".csv,.xlsx,.xls"
      class="file-input"
      data-testid="sige-import-file"
      @change="onFile"
    >
    <div class="file-row">
      <Button
        :label="t('sigeTables.import.pickFile')"
        icon="pi pi-upload"
        severity="secondary"
        size="small"
        data-testid="sige-import-pick"
        @click="fileInput?.click()"
      />
      <span v-if="fileName !== ''" class="file-name">{{ t('sigeTables.import.fileName', { name: fileName }) }}</span>
    </div>
    <small v-if="readError !== null" class="error" data-testid="sige-import-error">{{ readError }}</small>

    <template v-if="table !== null && readError === null">
      <div class="fields">
        <label v-if="sheets.length > 1" class="field">
          <span>{{ t('sigeTables.import.sheet') }}</span>
          <Select
            :model-value="sheetIdx"
            :options="sheetOptions"
            option-label="label"
            option-value="value"
            size="small"
            data-testid="sige-import-sheet"
            @update:model-value="onSheet"
          />
        </label>
        <label class="field">
          <span>{{ t('sigeTables.import.listName') }}</span>
          <InputText v-model="listName" size="small" :invalid="listError !== null" data-testid="sige-import-listname" />
          <small v-if="listError !== null" class="error" data-testid="sige-import-listerror">{{ listError }}</small>
        </label>
        <label class="field">
          <span>{{ t('sigeTables.import.nameColumn') }}</span>
          <Select
            v-model="nameColumn"
            :options="columnOptions"
            option-label="label"
            option-value="value"
            size="small"
            data-testid="sige-import-namecol"
          />
        </label>
        <label class="field">
          <span>{{ t('sigeTables.import.labelColumn') }}</span>
          <Select
            v-model="labelColumn"
            :options="[{ value: null, label: t('sigeTables.import.sameAsName') }, ...columnOptions]"
            option-label="label"
            option-value="value"
            size="small"
            data-testid="sige-import-labelcol"
          />
        </label>
      </div>

      <p class="extras" data-testid="sige-import-extras">
        {{ extrasText === '' ? t('sigeTables.import.noExtras') : t('sigeTables.import.extras', { columns: extrasText }) }}
      </p>

      <ul v-if="warnings.length > 0" class="warnings" data-testid="sige-import-warnings">
        <li v-for="w in warnings" :key="w">{{ w }}</li>
      </ul>

      <p class="preview-title">
        {{ t('sigeTables.import.preview', { shown: previewRows.length, total: table.rows.length }) }}
      </p>
      <div class="preview-scroll">
        <table class="preview" data-testid="sige-import-preview">
          <thead>
            <tr>
              <th
                v-for="c in table.columns"
                :key="c"
                :class="{ 'is-name': c === nameColumn, 'is-label': c === (labelColumn ?? nameColumn) }"
              >
                {{ c }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in previewRows" :key="i">
              <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #footer>
      <Button :label="t('sigeTables.import.cancel')" severity="secondary" text @click="close" />
      <Button
        :label="t('sigeTables.import.create')"
        icon="pi pi-check"
        :disabled="!canCreate"
        data-testid="sige-import-create"
        @click="create"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.intro {
  margin: 0 0 var(--odk-spacing-m);
  color: var(--odk-muted-text-color);
  font-size: var(--odk-hint-font-size);
}

.file-input {
  display: none;
}

.file-row {
  display: flex;
  align-items: center;
  gap: var(--odk-spacing-m);
}

.file-name {
  font-size: var(--odk-hint-font-size);
  color: var(--odk-muted-text-color);
}

.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--odk-spacing-m);
  margin-top: var(--odk-spacing-l);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--odk-spacing-s);
  font-size: var(--odk-hint-font-size);
}

.error {
  color: var(--odk-error-text-color);
}

.extras {
  margin: var(--odk-spacing-m) 0 0;
  font-size: var(--odk-hint-font-size);
}

.warnings {
  margin: var(--odk-spacing-m) 0 0;
  padding: var(--odk-spacing-s) var(--odk-spacing-m) var(--odk-spacing-s) var(--odk-spacing-xl, 1.5rem);
  background: var(--odk-light-background-color);
  border-radius: var(--odk-radius);
  color: var(--odk-warning-text-color);
  font-size: var(--odk-hint-font-size);
}

.preview-title {
  margin: var(--odk-spacing-l) 0 var(--odk-spacing-s);
  font-size: var(--odk-hint-font-size);
  color: var(--odk-muted-text-color);
}

.preview-scroll {
  overflow-x: auto;
}

.preview {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--odk-hint-font-size);
}

.preview th,
.preview td {
  border: 1px solid var(--odk-border-color);
  padding: 2px 6px;
  text-align: left;
  white-space: nowrap;
}

.preview th.is-name {
  box-shadow: inset 0 -2px 0 var(--p-primary-color);
}

.preview th.is-label {
  font-style: italic;
}
</style>
