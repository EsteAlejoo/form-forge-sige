// SIGE: lógica pura de la edición en línea sobre el lienzo (sin Vue ni stores).
import { exactText, setText } from '@/core/model/display'
import { DEFAULT_LANG, type Lang, type LocalizedText } from '@/core/model/types'

/** Campos que se pueden editar ahí mismo. Hoy solo la etiqueta: la tarjeta del árbol no dibuja la ayuda ni el
 * texto de las opciones (ver informe); cuando lo haga basta ampliar esta unión. */
export type InlineField = 'label'

/** Idioma donde se escribe. Con idiomas declarados jamás se devuelve la clave 'default'
 * (crearía una traducción huérfana). Sin idiomas, 'default'. */
export const writeLang = (languages: readonly Lang[], editingLang: Lang): Lang => {
  if (languages.length === 0) return DEFAULT_LANG
  if (editingLang !== DEFAULT_LANG && languages.includes(editingLang)) return editingLang
  return languages.find((l) => l !== DEFAULT_LANG) ?? languages[0]
}

/** Texto con el que arranca el editor: el valor EXACTO del idioma, sin caer al texto de otro idioma
 * (si no, confirmar sin cambios copiaría el original como traducción). */
export const startingText = (text: LocalizedText | undefined, lang: Lang): string => exactText(text, lang)

/** Normaliza lo escrito: saltos de línea de Windows a \n y sin espacios sobrantes en los extremos. */
export const normalizeDraft = (draft: string): string => draft.replace(/\r\n?/g, '\n').trim()

/** Resultado de confirmar: `null` = no hay nada que escribir (sin cambios, no se crea entrada de deshacer);
 * si no, el nuevo LocalizedText (`undefined` = texto vacío, la clave del idioma se quita). */
export const commitInline = (
  current: LocalizedText | undefined,
  draft: string,
  lang: Lang
): { next: LocalizedText | undefined } | null => {
  const value = normalizeDraft(draft)
  if (value === startingText(current, lang)) return null
  return { next: setText(current, value, lang) }
}
