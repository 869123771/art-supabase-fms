<template>
  <ScmReceiptTargetWorkspace
    kind="asset_payable"
    view-permission="FinanceAssetPayable:View"
    action-permission="FinanceAssetPayable:Approve"
  />
</template>

<script setup lang="ts">
  import ScmReceiptTargetWorkspace from '@/components/business/scm-receipt-target-workspace/index.vue'

  defineOptions({ name: 'FinanceAssetPayable' })
</script>
