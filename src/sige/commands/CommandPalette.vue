<script setup lang="ts">
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useSelectionActions } from '@/composables/useSelectionActions'
import { useTypeLabels } from '@/composables/useTypeLabels'
import { useAppI18n } from '@/i18n'
import { shortcutMod } from '@/shortcuts'
import { useEditorStore } from '@/stores/editor'
import { useEmbedStore } from '@/stores/embed'
import { useFormStore } from '@/stores/form'
import { useUiStore } from '@/stores/ui'

import { paletteOpen } from './bridge'
import { installBuiltinCommands } from './builtin'
import { loadRecent, pushRecent } from './recent'
import { collectCommands } from './registry'
import { searchCommands, type SearchResult } from './search'
import type { Command, CommandContext } from './types'

/**
 * La «lupita» (aporte SigeApp): un buscador único de funciones, como el
 * «¿Qué desea hacer?» de Office. Ctrl+K o el botón de la cabecera la abren.
 * Flechas mueven, Enter ejecuta, Esc cierra. Los comandos vienen del registro
 * (registry.ts); este componente solo busca, muestra y ejecuta.
 */
const { t } = useAppI18n()
const form = useFormStore()
const editor = useEditorStore()
const ui = useUiStore()
const embed = useEmbedStore()
const router = useRouter()
const toast = useToast()
const selection = useSelectionActions()
const labels = useTypeLabels()
const mod = shortcutMod()

const query = ref('')
const commands = ref<Command[]>([])
const recent = ref<string[]>([])
const active = ref(0)
const notice = ref('')
const input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)

const context = (): CommandContext => ({ t, mod, form, editor, ui, embed, selection, labels, router })

const results = computed<SearchResult[]>(() => searchCommands(commands.value, query.value, { recent: recent.value }))
const emptyQuery = computed(() => query.value.trim() === '')

const firstEnabled = (): number => Math.max(0, results.value.findIndex((r) => r.state.enabled))

watch(paletteOpen, (open) => {
  if (!open) return
  installBuiltinCommands()
  commands.value = collectCommands(context())
  recent.value = loadRecent()
  query.value = ''
  notice.value = ''
  active.value = 0
})

watch(query, () => {
  notice.value = ''
  active.value = firstEnabled()
})

watch(active, () => {
  void nextTick(() => {
    list.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' })
  })
})

const focusInput = (): void => { void nextTick(() => { input.value?.focus() }) }

const close = (): void => { paletteOpen.value = false }

const run = async (result: SearchResult | undefined): Promise<void> => {
  if (result === undefined) return
  if (!result.state.enabled) {
    notice.value = result.state.reason ?? t('sigePalette.reason.notApplicable')
    return
  }
  pushRecent(result.command.id)
  close()
  await nextTick()
  try {
    await result.command.ejecutar()
  } catch {
    toast.add({ severity: 'error', summary: t('sigePalette.error'), life: 4000 })
  }
}

const onKeydown = (event: KeyboardEvent): void => {
  const n = results.value.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (n > 0) active.value = (active.value + 1) % n
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (n > 0) active.value = (active.value - 1 + n) % n
  } else if (event.key === 'Home' && event.ctrlKey) {
    event.preventDefault()
    active.value = 0
  } else if (event.key === 'End' && event.ctrlKey) {
    event.preventDefault()
    active.value = Math.max(0, n - 1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    void run(results.value[active.value])
  }
}

const optionId = (i: number): string => `sige-palette-opt-${i}`
</script>

<template>
  <Dialog
    v-model:visible="paletteOpen"
    modal
    dismissable-mask
    :show-header="false"
    :draggable="false"
    position="top"
    :style="{ width: 'min(40rem, 92vw)', marginTop: '10vh' }"
    :content-style="{ padding: 0 }"
    data-testid="command-palette"
    @show="focusInput"
  >
    <div class="cp" role="dialog" :aria-label="t('sigePalette.ariaLabel')">
      <div class="cp-search">
        <i class="pi pi-search" aria-hidden="true" />
        <input
          ref="input"
          v-model="query"
          type="text"
          class="cp-input"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          aria-controls="sige-palette-list"
          aria-autocomplete="list"
          :aria-expanded="true"
          :aria-activedescendant="results.length > 0 ? optionId(active) : undefined"
          :aria-label="t('sigePalette.ariaLabel')"
          :placeholder="t('sigePalette.placeholder')"
          data-testid="command-palette-input"
          @keydown="onKeydown"
        >
      </div>
      <ul id="sige-palette-list" ref="list" class="cp-list" role="listbox" data-testid="command-palette-list">
        <li
          v-for="(r, i) in results"
          :id="optionId(i)"
          :key="r.command.id"
          class="cp-item"
          :class="{ 'cp-active': i === active, 'cp-disabled': !r.state.enabled }"
          role="option"
          :aria-selected="i === active"
          :aria-disabled="!r.state.enabled"
          :data-testid="`palette-item-${r.command.id}`"
          @mousemove="active = i"
          @click="run(r)"
        >
          <i :class="r.command.icono ?? 'pi pi-bolt'" class="cp-icon" aria-hidden="true" />
          <span class="cp-text">
            <span class="cp-title">{{ r.command.titulo }}</span>
            <span v-if="!r.state.enabled && r.state.reason" class="cp-reason">{{ r.state.reason }}</span>
          </span>
          <i v-if="emptyQuery && recent.includes(r.command.id)" class="pi pi-history cp-recent" :title="t('sigePalette.recent')" aria-hidden="true" />
          <span class="cp-cat">{{ r.command.categoria }}</span>
          <kbd v-if="r.command.atajo" class="cp-kbd">{{ r.command.atajo }}</kbd>
        </li>
        <li v-if="results.length === 0" class="cp-empty" role="presentation" data-testid="command-palette-empty">
          {{ t('sigePalette.empty') }}
        </li>
      </ul>
      <div class="cp-foot" aria-live="polite" data-testid="command-palette-notice">
        <span v-if="notice" class="cp-notice">{{ notice }}</span>
        <span v-else>{{ t('sigePalette.hint') }}</span>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.cp { display: flex; flex-direction: column; max-height: 70vh; }

.cp-search {
  display: flex;
  align-items: center;
  gap: var(--odk-spacing-m);
  padding: var(--odk-spacing-l);
  border-bottom: var(--builder-panel-border);
  color: var(--odk-muted-text-color);
}

.cp-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--odk-text-color);
  font-family: inherit;
  font-size: 1.05rem;
}

.cp-list { list-style: none; margin: 0; padding: var(--odk-spacing-s); overflow-y: auto; flex: 1; }

.cp-item {
  display: flex;
  align-items: center;
  gap: var(--odk-spacing-m);
  padding: var(--odk-spacing-m);
  border-radius: 6px;
  cursor: pointer;
}

.cp-active { background: color-mix(in srgb, var(--p-primary-color) 14%, transparent); }
.cp-disabled { opacity: 0.55; cursor: default; }
.cp-icon { width: 1.25rem; text-align: center; color: var(--odk-muted-text-color); }
.cp-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cp-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-reason { font-size: var(--odk-hint-font-size); color: var(--odk-muted-text-color); }
.cp-recent { color: var(--odk-muted-text-color); font-size: 0.8rem; }
.cp-cat { font-size: var(--odk-hint-font-size); color: var(--odk-muted-text-color); white-space: nowrap; }

.cp-kbd {
  font-family: inherit;
  font-size: 0.72rem;
  padding: 1px 6px;
  border: var(--builder-panel-border);
  border-radius: 4px;
  color: var(--odk-muted-text-color);
  white-space: nowrap;
}

.cp-empty { padding: var(--odk-spacing-l); text-align: center; color: var(--odk-muted-text-color); }

.cp-foot {
  padding: var(--odk-spacing-s) var(--odk-spacing-l);
  border-top: var(--builder-panel-border);
  font-size: var(--odk-hint-font-size);
  color: var(--odk-muted-text-color);
}

.cp-notice { color: var(--odk-primary-text-color); }
</style>
