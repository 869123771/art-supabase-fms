<template>
  <Teleport to="body">
    <div class="fms-loan-print-batch" aria-hidden="true">
      <article v-for="record in records" :key="record.id" class="fms-loan-print-sheet">
        <header>
          <h1>借款单{{ record.isDemo ? '（演示）' : '' }}</h1>
          <strong>{{ record.loanNo }}</strong>
        </header>
        <dl>
          <div
            ><dt>借款人</dt><dd>{{ record.applicantName }}</dd></div
          >
          <div
            ><dt>申请日期</dt><dd>{{ record.applicationDate }}</dd></div
          >
          <div
            ><dt>费用承担部门</dt><dd>{{ record.expenseDepartmentName }}</dd></div
          >
          <div
            ><dt>还款日期</dt><dd>{{ record.repaymentDate }}</dd></div
          >
        </dl>
        <p>事由：{{ record.reason }}</p>
        <h2>借款明细</h2>
        <table>
          <thead
            ><tr><th>费用项目</th><th>借款用途</th><th>借款金额</th></tr></thead
          >
          <tbody>
            <tr v-for="item in record.items ?? []" :key="item.id">
              <td>{{ item.expenseItem?.itemName || '—' }}</td>
              <td>{{ item.purpose }}</td>
              <td class="fms-loan-print-sheet__money">{{ formatCurrencyValue(item.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="fms-loan-print-sheet__money"
          >借款合计：<strong>{{ formatCurrencyValue(record.loanAmount) }}</strong></p
        >
        <h2>收款信息</h2>
        <table>
          <thead
            ><tr><th>收款人</th><th>开户银行</th><th>银行账号</th><th>收款金额</th></tr></thead
          >
          <tbody>
            <tr v-for="payee in record.payees ?? []" :key="payee.id">
              <td>{{ payee.payeeName }}</td
              ><td>{{ payee.bankName }}</td
              ><td>{{ payee.bankAccount }}</td>
              <td class="fms-loan-print-sheet__money">{{ formatCurrencyValue(payee.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <footer>
          <span>申请人：{{ record.applicantName }}</span>
          <span>核定金额：{{ formatCurrencyValue(record.approvedAmount ?? 0) }}</span>
          <span>已付金额：{{ formatCurrencyValue(record.paidAmount ?? 0) }}</span>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { usePrintSheet } from '@/hooks/core/usePrintSheet'
  import { formatCurrencyValue } from '@/utils/ui'
  import type { TravelLoan } from '@fms/api'

  const records = ref<TravelLoan[]>([])
  const { print: printSheet } = usePrintSheet('is-fms-loan-printing', () => {
    records.value = []
  })
  async function print(rows: TravelLoan[]): Promise<void> {
    records.value = rows
    await printSheet()
  }
  defineExpose({ print })
</script>

<style lang="scss">
  .fms-loan-print-batch {
    display: none;
  }

  @media print {
    body.is-fms-loan-printing {
      background: #fff;

      > *:not(.fms-loan-print-batch) {
        display: none !important;
      }

      > .fms-loan-print-batch {
        display: block !important;
      }
    }

    .fms-loan-print-sheet {
      padding: 12mm;
      font: 10pt/1.45 sans-serif;
      color: #111827;
      break-after: page;

      header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding-bottom: 6mm;
        border-bottom: 2px solid #111827;
      }

      h1 {
        margin: 0;
        font-size: 18pt;
      }

      h2 {
        margin-top: 6mm;
        font-size: 12pt;
      }

      dl {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2mm 6mm;
        margin: 5mm 0;
      }

      dl div {
        display: flex;
        gap: 2mm;
      }

      dt {
        color: #4b5563;
      }

      dd {
        margin: 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 2mm;
        text-align: left;
        border: 1px solid #d1d5db;
      }

      th {
        background: #f3f4f6;
      }

      footer {
        display: flex;
        flex-wrap: wrap;
        gap: 6mm;
        margin-top: 10mm;
      }

      &__money {
        text-align: right;
        white-space: nowrap;
      }

      &:last-child {
        break-after: auto;
      }
    }
  }
</style>
