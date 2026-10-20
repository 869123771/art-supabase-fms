<template>
  <FinancePlannedPage
    title="还款单"
    area="人人费用"
    description="登记并核对借款归还。"
    icon="ri:refund-line"
  />
</template>

<script setup lang="ts">
  import FinancePlannedPage from '../../components/finance-planned-page.vue'

  defineOptions({ name: 'FinanceRepayment' })
</script>
