<template>
  <FinancePlannedPage
    title="收款单"
    area="应收款管理"
    description="登记与核对收款单。"
    icon="ri:money-cny-circle-line"
  />
</template>

<script setup lang="ts">
  import FinancePlannedPage from '../../components/finance-planned-page.vue'

  defineOptions({ name: 'FinanceReceipt' })
</script>
