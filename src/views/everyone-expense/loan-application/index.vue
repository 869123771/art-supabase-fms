<template>
  <ArtPermissionGuard permission="FinanceLoanApplication:View">
    <div class="business-workspace-page art-full-height flex min-w-0 flex-col gap-4">
      <BusinessWorkspaceHeader
        density="compact"
        eyebrow="TRAVEL LOANS"
        title="借款单"
        description="登记员工差旅借款、借款明细与收款账户。当前可录入和维护草稿。"
        icon="ri:hand-coin-line"
      >
        <template #actions><BusinessTableWorkspaceActions :table="tableRef" /></template>
      </BusinessWorkspaceHeader>
      <ArtTableQuery
        ref="tableRef"
        v-model="search"
        :search-items="searchItems"
        :api-fn="fetchTableData"
        :columns-factory="columnsFactory"
        :header-actions="headerActions"
        header-actions-placement="workspace"
        :search-bar-props="{ span: 6, labelWidth: 86 }"
        :table-props="{
          rowKey: 'id',
          tableLayout: 'fixed',
          emptyText: '暂无借款单',
          emptyDescription: '可新增借款草稿，录入费用明细与收款账户。'
        }"
        focusable
      >
        <template #search-applicantEmployeeId>
          <ArtEmployeeSelect
            :model-value="search.applicantEmployeeId || undefined"
            :tenant-id="effectiveTenantId || ''"
            :allow-all-tenant-read="isAllTenants"
            placeholder="选择借款人"
            @update:model-value="search.applicantEmployeeId = $event || ''"
          />
        </template>
      </ArtTableQuery>
      <TravelLoanDialog ref="dialogRef" @success="refreshTable" />
    </div>
  </ArtPermissionGuard>
</template>

<script setup lang="tsx">
  import { storeToRefs } from 'pinia'
  import type { ColumnOption } from '@/types'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type {
    ArtTableQueryExpose,
    ArtTableQueryHeaderAction
  } from '@/components/core/tables/art-table-query/index.vue'
  import ArtPermissionGuard from '@/components/core/feedback/art-permission-guard/index.vue'
  import ArtTableQuery from '@/components/core/tables/art-table-query/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import BusinessWorkspaceHeader from '@/components/business/business-workspace-header/index.vue'
  import BusinessTableWorkspaceActions from '@/components/business/business-table-workspace-actions/index.vue'
  import ArtEmployeeSelect from '@/components/business/art-employee-select/index.vue'
  import { useDictionaryOptions } from '@/hooks/core/useDictionaryOptions'
  import { useTenantScopeStore } from '@/store/modules/tenant-scope'
  import { buildSupabasePageRange } from '@/utils/supabase/pagination'
  import { formatCurrencyValue } from '@/utils/ui'
  import {
    fetchTravelLoanList,
    fetchTravelLoanItemList,
    type TravelLoan,
    type TravelLoanSearch,
    type TravelLoanItemRecord
  } from '@fms/api'
  import TravelLoanDialog from './modules/travel-loan-dialog.vue'

  defineOptions({ name: 'FinanceLoanApplication' })
  interface DialogExpose {
    handleOpen: (data?: { row?: TravelLoan }) => Promise<void>
  }
  type TableRecord = TravelLoan | TravelLoanItemRecord
  type LoanSearch = TravelLoanSearch & { displayMode: 'document' | 'line' }
  const tableRef = ref<ArtTableQueryExpose>()
  const dialogRef = ref<DialogExpose>()
  const { effectiveTenantId, isAllTenants } = storeToRefs(useTenantScopeStore())
  const statusOptions = useDictionaryOptions('fmsExpenseDocumentStatus')
  const displayModeOptions = useDictionaryOptions('commonDocumentDisplayMode')
  const search = ref<LoanSearch>({
    displayMode: 'document',
    applicationDateRange: [],
    applicantEmployeeId: '',
    status: '',
    keyword: ''
  })
  const searchItems = computed<SearchFormItem[]>(() => [
    {
      label: '展示方式',
      key: 'displayMode',
      type: 'radioGroup',
      options: displayModeOptions,
      props: { optionType: 'button', 'aria-label': '借款单列表展示方式' }
    },
    {
      label: '申请日期',
      key: 'applicationDateRange',
      type: 'date',
      props: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期'
      }
    },
    { label: '借款人', key: 'applicantEmployeeId', type: 'input' },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: { options: statusOptions, clearable: true }
    },
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { clearable: true, placeholder: '单据编号、借款人或事由' }
    }
  ])
  const headerActions = computed<ArtTableQueryHeaderAction[]>(() => [
    {
      type: 'add',
      permission: 'FinanceLoanApplication:Add',
      label: '新增借款单',
      onClick: () => dialogRef.value?.handleOpen()
    }
  ])
  async function fetchTableData(params: LoanSearch & { current: number; size: number }) {
    const range = buildSupabasePageRange(params)
    const { displayMode, ...filters } = params
    const query = { ...filters, ...range, tenantId: effectiveTenantId.value }
    const result =
      displayMode === 'line'
        ? await fetchTravelLoanItemList(query)
        : await fetchTravelLoanList(query)
    return { ...result, total: result.total ?? 0 }
  }
  const loanOf = (row: TableRecord): TravelLoan => ('loan' in row ? row.loan : row)
  const money = (value: number | null | undefined): string =>
    value == null ? '—' : formatCurrencyValue(value)
  const columnsFactory = (): ColumnOption<TableRecord>[] => {
    if (search.value.displayMode === 'line') {
      return [
        {
          prop: 'loanNo',
          label: '单据编号',
          minWidth: 175,
          fixed: 'left',
          formatter: (row) => loanOf(row).loanNo
        },
        {
          prop: 'applicantName',
          label: '借款人',
          minWidth: 120,
          formatter: (row) => loanOf(row).applicantName
        },
        {
          prop: 'lineNo',
          label: '明细',
          width: 70,
          formatter: (row) => ('lineNo' in row ? row.lineNo : '—')
        },
        {
          prop: 'expenseItem',
          label: '费用项目',
          minWidth: 145,
          formatter: (row) => ('expenseItem' in row ? row.expenseItem?.itemName || '—' : '—')
        },
        {
          prop: 'projectId',
          label: '项目',
          minWidth: 130,
          formatter: (row) =>
            'projectId' in row
              ? row.project?.projectName || (row.projectId ? '已关联项目' : '—')
              : '—'
        },
        { prop: 'purpose', label: '借款用途', minWidth: 190, showOverflowTooltip: true },
        {
          prop: 'amount',
          label: '借款金额（元）',
          width: 135,
          align: 'right',
          formatter: (row) => ('amount' in row ? money(row.amount) : '—')
        },
        {
          prop: 'status',
          label: '单据状态',
          width: 110,
          dict: {
            code: 'fmsExpenseDocumentStatus',
            display: 'tag',
            value: (row) => loanOf(row).status
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 86,
          fixed: 'right',
          formatter: (row) => (
            <ArtButtonTable
              type="edit"
              permission="FinanceLoanApplication:Edit"
              disabled={loanOf(row).status !== 'draft'}
              onClick={() => dialogRef.value?.handleOpen({ row: loanOf(row) })}
            />
          )
        }
      ]
    }
    return [
      {
        prop: 'loanNo',
        label: '单据编号',
        minWidth: 175,
        fixed: 'left',
        showOverflowTooltip: true
      },
      { prop: 'applicantName', label: '借款人', minWidth: 120 },
      { prop: 'applicationDate', label: '申请日期', width: 120 },
      { prop: 'reason', label: '事由', minWidth: 170, showOverflowTooltip: true },
      {
        prop: 'loanAmount',
        label: '借款金额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(loanOf(row).loanAmount)
      },
      {
        prop: 'approvedAmount',
        label: '核定金额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(loanOf(row).approvedAmount)
      },
      {
        prop: 'reimbursedAmount',
        label: '已报销金额（元）',
        width: 145,
        align: 'right',
        formatter: (row) => money(loanOf(row).reimbursedAmount)
      },
      {
        prop: 'pendingCollectionAmount',
        label: '待收款金额（元）',
        width: 145,
        align: 'right',
        formatter: (row) => money(loanOf(row).pendingCollectionAmount)
      },
      {
        prop: 'repaidAmount',
        label: '已还款金额（元）',
        width: 145,
        align: 'right',
        formatter: (row) => money(loanOf(row).repaidAmount)
      },
      {
        prop: 'remainingBalance',
        label: '未还余额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(loanOf(row).remainingBalance)
      },
      {
        prop: 'usedAmount',
        label: '已用金额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(loanOf(row).usedAmount)
      },
      {
        prop: 'paidAmount',
        label: '已付金额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(loanOf(row).paidAmount)
      },
      { prop: 'currentHandler', label: '当前处理人', minWidth: 125 },
      { prop: 'paymentDate', label: '付款日期', width: 125 },
      {
        prop: 'status',
        label: '单据状态',
        width: 110,
        dict: { code: 'fmsExpenseDocumentStatus', display: 'tag' }
      },
      { prop: 'rejectionOpinion', label: '反审核意见', minWidth: 150, showOverflowTooltip: true },
      { prop: 'expenseDepartmentName', label: '部门', minWidth: 140, showOverflowTooltip: true },
      { prop: 'remark', label: '备注', minWidth: 160, showOverflowTooltip: true },
      {
        prop: 'attachmentUrls',
        label: '附件',
        width: 75,
        formatter: (row) => `${loanOf(row).attachmentUrls?.length ?? 0} 个`
      },
      {
        prop: 'operation',
        label: '操作',
        width: 86,
        fixed: 'right',
        formatter: (row) => (
          <ArtButtonTable
            type="edit"
            permission="FinanceLoanApplication:Edit"
            disabled={loanOf(row).status !== 'draft'}
            onClick={() => dialogRef.value?.handleOpen({ row: loanOf(row) })}
          />
        )
      }
    ]
  }
  function refreshTable(): Promise<unknown> {
    return tableRef.value?.refreshData() ?? Promise.resolve()
  }
  watch(
    () => search.value.displayMode,
    () => void tableRef.value?.getData()
  )
</script>
