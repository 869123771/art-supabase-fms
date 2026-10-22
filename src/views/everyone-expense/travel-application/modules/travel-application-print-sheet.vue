<template>
  <Teleport to="body">
    <div class="fms-application-print-batch" aria-hidden="true">
      <article v-for="record in records" :key="record.id" class="fms-application-print-sheet">
        <header
          ><h1>出差申请单</h1><strong>{{ record.applicationNo }}</strong></header
        >
        <dl>
          <div
            ><dt>申请人</dt><dd>{{ record.applicantName }}</dd></div
          >
          <div
            ><dt>申请日期</dt><dd>{{ record.applicationDate }}</dd></div
          >
          <div
            ><dt>费用承担部门</dt><dd>{{ record.expenseDepartmentName }}</dd></div
          >
          <div
            ><dt>预计天数</dt><dd>{{ record.estimatedDays }} 天</dd></div
          >
        </dl>
        <p>事由：{{ record.reason }}</p>
        <table>
          <thead
            ><tr
              ><th>行程</th><th>出发地</th><th>目的地</th><th>行程期间</th><th>申请金额</th></tr
            ></thead
          >
          <tbody>
            <tr v-for="item in record.itineraries ?? []" :key="item.id">
              <td>{{ item.lineNo }}</td
              ><td>{{ item.departurePlace }}</td
              ><td>{{ item.destinationPlace }}</td>
              <td>{{ item.startDate }} 至 {{ item.endDate }}</td>
              <td>{{ formatCurrencyValue(item.requestedAmount) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="text-right"
          >申请金额合计：<strong>{{ formatCurrencyValue(record.requestedAmount) }}</strong></p
        >
        <p>备注：{{ record.remark || '—' }}</p>
      </article>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
  import { usePrintSheet } from '@/hooks/core/usePrintSheet'
  import { formatCurrencyValue } from '@/utils/ui'
  import type { TravelApplication } from '@fms/api'
  const records = ref<TravelApplication[]>([])
  const { print: printSheet } = usePrintSheet('is-fms-application-printing', () => {
    records.value = []
  })
  async function print(rows: TravelApplication[]): Promise<void> {
    records.value = rows
    await printSheet()
  }
  defineExpose({ print })
</script>
<style lang="scss">
  .fms-application-print-batch {
    display: none;
  }

  @media print {
    body.is-fms-application-printing {
      background: #fff;

      > *:not(.fms-application-print-batch) {
        display: none !important;
      }

      > .fms-application-print-batch {
        display: block !important;
      }
    }

    .fms-application-print-sheet {
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

      &:last-child {
        break-after: auto;
      }
    }
  }
</style>
