import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AboutView from '../src/views/AboutView.vue'

// Texto obrigatório da seção 9 da especificação
const creditoArasaac =
  'Os símbolos pictográficos utilizados são propriedade do Governo de Aragão e foram criados por ' +
  'Sergio Palao para a ARASAAC (https://arasaac.org), que os distribui sob uma licença Creative ' +
  'Commons (BY-NC-SA).'

describe('AboutView', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { render: () => null } }],
  })
  const wrapper = mount(AboutView, { global: { plugins: [router] } })

  it('mostra o crédito do ARASAAC exatamente como exigido', () => {
    const paragraphs = wrapper.findAll('p').map((p) => p.text().replace(/\s+/g, ' '))
    expect(paragraphs).toContain(creditoArasaac)
  })

  it('tem link para o site do ARASAAC e para voltar à prancha', () => {
    expect(wrapper.find('a[href="https://arasaac.org"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/"]').text()).toBe('Voltar para a prancha')
  })
})
