<template>
  <Teleport to="body">
    <div class="ar-print-batch" aria-hidden="true">
      <article v-for="record in records" :key="record.documentNo" class="ar-print-sheet">
        <header
          ><h1>{{ record.title || title }}</h1
          ><strong>{{ record.documentNo }}</strong></header
        >
        <dl
          ><div v-for="field in record.fields" :key="field.label"
            ><dt>{{ field.label }}</dt
            ><dd>{{ field.value || '—' }}</dd></div
          ></dl
        >
        <table
          ><thead
            ><tr
              ><th v-for="column in record.columns" :key="column.label">{{ column.label }}</th></tr
            ></thead
          >
          <tbody
            ><tr v-for="(row, index) in record.rows" :key="index"
              ><td
                v-for="(cell, columnIndex) in row"
                :key="columnIndex"
                :class="{
                  'ar-print-sheet__number': record.columns[columnIndex]?.align === 'right'
                }"
                >{{ cell }}</td
              ></tr
            ></tbody
          >
        </table>
        <div class="ar-print-sheet__totals"
          ><strong v-for="total in record.totals" :key="total.label"
            >{{ total.label }}：{{ total.value }}</strong
          ></div
        >
        <p class="ar-print-sheet__remark">备注：{{ record.remark || '—' }}</p>
        <footer
          ><span>制单：{{ record.createdBy || '________' }}</span
          ><span>审核：________</span><span>经办：________</span></footer
        >
      </article>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  import { usePrintSheet } from '@/hooks/core/usePrintSheet'
  export interface ArPrintRecord {
    title?: string
    documentNo: string
    fields: Array<{ label: string; value: string }>
    columns: Array<{ label: string; align?: 'left' | 'right' }>
    rows: string[][]
    totals: Array<{ label: string; value: string }>
    remark?: string | null
    createdBy?: string
  }
  defineOptions({ name: 'ArPrintSheet' })
  const records = ref<ArPrintRecord[]>([])
  const title = ref('')
  const { print: printSheet } = usePrintSheet('is-ar-printing', () => {
    records.value = []
  })
  async function print(input: ArPrintRecord[], documentTitle: string): Promise<void> {
    records.value = input
    title.value = documentTitle
    await printSheet()
  }
  defineExpose({ print })
</script>
<style lang="scss">
  .ar-print-batch {
    display: none;
  }

  @media print {
    @page {
      size: a4 portrait;
      margin: 12mm;
    }

    body.is-ar-printing {
      background: #fff;

      > *:not(.ar-print-batch) {
        display: none !important;
      }

      > .ar-print-batch {
        display: block !important;
      }
    }

    .ar-print-sheet {
      font: 10pt/1.5 sans-serif;
      color: #111827;
      break-after: page;

      &:last-child {
        break-after: auto;
      }

      header {
        display: flex;
        gap: 6mm;
        align-items: baseline;
        justify-content: space-between;
        padding-bottom: 5mm;
        border-bottom: 2px solid #111827;
      }

      h1 {
        margin: 0;
        font-size: 18pt;
      }

      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 2mm 6mm;
        margin: 5mm 0;
      }

      dl div {
        display: flex;
        gap: 2mm;
        min-width: 0;
      }

      dt {
        flex: none;
        color: #4b5563;
      }

      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 2mm;
        text-align: left;
        overflow-wrap: anywhere;
        border: 1px solid #9ca3af;
      }

      th {
        background: #f3f4f6;
      }

      tr {
        break-inside: avoid;
      }

      footer {
        display: flex;
        gap: 6mm;
        justify-content: space-between;
        margin-top: 10mm;
      }

      &__number {
        text-align: right;
      }

      &__totals {
        display: flex;
        flex-wrap: wrap;
        gap: 3mm 6mm;
        justify-content: flex-end;
        margin-top: 5mm;
      }

      &__remark {
        overflow-wrap: anywhere;
      }
    }
  }
</style>
