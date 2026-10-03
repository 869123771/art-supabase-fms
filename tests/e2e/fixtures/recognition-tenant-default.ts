import { createApp, defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setupGlobDirectives } from '@/directives'
import language from '@/locales'
import { store } from '@/store'
import { useTenantScopeStore } from '@/store/modules/tenant-scope'
import { useUserStore } from '@/store/modules/user'
import { useTenantScopeFormPolicy } from '@/hooks/core/useTenantScopeFormPolicy'
import FmsRecognitionRunner from '@fms/integrations/recognition-runner.vue'
import '@styles/core/tailwind.css'
import '@styles/index.scss'

const platformTenantId = '11111111-1111-4111-8111-111111111111'
const selectedTenantId = '22222222-2222-4222-8222-222222222222'

const Preview = defineComponent({
  setup() {
    const userStore = useUserStore()
    userStore.setUserInfo({
      userId: '33333333-3333-4333-8333-333333333333',
      tenantId: platformTenantId,
      platformSuper: true
    })
    const tenantScopeStore = useTenantScopeStore()
    tenantScopeStore.selectedTenantId = null
    const { defaultWriteTenantId } = useTenantScopeFormPolicy()

    return () =>
      h('main', { style: 'max-width: 920px; margin: 24px auto; padding: 0 16px' }, [
        h('div', { style: 'display: flex; gap: 8px; margin-bottom: 16px' }, [
          h(
            'button',
            { type: 'button', onClick: () => (tenantScopeStore.selectedTenantId = null) },
            '全部租户'
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: () => (tenantScopeStore.selectedTenantId = selectedTenantId)
            },
            '指定租户'
          )
        ]),
        h('output', { 'data-testid': 'write-tenant' }, defaultWriteTenantId.value),
        h(FmsRecognitionRunner, { feature: 'invoice_ocr' })
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
app.mount('#recognition-tenant-default-preview')
