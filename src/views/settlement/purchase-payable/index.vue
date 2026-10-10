<template>
  <PurchasePayableWorkspace kind="financial" view-permission="FinancePurchasePayable:View" />
</template>
<script setup lang="ts">
  import PurchasePayableWorkspace from '@/components/business/purchase-payable-workspace/index.vue'
  defineOptions({ name: 'FinancePurchasePayable' })
</script>
