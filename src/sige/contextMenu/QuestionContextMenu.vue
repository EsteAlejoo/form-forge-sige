<script setup lang="ts">
import ContextMenu from 'primevue/contextmenu'
import type { MenuItem } from 'primevue/menuitem'
import { ref, watch } from 'vue'

import { useSelectionActions } from '@/composables/useSelectionActions'
import { useTypeLabels } from '@/composables/useTypeLabels'
import { isContainer, type FormDocument } from '@/core/model/types'
import { CATEGORY_ORDER, getQuestionTypesByCategory } from '@/core/registry/question-types'
import { useAppI18n } from '@/i18n'
import { shortcutMod } from '@/shortcuts'
import { useEditorStore } from '@/stores/editor'
import { useFormStore } from '@/stores/form'

import {
  addRelative,
  addableTypes,
  changeNodeType,
  compatibleTypes,
  duplicateSelection,
  moveSelection,
  selectForMenu,
  siblingPosition,
} from './menuActions'
import { menuRequest } from './menuState'

/**
 * Menú contextual de una pregunta (aporte SigeApp). Un solo menú en el editor;
 * se abre desde el lienzo (TreeNodeCard) y desde el celular de la vista previa.
 * Toda la lógica reutiliza useSelectionActions y las acciones form.*.
 */
const form = useFormStore()
const editor = useEditorStore()
const { t } = useAppI18n()
const { typeTitle, categoryLabel } = useTypeLabels()
const selection = useSelectionActions()
const mod = shortcutMod()

const menu = ref<InstanceType<typeof ContextMenu> | null>(null)
const items = ref<MenuItem[]>([])

const typeSubmenu = (onPick: (type: string) => void): MenuItem[] =>
  CATEGORY_ORDER.filter((c) => c !== 'meta').flatMap((category) => {
    const defs = getQuestionTypesByCategory(category).filter((d) => addableTypes().includes(d))
    if (defs.length === 0) return []
    return [{
      label: categoryLabel(category),
      items: defs.map((d) => ({ label: typeTitle(d), icon: d.icon, command: () => { onPick(d.type) } })),
    }]
  })

const build = (nodeId: string): MenuItem[] => {
  const doc = form.doc as FormDocument | null
  const node = form.getNode(nodeId)
  if (doc === null || node === null) return []
  const pos = siblingPosition(doc, nodeId)
  const out: MenuItem[] = [
    { key: 'duplicate', label: t('sigeMenu.duplicate'), icon: 'pi pi-clone', shortcut: `${mod}+D`, command: () => { duplicateSelection(form, editor) } },
    { key: 'delete', label: t('sigeMenu.delete'), icon: 'pi pi-trash', shortcut: t('sigeMenu.shortcutDelete'), disabled: !selection.canDelete.value, command: selection.deleteSelection },
    { separator: true },
    { key: 'move-up', label: t('sigeMenu.moveUp'), icon: 'pi pi-arrow-up', shortcut: 'Alt+↑', disabled: pos.first, command: () => { moveSelection(form, editor, nodeId, -1) } },
    { key: 'move-down', label: t('sigeMenu.moveDown'), icon: 'pi pi-arrow-down', shortcut: 'Alt+↓', disabled: pos.last, command: () => { moveSelection(form, editor, nodeId, 1) } },
    { separator: true },
    { key: 'add-before', label: t('sigeMenu.addBefore'), icon: 'pi pi-plus', items: typeSubmenu((type) => { addRelative(form, editor, nodeId, 'before', type) }) },
    { key: 'add-after', label: t('sigeMenu.addAfter'), icon: 'pi pi-plus', items: typeSubmenu((type) => { addRelative(form, editor, nodeId, 'after', type) }) },
  ]
  if (isContainer(node)) {
    out.push({ key: 'add-inside', label: t('sigeMenu.addInside'), icon: 'pi pi-sign-in', items: typeSubmenu((type) => { addRelative(form, editor, nodeId, 'inside', type) }) })
  }
  if (node.kind === 'question') {
    const types = compatibleTypes(node)
    if (types.length > 0) {
      out.push({
        key: 'change-type',
        label: t('sigeMenu.changeType'),
        icon: 'pi pi-sync',
        items: types.map((d) => ({ label: typeTitle(d), icon: d.icon, command: () => { changeNodeType(form, nodeId, d.type) } })),
      })
    }
  }
  out.push(
    { separator: true },
    { key: 'copy', label: t('sigeMenu.copy'), icon: 'pi pi-copy', shortcut: `${mod}+C`, disabled: !selection.canCopy.value, command: selection.copySelection },
    { key: 'cut', label: t('sigeMenu.cut'), icon: 'pi pi-file-export', shortcut: `${mod}+X`, disabled: !selection.canCut.value, command: selection.cutSelection },
    { key: 'paste', label: t('sigeMenu.paste'), icon: 'pi pi-file-import', shortcut: `${mod}+V`, disabled: !selection.canPaste.value, command: selection.pasteClipboard }
  )
  return out
}

watch(menuRequest, (req) => {
  if (req === null) return
  menuRequest.value = null
  // Clic derecho selecciona primero ese nodo (salvo que ya esté en la selección múltiple).
  selectForMenu(editor, req.nodeId)
  items.value = build(req.nodeId)
  if (items.value.length > 0) menu.value?.show(req.event)
})
</script>

<template>
  <ContextMenu
    ref="menu"
    :model="items"
    append-to="body"
    :aria-label="t('sigeMenu.ariaLabel')"
    data-testid="question-context-menu"
  >
    <template #item="{ item, props }">
      <a v-bind="props.action" :data-testid="item.key !== undefined ? `ctx-${item.key}` : undefined">
        <span v-if="item.icon" :class="item.icon" />
        <span class="p-contextmenu-item-label">{{ item.label }}</span>
        <span v-if="item.shortcut" class="ctx-shortcut">{{ item.shortcut }}</span>
        <span v-if="item.items" class="pi pi-angle-right ctx-arrow" />
      </a>
    </template>
  </ContextMenu>
</template>

<style>
/* Global: el menú se monta en body. */
.p-contextmenu .ctx-shortcut {
  margin-inline-start: auto;
  padding-inline-start: var(--odk-spacing-xl);
  color: var(--odk-muted-text-color);
  font-size: var(--odk-hint-font-size);
}

.p-contextmenu .ctx-arrow {
  margin-inline-start: auto;
}
</style>
