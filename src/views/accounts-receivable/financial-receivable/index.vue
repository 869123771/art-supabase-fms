<template>
  <FinancePlannedPage
    title="财务应收单"
    area="应收款管理"
    description="查看和处理财务应收。"
    icon="ri:file-text-line"
  />
</template>

<script setup lang="ts">
  import FinancePlannedPage from '../../components/finance-planned-page.vue'

  defineOptions({ name: 'FinanceFinancialReceivable' })
</script>
