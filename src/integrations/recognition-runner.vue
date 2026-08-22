<template>
  <div class="fms-recognition-runner">
    <div class="fms-recognition-runner__toolbar">
      <span>{{ isInvoice ? '发票方向' : '资金方向' }}</span>
      <ElSegmented v-if="isInvoice" v-model="invoiceDirection" :options="invoiceDirections" />
      <ElSegmented v-else v-model="cashDirection" :options="cashDirections" />
    </div>

    <InvoiceOcrPanel
      v-if="isInvoice"
      ref="invoicePanelRef"
      v-model="invoiceImages"
      class="fms-recognition-runner__panel"
      :direction="invoiceDirection"
      apply-label="进入待复核"
      @apply="handleCreated"
    />
    <CashVoucherOcrPanel
      v-else-if="cashDirection === 'receipt'"
      ref="cashPanelRef"
      v-model="cashImages"
      class="fms-recognition-runner__panel"
      :direction="cashDirection"
      apply-label="进入待复核"
      @apply="handleCreated"
    />
    <section v-else class="fms-recognition-runner__payment art-card-xs">
      <ArtSvgIcon icon="ri:secure-payment-line" />
      <div>
        <small>需绑定已审批付款申请</small>
        <h3>从付款执行环节识别付款凭证</h3>
        <p>先进入付款申请并完成审批，再上传付款凭证，确保金额、账户和审批链路完整可审计。</p>
      </div>
      <ElButton type="primary" @click="router.push(financePaths.paymentApplication)">
        前往付款申请
      </ElButton>
    </section>
  </div>
</template>

<script setup lang="ts">
  import CashVoucherOcrPanel from '@fms/views/cash-transaction/modules/cash-voucher-ocr-panel.vue'
  import InvoiceOcrPanel from '@fms/views/invoice-management/modules/invoice-ocr-panel.vue'
  import { financePaths } from '@/router/business-paths'

  interface Props {
    feature: Api.IntelligentRecognition.Feature
  }

  interface ResetExpose {
    reset: () => void
  }

  defineOptions({ name: 'FmsRecognitionRunner' })
  const props = defineProps<Props>()
  const emit = defineEmits<{ created: [artifactId: string] }>()
  const router = useRouter()
  const invoicePanelRef = ref<ResetExpose>()
  const cashPanelRef = ref<ResetExpose>()
  const invoiceImages = ref<string[]>([])
  const cashImages = ref<string[]>([])
  const invoiceDirection = ref<Api.Fms.InvoiceDirection>('output')
  const cashDirection = ref<Api.Fms.CashDirection>('receipt')
  const invoiceDirections = [
    { label: '销项发票', value: 'output' },
    { label: '进项发票', value: 'input' }
  ]
  const cashDirections = [
    { label: '客户收款', value: 'receipt' },
    { label: '承运商付款', value: 'payment' }
  ]
  const isInvoice = computed(() => props.feature === 'invoice_ocr')

  function handleCreated(result: { artifactId: string }): void {
    emit('created', result.artifactId)
  }

  function reset(): void {
    invoiceImages.value = []
    cashImages.value = []
    invoiceDirection.value = 'output'
    cashDirection.value = 'receipt'
    invoicePanelRef.value?.reset()
    cashPanelRef.value?.reset()
  }

  defineExpose({ reset })
</script>

<style scoped lang="scss">
  .fms-recognition-runner {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    min-height: 360px;

    &__toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: flex-end;
      padding: 12px 16px;
      font-size: 12px;
      color: var(--art-text-gray-500);
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-card-border);
      border-radius: var(--el-border-radius-base);
    }

    &__panel {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      margin-bottom: 0;
    }

    &__payment {
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      min-height: 260px;
      margin-bottom: 0;

      > svg {
        padding: 12px;
        font-size: 24px;
        color: var(--theme-color);
        background: color-mix(in srgb, var(--theme-color) 9%, transparent);
        border-radius: var(--custom-radius);
      }

      small {
        color: var(--theme-color);
      }

      h3 {
        margin: 4px 0 6px;
        color: var(--art-text-gray-900);
      }

      p {
        margin: 0;
        line-height: 1.65;
        color: var(--art-text-gray-500);
      }
    }
  }

  @media (width <= 640px) {
    .fms-recognition-runner {
      &__toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      &__payment {
        grid-template-columns: 40px minmax(0, 1fr);

        .el-button {
          grid-column: 1 / -1;
          width: 100%;
        }
      }
    }
  }
</style>
