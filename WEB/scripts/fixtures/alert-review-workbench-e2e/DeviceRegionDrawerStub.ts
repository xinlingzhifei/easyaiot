import { defineComponent, h } from 'vue'

export default defineComponent({
  name: 'DeviceRegionDrawerStub',
  emits: ['save'],
  setup() {
    return () => h('div', { 'data-testid': 'alert-review-region-drawer-stub' })
  },
})
