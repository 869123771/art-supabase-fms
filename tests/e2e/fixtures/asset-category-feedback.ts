import { createApp, defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setupGlobDirectives } from '@/directives'
import language from '@/locales'
import { store } from '@/store'
import AssetCategoryDialog from '@fms/views/fixed-asset/modules/asset-category-dialog.vue'
import '@styles/core/tailwind.css'
import '@styles/index.scss'

const Preview = defineComponent({
  setup() {
    const dialog = ref<{ handleOpen: () => Promise<void> }>()
    return () =>
      h('main', { style: 'padding: 24px' }, [
        h(
          'button',
          { type: 'button', onClick: () => dialog.value?.handleOpen() },
          '打开资产类别弹窗'
        ),
        h(AssetCategoryDialog, { ref: dialog })
      ])
  }
})

const app = createApp(Preview)
app.use(store)
app.use(
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }]
  })
)
app.use(language)
setupGlobDirectives(app)
app.mount('#asset-category-feedback-preview')
