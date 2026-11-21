<script setup lang="ts">
// SIGE: cuadro de texto mínimo para editar en el lugar. Enter confirma, Shift+Enter salto de línea,
// Esc cancela, perder el foco (clic fuera) confirma. Emite UNA sola vez ('commit' o 'cancel').
import { nextTick, onMounted, ref } from 'vue'

const props = defineProps<{ initial: string, placeholder?: string, ariaLabel?: string }>()
const emit = defineEmits<{ commit: [value: string, byKey: boolean], cancel: [] }>()

const el = ref<HTMLTextAreaElement | null>(null)
const draft = ref(props.initial)
let done = false

const finish = (ok: boolean, byKey = false): void => {
  if (done) return
  done = true
  if (ok) emit('commit', draft.value, byKey)
  else emit('cancel')
}

const fit = (): void => {
  const t = el.value
  if (t === null) return
  t.style.height = 'auto'
  t.style.height = `${t.scrollHeight}px`
}

onMounted(() => {
  el.value?.focus()
  el.value?.select()
  fit()
})

const onKeydown = (event: KeyboardEvent): void => {
  // El árbol y la ventana no deben ver estas teclas (Supr, Ctrl+D, Ctrl+Z, flechas…): actúan sobre el texto.
  // Ctrl/Cmd+S sí sigue su camino (guardar).
  if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's')) event.stopPropagation()
  if (event.isComposing) return
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    finish(true, true)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    finish(false, true)
  }
}

const onInput = (): void => { void nextTick(fit) }
</script>

<template>
  <textarea
    ref="el"
    v-model="draft"
    class="sige-inline-edit"
    rows="1"
    data-testid="inline-edit"
    :placeholder="placeholder"
    :aria-label="ariaLabel"
    @keydown="onKeydown"
    @input="onInput"
    @blur="finish(true)"
    @mousedown.stop
    @click.stop
    @dblclick.stop
    @contextmenu.stop
  />
</template>

<style scoped>
.sige-inline-edit {
  display: block;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  overflow: hidden;
  font: inherit;
  line-height: 1.5;
  color: var(--odk-text-color);
  background: var(--odk-base-background-color);
  border: 1px solid var(--odk-primary-border-color);
  border-radius: var(--odk-radius);
  padding: 0 var(--odk-spacing-s);
  cursor: text;
}

.sige-inline-edit:focus {
  outline: 2px solid var(--odk-primary-border-color);
  outline-offset: 0;
}
</style>
