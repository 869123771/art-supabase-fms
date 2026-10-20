<template>
  <FinancePlannedPage
    title="收款核销工作台"
    area="应收款管理"
    description="核对收款与应收单据。"
    icon="ri:checkbox-circle-line"
  />
</template>

<script setup lang="ts">
  import FinancePlannedPage from '../../components/finance-planned-page.vue'

  defineOptions({ name: 'FinanceReceiptWriteoff' })
</script>
