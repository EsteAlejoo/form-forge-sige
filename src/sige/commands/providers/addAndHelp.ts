import { GUIDE_KEYS } from '@/help/guides'
import { guideHelp } from '@/help/content'
import { groupTypesBySearch } from '@/help/search'
import { CATEGORIES, VARIANTS } from '@/sige/palette/variants'

import { addTypeAtSelection, addVariantAtSelection } from '../addActions'
import type { Command, CommandContext } from '../types'

/**
 * (2) Agregar pregunta de cualquier tipo del registro + variantes de la paleta
 * propia, y (4) temas de ayuda. Los tipos se enumeran con `groupTypesBySearch`
 * de src/help (vacío = todos, agrupados por categoría con nombre traducido),
 * la misma fuente que usan la paleta y la referencia de ayuda.
 */
export const addAndHelpProvider = (ctx: CommandContext): Command[] => {
  const { t, form, editor, labels } = ctx
  const out: Command[] = []
  const needForm = (): boolean | string => form.doc !== null || t('sigePalette.reason.noForm')
  const catAdd = t('sigePalette.cat.add')
  const catHelp = t('sigePalette.cat.help')

  for (const group of groupTypesBySearch('', labels)) {
    for (const def of group.items) {
      const name = labels.typeTitle(def)
      const keywords = [def.type, def.title, def.description, ...(def.searchKeywords ?? []), labels.typeDescription(def), group.label]
      out.push({
        id: `add:${def.type}`,
        titulo: t('sigePalette.addQuestion', { name }),
        tipo: 'agregar',
        palabrasClave: ['agregar', 'nueva pregunta', 'insertar', 'add', 'new question', 'ajouter', ...keywords],
        categoria: catAdd,
        icono: def.icon,
        habilitado: needForm,
        ejecutar: () => { addTypeAtSelection(ctx, def.type) },
      })
      out.push({
        id: `help-type:${def.type}`,
        titulo: t('sigePalette.helpType', { name }),
        tipo: 'ayuda',
        palabrasClave: ['ayuda', 'que es', 'help', 'aide', 'documentacion', ...keywords],
        categoria: catHelp,
        icono: 'pi pi-question-circle',
        ejecutar: () => { editor.openTypeHelp(def.type) },
      })
    }
  }

  for (const variant of VARIANTS) {
    const category = CATEGORIES.find((c) => c.id === variant.category)
    out.push({
      id: `add-variant:${variant.id}`,
      titulo: t('sigePalette.addQuestion', { name: variant.title }),
      tipo: 'agregar',
      palabrasClave: ['agregar', 'nueva pregunta', 'insertar', 'add', variant.type, variant.description, category?.title ?? ''],
      categoria: catAdd,
      icono: category?.icon ?? 'pi pi-plus',
      habilitado: needForm,
      ejecutar: () => { addVariantAtSelection(ctx, variant) },
    })
  }

  for (const key of GUIDE_KEYS) {
    const g = guideHelp[key]
    out.push({
      id: `help-guide:${key}`,
      titulo: t('sigePalette.helpGuide', { name: t(g.title) }),
      tipo: 'ayuda',
      palabrasClave: ['ayuda', 'guia', 'tutorial', 'como', 'help', 'guide', t(g.summary), ...(g.searchKeywords ?? [])],
      categoria: catHelp,
      icono: 'pi pi-book',
      ejecutar: () => { editor.openGuideHelp(key) },
    })
  }
  return out
}
