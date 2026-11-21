import { ref } from 'vue'

/**
 * Petición de abrir el menú contextual de una pregunta (aporte SigeApp).
 * Un solo menú vive en el editor (QuestionContextMenu); las tarjetas del
 * lienzo y el celular de la vista previa solo piden abrirlo con el nodo tocado.
 */
export interface MenuRequest {
  event: MouseEvent
  nodeId: string
}

export const menuRequest = ref<MenuRequest | null>(null)

export const openQuestionMenu = (event: MouseEvent, nodeId: string): void => {
  event.preventDefault()
  event.stopPropagation() // una tarjeta dentro de un grupo no debe abrir también el menú del grupo
  menuRequest.value = { event, nodeId }
}
