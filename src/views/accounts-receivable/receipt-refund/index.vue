<template>
  <FinancePlannedPage
    title="收款退款单"
    area="应收款管理"
    description="处理已收款项的退款。"
    icon="ri:refund-2-line"
  />
</template>

<script setup lang="ts">
  import FinancePlannedPage from '../../components/finance-planned-page.vue'

  defineOptions({ name: 'FinanceReceiptRefund' })
</script>
