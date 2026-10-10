<template>
  <PurchasePayableWorkspace kind="estimated" view-permission="FinanceEstimatedPayable:View" />
</template>
<script setup lang="ts">
  import PurchasePayableWorkspace from '@/components/business/purchase-payable-workspace/index.vue'
  defineOptions({ name: 'FinanceEstimatedPayable' })
</script>
