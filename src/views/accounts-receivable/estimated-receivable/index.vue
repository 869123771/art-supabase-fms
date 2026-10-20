<template>
  <FinancePlannedPage
    title="暂估应收单"
    area="应收款管理"
    description="查看和处理暂估应收。"
    icon="ri:file-list-3-line"
  />
</template>

<script setup lang="ts">
  import FinancePlannedPage from '../../components/finance-planned-page.vue'

  defineOptions({ name: 'FinanceEstimatedReceivable' })
</script>
