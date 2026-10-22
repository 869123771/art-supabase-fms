<template>
  <Teleport to="body">
    <div class="fms-repayment-print-batch" aria-hidden="true">
      <article v-for="record in records" :key="record.id" class="fms-repayment-print-sheet">
        <header>
          <h1>还款单{{ record.isDemo ? '（演示）' : '' }}</h1>
          <strong>{{ record.repaymentNo }}</strong>
        </header>
        <dl>
          <div
            ><dt>还款人</dt><dd>{{ record.applicantName }}</dd></div
          >
          <div
            ><dt>还款日期</dt><dd>{{ record.repaymentDate }}</dd></div
          >
          <div
            ><dt>关联借款</dt><dd>{{ record.loan?.loanNo || '—' }}</dd></div
          >
          <div
            ><dt>费用承担部门</dt><dd>{{ record.expenseDepartmentName }}</dd></div
          >
        </dl>
        <p>事由：{{ record.reason }}</p>
        <table>
          <thead>
            <tr><th>费用项目</th><th>借款事项</th><th>币种</th><th>汇率</th><th>还款金额</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in record.items ?? []" :key="item.id">
              <td>{{ item.expenseItemName }}</td>
              <td>{{ item.loanPurpose }}</td>
              <td>{{ item.currencyCode }}</td>
              <td>{{ item.exchangeRate }}</td>
              <td class="fms-repayment-print-sheet__money">{{
                formatCurrencyValue(item.amount)
              }}</td>
            </tr>
          </tbody>
        </table>
        <p class="fms-repayment-print-sheet__total"
          >还款合计：<strong>{{ formatCurrencyValue(record.amount) }}</strong></p
        >
        <footer>
          <span>付款人：{{ record.payerName || '—' }}</span>
          <span>付款银行：{{ record.payerBank || '—' }}</span>
          <span>银行账号：{{ record.bankAccount || '—' }}</span>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { usePrintSheet } from '@/hooks/core/usePrintSheet'
  import { formatCurrencyValue } from '@/utils/ui'
  import type { TravelRepayment } from '@fms/api'

  const records = ref<TravelRepayment[]>([])
  const { print: printSheet } = usePrintSheet('is-fms-repayment-printing', () => {
    records.value = []
  })
  async function print(rows: TravelRepayment[]): Promise<void> {
    records.value = rows
    await printSheet()
  }
  defineExpose({ print })
</script>

<style lang="scss">
  .fms-repayment-print-batch {
    display: none;
  }

  @media print {
    body.is-fms-repayment-printing {
      background: #fff;

      > *:not(.fms-repayment-print-batch) {
        display: none !important;
      }

      > .fms-repayment-print-batch {
        display: block !important;
      }
    }

    .fms-repayment-print-sheet {
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
        margin-top: 5mm;
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
        gap: 6mm;
        justify-content: space-between;
        margin-top: 10mm;
      }
    }

    .fms-repayment-print-sheet:last-child {
      break-after: auto;
    }

    .fms-repayment-print-sheet__money,
    .fms-repayment-print-sheet__total {
      text-align: right;
      white-space: nowrap;
    }
  }
</style>
