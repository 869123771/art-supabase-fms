<template>
  <ArtPermissionGuard permission="FinanceTravelApplication:View">
    <div class="business-workspace-page art-full-height flex min-w-0 flex-col gap-4">
      <BusinessWorkspaceHeader
        density="compact"
        eyebrow="TRAVEL APPLICATIONS"
        title="出差申请单"
        description="记录申请人与行程预算。当前支持草稿录入、查询和编辑；审批与差旅报销将在后续接入。"
        icon="ri:flight-takeoff-line"
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
          emptyText: '暂无出差申请',
          emptyDescription: '可新增草稿，填写申请人和行程信息。'
        }"
        focusable
      >
        <template #search-applicantEmployeeId>
          <ArtEmployeeSelect
            :model-value="search.applicantEmployeeId || undefined"
            :tenant-id="effectiveTenantId || ''"
            :allow-all-tenant-read="isAllTenants"
            placeholder="选择申请人"
            @update:model-value="search.applicantEmployeeId = $event || ''"
          />
        </template>
      </ArtTableQuery>
      <TravelApplicationDialog ref="dialogRef" @success="refreshTable" />
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
    fetchTravelApplicationList,
    fetchTravelItineraryList,
    type TravelApplication,
    type TravelApplicationSearch,
    type TravelLineRecord
  } from '@fms/api'
  import TravelApplicationDialog from './modules/travel-application-dialog.vue'

  defineOptions({ name: 'FinanceTravelApplication' })
  interface DialogExpose {
    handleOpen: (data?: { row?: TravelApplication }) => Promise<void>
  }
  type TableRecord = TravelApplication | TravelLineRecord
  type TravelSearch = TravelApplicationSearch & { displayMode: 'document' | 'line' }
  const tableRef = ref<ArtTableQueryExpose>()
  const dialogRef = ref<DialogExpose>()
  const { effectiveTenantId, isAllTenants } = storeToRefs(useTenantScopeStore())
  const statusOptions = useDictionaryOptions('fmsExpenseDocumentStatus')
  const displayModeOptions = useDictionaryOptions('commonDocumentDisplayMode')
  const search = ref<TravelSearch>({
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
      props: { optionType: 'button', 'aria-label': '出差申请列表展示方式' }
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
    { label: '申请人', key: 'applicantEmployeeId', type: 'input' },
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
      props: { placeholder: '单据编号、申请人或事由', clearable: true }
    }
  ])
  const headerActions = computed<ArtTableQueryHeaderAction[]>(() => [
    {
      type: 'add',
      permission: 'FinanceTravelApplication:Add',
      label: '新增出差申请',
      onClick: () => dialogRef.value?.handleOpen()
    }
  ])

  async function fetchTableData(params: TravelSearch & { current: number; size: number }) {
    const range = buildSupabasePageRange(params)
    const { displayMode, ...filters } = params
    const query = { ...filters, ...range, tenantId: effectiveTenantId.value }
    const result =
      displayMode === 'line'
        ? await fetchTravelItineraryList(query)
        : await fetchTravelApplicationList(query)
    return { ...result, total: result.total ?? 0 }
  }
  const applicationOf = (row: TableRecord): TravelApplication =>
    'application' in row ? row.application : row
  const money = (value: number | null | undefined): string =>
    value == null ? '—' : formatCurrencyValue(value)
  const columnsFactory = (): ColumnOption<TableRecord>[] => {
    if (search.value.displayMode === 'line') {
      return [
        {
          prop: 'applicationNo',
          label: '单据编号',
          minWidth: 170,
          fixed: 'left',
          formatter: (row) => applicationOf(row).applicationNo
        },
        {
          prop: 'applicantName',
          label: '申请人',
          minWidth: 120,
          formatter: (row) => applicationOf(row).applicantName
        },
        {
          prop: 'lineNo',
          label: '行程',
          width: 75,
          formatter: (row) => ('lineNo' in row ? row.lineNo : '—')
        },
        { prop: 'departurePlace', label: '出发地', minWidth: 135 },
        { prop: 'destinationPlace', label: '目的地', minWidth: 135 },
        { prop: 'startDate', label: '开始日期', width: 125 },
        { prop: 'endDate', label: '结束日期', width: 125 },
        {
          prop: 'expenseItem',
          label: '费用项目',
          minWidth: 140,
          formatter: (row) => ('expenseItem' in row ? row.expenseItem?.itemName || '—' : '—')
        },
        {
          prop: 'project',
          label: '项目',
          minWidth: 140,
          formatter: (row) =>
            'project' in row
              ? row.project?.projectName || (row.projectId ? '已关联项目' : '—')
              : '—'
        },
        {
          prop: 'requestedAmount',
          label: '申请金额',
          width: 125,
          align: 'right',
          formatter: (row) => money(row.requestedAmount)
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          dict: {
            code: 'fmsExpenseDocumentStatus',
            display: 'tag',
            value: (row) => applicationOf(row).status
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
              permission="FinanceTravelApplication:Edit"
              disabled={applicationOf(row).status !== 'draft'}
              onClick={() => dialogRef.value?.handleOpen({ row: applicationOf(row) })}
            />
          )
        }
      ]
    }
    return [
      {
        prop: 'applicationNo',
        label: '单据编号',
        minWidth: 175,
        fixed: 'left',
        showOverflowTooltip: true
      },
      { prop: 'applicantName', label: '申请人', minWidth: 115 },
      { prop: 'applicationDate', label: '申请日期', width: 120 },
      { prop: 'reason', label: '事由', minWidth: 180, showOverflowTooltip: true },
      {
        prop: 'requestedAmount',
        label: '申请金额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(row.requestedAmount)
      },
      {
        prop: 'loanAmount',
        label: '借款金额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(applicationOf(row).loanAmount)
      },
      {
        prop: 'approvedAmount',
        label: '核定金额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(applicationOf(row).approvedAmount)
      },
      {
        prop: 'pendingCollectionAmount',
        label: '待收款金额（元）',
        width: 145,
        align: 'right',
        formatter: (row) => money(applicationOf(row).pendingCollectionAmount)
      },
      {
        prop: 'repaidAmount',
        label: '已还款金额（元）',
        width: 145,
        align: 'right',
        formatter: (row) => money(applicationOf(row).repaidAmount)
      },
      {
        prop: 'remainingBalance',
        label: '未还余额（元）',
        width: 135,
        align: 'right',
        formatter: (row) => money(applicationOf(row).remainingBalance)
      },
      {
        prop: 'usedAmount',
        label: '已用金额（元）',
        width: 130,
        align: 'right',
        formatter: (row) => money(applicationOf(row).usedAmount)
      },
      {
        prop: 'paidAmount',
        label: '已付金额（元）',
        width: 130,
        align: 'right',
        formatter: (row) => money(applicationOf(row).paidAmount)
      },
      { prop: 'currentHandler', label: '当前处理人', minWidth: 130 },
      {
        prop: 'status',
        label: '单据状态',
        width: 110,
        dict: { code: 'fmsExpenseDocumentStatus', display: 'tag' }
      },
      { prop: 'rejectionOpinion', label: '反审核意见', minWidth: 150, showOverflowTooltip: true },
      { prop: 'expenseDepartmentName', label: '部门', minWidth: 135, showOverflowTooltip: true },
      { prop: 'remark', label: '备注', minWidth: 160, showOverflowTooltip: true },
      {
        prop: 'attachmentUrls',
        label: '附件',
        width: 75,
        formatter: (row) => `${applicationOf(row).attachmentUrls?.length ?? 0} 个`
      },
      {
        prop: 'operation',
        label: '操作',
        width: 86,
        fixed: 'right',
        formatter: (row) => (
          <ArtButtonTable
            type="edit"
            permission="FinanceTravelApplication:Edit"
            disabled={applicationOf(row).status !== 'draft'}
            onClick={() => dialogRef.value?.handleOpen({ row: applicationOf(row) })}
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
