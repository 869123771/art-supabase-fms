<template>
  <PayableSettlementWorkspace
    kind="application"
    :permissions="{
      View: 'FinancePayableApplication:View',
      Add: 'FinancePayableApplication:Add',
      Edit: 'FinancePayableApplication:Edit',
      Submit: 'FinancePayableApplication:Submit',
      Approve: 'FinancePayableApplication:Approve',
      Delete: 'FinancePayableApplication:Delete',
      Push: 'FinancePayableApplication:Push',
      Freeze: 'FinancePayableApplication:Freeze',
      Close: 'FinancePayableApplication:Close',
      Print: 'FinancePayableApplication:Print',
      Export: 'FinancePayableApplication:Export'
    }"
  />
</template>
<script setup lang="ts">
  import PayableSettlementWorkspace from '@/components/business/payable-settlement-workspace/index.vue'
  defineOptions({ name: 'FinancePayableApplication' })
</script>
