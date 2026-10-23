<template>
  <PayableSettlementWorkspace
    kind="refund"
    :permissions="{
      View: 'FinancePayableRefund:View',
      Add: 'FinancePayableRefund:Add',
      Edit: 'FinancePayableRefund:Edit',
      Submit: 'FinancePayableRefund:Submit',
      Approve: 'FinancePayableRefund:Approve',
      Delete: 'FinancePayableRefund:Delete',
      Confirm: 'FinancePayableRefund:Confirm',
      Voucher: 'FinancePayableRefund:Voucher',
      Void: 'FinancePayableRefund:Void',
      Print: 'FinancePayableRefund:Print',
      Export: 'FinancePayableRefund:Export'
    }"
  />
</template>
<script setup lang="ts">
  import PayableSettlementWorkspace from '@/components/business/payable-settlement-workspace/index.vue'
  defineOptions({ name: 'FinancePayableRefund' })
</script>
