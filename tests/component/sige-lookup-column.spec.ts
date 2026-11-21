// SIGE: «Traer columna» (LookupColumnField). Datos ficticios.
import type { Pinia } from 'pinia'
import Select from 'primevue/select'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { newDocument } from '@/core/model/factory'
import type { QuestionNode } from '@/core/model/types'
import LookupColumnField from '@/sige/relaciones/LookupColumnField.vue'
import { useFormStore } from '@/stores/form'

import { freshPinia, mountWith } from './helpers'

describe('LookupColumnField', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = freshPinia()
    const form = useFormStore()
    form.doc = newDocument('T')
    form.addNode('select_one', null)
    const sel = form.doc.children[0] as QuestionNode
    form.updateNode(sel.id, 'x', (n) => { n.name = 'cuartel'; if (n.kind === 'question') n.listRef = 'cuarteles' })
    form.mutate('lista', (d) => {
      d.choiceLists.cuarteles = {
        name: 'cuarteles',
        extraColumnOrder: ['especie', 'variedad'],
        choices: [
          { name: '1', extras: { especie: 'Cerezo', variedad: 'Lapins' } },
          { name: '2', extras: { especie: 'Uva', variedad: 'Thompson' } },
        ],
      }
    })
    form.addNode('calculate', null)
  })

  const calcNode = (): QuestionNode => useFormStore().doc!.children[1] as QuestionNode

  it('elegir origen y columna escribe el calculate (un solo paso de deshacer por escritura)', async () => {
    const wrapper = mountWith(pinia, LookupColumnField, { props: { node: calcNode() } })
    const [origin, column] = wrapper.findAllComponents(Select)
    origin.vm.$emit('update:modelValue', 'cuartel')
    await nextTick()
    column.vm.$emit('update:modelValue', 'especie')
    await nextTick()
    expect(calcNode().bind.calculation).toBe('instance(\'cuarteles\')/root/item[name=${cuartel}]/especie')
    expect(wrapper.get('[data-testid="sige-lookup-example"]').text()).toContain('Cerezo')
  })

  it('sin listas con columnas extra explica qué hacer', async () => {
    useFormStore().mutate('quitar', (d) => { delete d.choiceLists.cuarteles })
    const wrapper = mountWith(pinia, LookupColumnField, { props: { node: calcNode() } })
    expect(wrapper.find('[data-testid="sige-lookup-none"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(Select)).toHaveLength(0)
  })

  it('avisa si el cálculo apunta a una columna que la lista no tiene y si hay un cálculo escrito a mano', async () => {
    const form = useFormStore()
    form.updateNode(calcNode().id, 'x', (n) => { n.bind.calculation = 'instance(\'cuarteles\')/root/item[name=${cuartel}]/riego' })
    const wrapper = mountWith(pinia, LookupColumnField, { props: { node: calcNode() } })
    expect(wrapper.get('[data-testid="sige-lookup-problem"]').text()).toContain('riego')
    form.updateNode(calcNode().id, 'x', (n) => { n.bind.calculation = '1 + 1' })
    await wrapper.setProps({ node: calcNode() })
    await nextTick()
    expect(wrapper.find('[data-testid="sige-lookup-replaces"]').exists()).toBe(true)
  })
})
