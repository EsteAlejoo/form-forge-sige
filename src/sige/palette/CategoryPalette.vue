<script setup lang="ts">
import { computed, ref } from 'vue'

import { endVariantDrag, startVariantDrag } from './variantDrop'
import { CATEGORIES, type Variant, variantsOf } from './variants'

/**
 * Paleta por categorías (aporte SigeApp): primero se elige una categoría;
 * al abrirla aparecen sus variantes con una muestra de cómo se verá.
 */
const emit = defineEmits<{ add: [variant: Variant] }>()

const open = ref<string | null>(null)
const category = computed(() => CATEGORIES.find((c) => c.id === open.value) ?? null)
const variants = computed(() => (open.value === null ? [] : variantsOf(open.value)))
</script>

<template>
  <div class="cp" data-testid="category-palette">
    <div v-if="category === null" class="cp-cats">
      <button
        v-for="c in CATEGORIES"
        :key="c.id"
        class="cp-cat"
        :data-testid="`cp-cat-${c.id}`"
        @click="open = c.id"
      >
        <i :class="c.icon" />
        <span class="cp-cat-title">{{ c.title }}</span>
        <span class="cp-cat-desc">{{ c.description }}</span>
      </button>
    </div>
    <template v-else>
      <div class="cp-head">
        <button class="cp-back" data-testid="cp-back" @click="open = null">
          <i class="pi pi-arrow-left" /> Categorías
        </button>
        <strong>{{ category.title }}</strong>
      </div>
      <div class="cp-variants">
        <button
          v-for="x in variants"
          :key="x.id"
          class="cp-variant"
          :data-testid="`cp-variant-${x.id}`"
          :title="`${x.description} · arrástrala al esquema o a la vista previa`"
          draggable="true"
          @click="emit('add', x)"
          @dragstart="startVariantDrag(x, $event)"
          @dragend="endVariantDrag"
        >
          <span class="cp-sample" aria-hidden="true">
            <template v-if="x.sample === 'text'"><i class="m-line" /></template>
            <template v-else-if="x.sample === 'multiline'"><i class="m-box" /></template>
            <template v-else-if="x.sample === 'number'"><i class="m-line short" /></template>
            <template v-else-if="x.sample === 'select'"><i class="m-line"><b>▾</b></i></template>
            <template v-else-if="x.sample === 'radio'">
              <em class="m-opt"><u class="r" />A</em><em class="m-opt"><u class="r" />B</em>
            </template>
            <template v-else-if="x.sample === 'columns'">
              <span class="m-cols"><em class="m-opt"><u class="r" />A</em><em class="m-opt"><u class="r" />B</em><em class="m-opt"><u class="r" />C</em><em class="m-opt"><u class="r" />D</em></span>
            </template>
            <template v-else-if="x.sample === 'checks'">
              <em class="m-opt"><u class="c" />A</em><em class="m-opt"><u class="c" />B</em>
            </template>
            <template v-else-if="x.sample === 'likert'">
              <span class="m-likert"><u class="r" /><u class="r" /><u class="r" /><u class="r" /><u class="r" /></span>
            </template>
            <template v-else-if="x.sample === 'date'"><i class="m-line"><b>📅</b></i></template>
            <template v-else-if="x.sample === 'time'"><i class="m-line short"><b>🕒</b></i></template>
            <template v-else-if="x.sample === 'photo'"><i class="m-box photo"><b>📷</b></i></template>
            <template v-else-if="x.sample === 'signature'"><i class="m-box photo"><b>✍</b></i></template>
            <template v-else-if="x.sample === 'gps'"><i class="m-line"><b>📍</b></i></template>
            <template v-else-if="x.sample === 'map'"><i class="m-box map"><b>🗺</b></i></template>
            <template v-else-if="x.sample === 'media'"><i class="m-line"><b>⬆</b></i></template>
            <template v-else-if="x.sample === 'barcode'"><i class="m-line"><b>▮▯</b></i></template>
            <template v-else-if="x.sample === 'note'"><i class="m-note" /></template>
            <template v-else-if="x.sample === 'group'"><i class="m-group"><s /><s /></i></template>
            <template v-else-if="x.sample === 'repeat'"><i class="m-group"><s /><s /><b>＋</b></i></template>
            <template v-else><i class="m-calc">ƒ</i></template>
          </span>
          <span class="cp-var-title">{{ x.title }}</span>
          <span class="cp-var-desc">{{ x.description }}</span>
          <span v-if="x.collect === false" class="cp-web" title="KoboCollect (Android) no lo muestra así">solo web</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style>
/* Indicador de dónde caerá la tarjeta arrastrada (esquema y vista previa; global porque el motor ODK dibuja la vista previa). */
.sige-drop-before { box-shadow: 0 -3px 0 0 var(--odk-primary-color, #e91e63) !important; }
.sige-drop-after { box-shadow: 0 3px 0 0 var(--odk-primary-color, #e91e63) !important; }
</style>

<style scoped>
.cp { padding: var(--odk-spacing-m); overflow-y: auto; flex: 1; }
.cp-cats, .cp-variants { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cp-cat, .cp-variant {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 16px 6px; border: 1px solid var(--odk-border-color, #d5dbe3);
  border-radius: 4px; background: var(--odk-muted-background-color, transparent);
  color: var(--odk-text-color); font-family: inherit; cursor: pointer; text-align: center;
}
.cp-cat:hover, .cp-variant:hover { border-color: var(--odk-primary-color); background: var(--odk-primary-lighter-background-color); }
.cp-cat i { font-size: 1.9rem; color: var(--odk-primary-color); margin-bottom: 4px; }
.cp-cat-title { font-weight: 600; font-size: var(--odk-hint-font-size); }
.cp-cat-desc, .cp-var-desc { font-size: 0.7rem; color: var(--odk-muted-text-color); }
.cp-var-title { font-weight: 600; font-size: 0.78rem; }
.cp-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.cp-back { border: 1px solid var(--odk-border-color, #d5dbe3); border-radius: 8px; background: none; padding: 3px 8px; cursor: pointer; color: var(--odk-text-color); font-family: inherit; font-size: 0.75rem; }
.cp-variant { position: relative; align-items: stretch; text-align: start; }
.cp-var-title, .cp-var-desc { text-align: start; }
.cp-web { position: absolute; top: 4px; right: 6px; font-size: 0.6rem; color: var(--odk-muted-text-color); }
/* muestras: dibujos mínimos de cómo se ve el campo */
.cp-sample { display: flex; flex-direction: column; gap: 4px; min-height: 40px; justify-content: center; margin-bottom: 4px; pointer-events: none; }
.m-line, .m-box, .m-note, .m-calc, .m-group {
  display: flex; align-items: center; justify-content: flex-end; font-style: normal; gap: 4px;
  border: 1px solid var(--odk-border-color, #bbb); border-radius: 6px; padding: 0 6px; height: 22px;
  background: var(--odk-base-background-color, #fff); font-size: 0.7rem;
}
.m-line.short { width: 55%; }
.m-box { height: 40px; align-items: flex-start; }
.m-box.photo, .m-box.map { align-items: center; justify-content: center; }
.m-box.map { background: repeating-linear-gradient(45deg, transparent, transparent 6px, var(--odk-primary-lighter-background-color) 6px, var(--odk-primary-lighter-background-color) 12px); }
.m-note { background: var(--odk-primary-lighter-background-color); border-color: transparent; }
.m-calc { justify-content: center; border-style: dashed; color: var(--odk-muted-text-color); }
.m-group { height: 40px; border-style: dashed; flex-direction: column; align-items: stretch; justify-content: space-evenly; position: relative; padding: 4px 6px; }
.m-group s { display: block; height: 8px; border: 1px solid var(--odk-border-color, #bbb); border-radius: 4px; text-decoration: none; }
.m-group b { position: absolute; right: 6px; bottom: 2px; font-size: 0.7rem; }
.m-opt { display: flex; align-items: center; gap: 5px; font-style: normal; font-size: 0.7rem; }
.m-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 6px; }
.m-likert { display: flex; justify-content: space-between; padding: 2px 6px; }
u.r, u.c { display: inline-block; width: 10px; height: 10px; border: 1.5px solid var(--odk-muted-text-color); text-decoration: none; }
u.r { border-radius: 50%; }
u.c { border-radius: 2px; }
</style>
