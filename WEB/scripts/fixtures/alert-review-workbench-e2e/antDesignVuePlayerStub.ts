import { defineComponent, h } from 'vue'

function passthrough(name: string) {
  return defineComponent({
    name,
    setup(_, { slots }) {
      return () => h('div', slots.default?.())
    },
  })
}

export const Select = passthrough('SelectStub')
export const TabPane = passthrough('TabPaneStub')
export const Tabs = passthrough('TabsStub')
