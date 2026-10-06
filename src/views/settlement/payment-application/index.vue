<template>
  <div class="business-workspace-page art-full-height">
    <MasterDeleteProcessingNotice
      v-if="deleteContext.active"
      :customer-id="deleteContext.customerId"
      :customer-name="deleteContext.customerName"
      action-hint="已自动定位付款申请；请按审批和财务规则处理后返回。"
    />
    <BusinessWorkspaceHeader
      density="compact"
      eyebrow="PAYMENT APPROVAL"
      title="付款申请"
      description="管理承运商付款申请、审核流转与执行结果，保障付款依据、金额和状态一致。"
      icon="ri:secure-payment-line"
      :tags="[
        { label: '付款审批', type: 'primary' },
        { label: '执行可追踪', type: 'warning' }
      ]"
      :metrics="metrics"
    >
      <template #actions>
        <BusinessTableWorkspaceActions :table="tableQueryRef" />
      </template>
    </BusinessWorkspaceHeader>

    <ArtTableQuery
      ref="tableQueryRef"
      v-model="table.searchQuery"
      :search-items="table.searchItems"
      :api-fn="fetchTableData"
      :columns-factory="columnsFactory"
      :header-actions="table.headerActions"
      header-actions-placement="workspace"
      :search-bar-props="{ span: 6, labelWidth: 92, isExpand: true, showExpand: false }"
      :table-props="{
        rowKey: 'id',
        tableLayout: 'fixed',
        emptyText: '暂无付款申请',
        emptyDescription: '先完成承运商对账审核确认，再新建付款申请；已有申请可调整筛选条件查询。'
      }"
      focusable
    />

    <PaymentApplicationDialog ref="dialogRef" @success="handleSaveSuccess" />
    <PaymentApplicationExecuteDialog ref="executeDialogRef" @success="handleExecuteSuccess" />
    <PaymentApplicationDetailDrawer ref="drawerRef" />
    <MasterDataDeleteGuard ref="deleteGuardRef" />
  </div>
</template>

<script setup lang="tsx">
  import { ElMessage } from 'element-plus'
  import type { ComputedRef, UnwrapNestedRefs } from 'vue'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type {
    ArtTableQueryExcelColumn,
    ArtTableQueryExpose,
    ArtTableQueryHeaderAction
  } from '@/components/core/tables/art-table-query/index.vue'
  import type { ColumnOption } from '@/types'
  import {
    cancelCarrierPaymentApplication,
    deleteCarrierPaymentApplication,
    exportCarrierPaymentApplicationList,
    fetchCarrierOptions,
    fetchCarrierPaymentApplicationList,
    submitCarrierPaymentApplication
  } from '@fms/api'
  import { useUserStore } from '@/store/modules/user'
  import { buildSupabasePageRange } from '@/utils/supabase/pagination'
  import { formatWithDayjs } from '@/utils/time'
  import { financeRouteNames } from '@/router/business-paths'
  import {
    canViewField,
    getFieldAccess,
    mergeFieldAccessMaps,
    formatSensitiveNumberWithAffix
  } from '@/utils/field-permission'
  import { useArtFeedback } from '@/hooks/core/useArtFeedback'
  import { useAuth } from '@/hooks/core/useAuth'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import BusinessTableWorkspaceActions from '@/components/business/business-table-workspace-actions/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import MasterDataDeleteGuard from '@/components/business/master-data-delete-guard/index.vue'
  import { useRecordDeleteGuard } from '@/hooks/core/useRecordDeleteGuard'
  import PaymentApplicationDialog from './modules/payment-application-dialog.vue'
  import PaymentApplicationExecuteDialog from './modules/payment-application-execute-dialog.vue'
  import PaymentApplicationDetailDrawer from './modules/payment-application-detail-drawer.vue'
  import { useMasterDataDeleteProcessingContext } from '@/hooks/core/useMasterDataDeleteProcessing'
  import MasterDeleteProcessingNotice from '@/components/business/master-delete-processing-notice/index.vue'

  defineOptions({ name: 'FinanceCarrierPaymentApplication' })

  type Application = Api.Fms.CarrierPaymentApplicationRecord
  type ApplicationFieldKey = Api.Fms.CarrierPaymentApplicationFieldKey
  type SearchParams = Api.Fms.CarrierPaymentApplicationSearchParams
  type TableParams = SearchParams & Pick<Api.Common.PaginationParams, 'current' | 'size'>

  interface DialogExpose {
    handleOpen: (row?: Application) => Promise<void>
  }

  interface ExecuteDialogExpose {
    handleOpen: (row: Application) => Promise<void>
  }

  interface DrawerExpose {
    handleOpen: (row: Application) => Promise<void>
  }

  interface TableGroup {
    searchQuery: SearchParams
    searchItems: ComputedRef<SearchFormItem[]>
    headerActions: ComputedRef<ArtTableQueryHeaderAction[]>
    carrierOptions: Array<{ label: string; value: string }>
  }

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const { confirmAction, confirmDelete, promptReason } = useArtFeedback()
  const { hasAuth } = useAuth()
  const deleteContext = useMasterDataDeleteProcessingContext()
  const tableQueryRef = ref<ArtTableQueryExpose>()
  const dialogRef = ref<DialogExpose>()
  const executeDialogRef = ref<ExecuteDialogExpose>()
  const drawerRef = ref<DrawerExpose>()
  const { deleteGuardRef, inspectDeleteReferences } = useRecordDeleteGuard(
    'tms_carrier_payment_application',
    '付款申请'
  )
  const fieldAccess = ref<Api.Fms.CarrierPaymentApplicationFieldAccessMap>({})
  const currentRows = ref<Application[]>([])
  const totalCount = ref(0)
  const metrics = computed<BusinessWorkspaceMetric[]>(() => [
    {
      key: 'total',
      label: '当前结果',
      value: totalCount.value,
      description: '随筛选条件更新',
      icon: 'ri:file-list-3-line'
    },
    {
      key: 'review',
      label: '本页待审批',
      value: currentRows.value.filter((row) => row.status === 'pending_review').length,
      description: '待核对付款依据',
      icon: 'ri:time-line',
      tone: 'warning'
    },
    {
      key: 'approved',
      label: '本页待付款',
      value: currentRows.value.filter((row) => row.status === 'approved').length,
      description: '审批通过未执行',
      icon: 'ri:bank-card-line',
      tone: 'info'
    },
    {
      key: 'paid',
      label: '本页已付款',
      value: currentRows.value.filter((row) => row.status === 'paid').length,
      description: '可查看付款流水',
      icon: 'ri:checkbox-circle-line',
      tone: 'success'
    }
  ])

  const table: UnwrapNestedRefs<TableGroup> = reactive<TableGroup>({
    searchQuery: {
      carrierId: deleteContext.value.carrierId,
      recordId: deleteContext.value.recordId,
      status: typeof route.query.status === 'string' ? route.query.status : '',
      plannedPaymentDateRange: [],
      keyword: ''
    },
    carrierOptions: [],
    searchItems: computed<SearchFormItem[]>(() => [
      {
        label: '付款承运商',
        key: 'carrierId',
        type: 'select',
        props: {
          options: table.carrierOptions,
          filterable: true,
          clearable: true,
          placeholder: '请选择承运商'
        }
      },
      {
        label: '申请状态',
        key: 'status',
        type: 'select',
        props: {
          options: getDictMap.value.tmsCarrierPaymentApplicationStatus ?? [],
          clearable: true
        }
      },
      {
        label: '计划付款日',
        key: 'plannedPaymentDateRange',
        type: 'date',
        props: {
          type: 'daterange',
          valueFormat: 'YYYY-MM-DD',
          startPlaceholder: '开始日期',
          endPlaceholder: '结束日期',
          rangeSeparator: '至'
        }
      },
      {
        label: '关键词',
        key: 'keyword',
        type: 'input',
        props: {
          clearable: true,
          placeholder: '申请单号、承运商、对账单或付款流水'
        }
      }
    ]),
    headerActions: computed<ArtTableQueryHeaderAction[]>(() => [
      {
        permission: 'FinanceCarrierPaymentApplication:Add',
        type: 'add',
        label: '新建付款申请',
        onClick: () => void dialogRef.value?.handleOpen()
      },
      {
        permission: 'FinanceCarrierPaymentApplication:Export',
        type: 'export',
        exportFilename: 'TMS承运商付款申请',
        exportSheetName: '承运商付款申请',
        exportColumns: excelColumns.value,
        exportApi: ({ selectedIds, searchParams, maxRows }) =>
          exportCarrierPaymentApplicationList({
            ...(searchParams as SearchParams),
            ids: selectedIds.map(String),
            maxRows
          })
      }
    ])
  })

  const formatMoney = (value?: Api.Fms.SensitiveNumber): string => {
    return formatSensitiveNumberWithAffix(value, { prefix: '¥' })
  }

  const columnsFactory = (): ColumnOption<Application>[] => [
    { type: 'selection', width: 50, fixed: 'left', reserveSelection: true },
    {
      prop: 'applicationNo',
      label: '付款申请',
      minWidth: 210,
      formatter: (row) => (
        <div
          class="min-w-0 py-1"
          title={`${row.applicationNo} · ${formatWithDayjs(row.createTime, 'YYYY-MM-DD HH:mm')}${row.paidTransactionNo ? ` · 付款 ${row.paidTransactionNo}` : ''}`}
        >
          <strong class="block truncate text-sm font-semibold text-[var(--el-text-color-primary)]">
            {row.applicationNo}
          </strong>
          <small class="block truncate text-xs text-[var(--el-text-color-secondary)]">
            创建 {formatWithDayjs(row.createTime, 'YYYY-MM-DD HH:mm')}
          </small>
          {row.paidTransactionNo ? (
            <small class="block truncate text-xs text-[var(--el-text-color-secondary)]">
              付款 {row.paidTransactionNo}
            </small>
          ) : null}
        </div>
      )
    },
    {
      prop: 'carrierName',
      label: '付款承运商',
      minWidth: 180,
      formatter: (row) => (
        <div class="min-w-0 py-1" title={`${row.carrierName} · ${row.statementCount} 份对账单`}>
          <strong class="block truncate text-sm font-medium text-[var(--el-text-color-primary)]">
            {row.carrierName}
          </strong>
          <small class="block truncate text-xs text-[var(--el-text-color-secondary)]">
            {row.statementCount} 份对账单
          </small>
        </div>
      )
    },
    ...(canViewListField('applicationAmounts')
      ? [
          {
            prop: 'amount',
            label: '申请金额',
            width: 135,
            align: 'right' as const,
            formatter: (row: Application) => formatMoney(row.amount)
          }
        ]
      : []),
    {
      prop: 'plannedPaymentDate',
      label: '计划付款日',
      width: 120
    },
    {
      prop: 'paymentMethod',
      label: '付款方式',
      width: 115,
      dict: { code: 'tmsCashPaymentMethod', display: 'text' }
    },
    {
      prop: 'status',
      label: '申请状态',
      width: 130,
      dict: { code: 'tmsCarrierPaymentApplicationStatus', display: 'tag' }
    },
    {
      prop: 'operation',
      label: '操作',
      width: 160,
      fixed: 'right',
      formatter: (row) => (
        <BusinessTableRowActions>
          {hasAuth('FinanceCarrierPaymentApplication:View') ? (
            <ArtButtonTable
              type="view"
              permission="FinanceCarrierPaymentApplication:View"
              onClick={() => void drawerRef.value?.handleOpen(row)}
            />
          ) : null}
          {['draft', 'rejected'].includes(row.status) &&
          hasAuth('FinanceCarrierPaymentApplication:Submit') ? (
            <ArtButtonTable
              type="sign"
              icon="ri:send-plane-line"
              label="提交审批"
              permission="FinanceCarrierPaymentApplication:Submit"
              onClick={() => void handleSubmit(row)}
            />
          ) : null}
          {row.status === 'pending_review' &&
            hasAuth('FinanceCarrierPaymentApplication:ViewApproval') && (
              <ArtButtonTable
                type="view"
                icon="ri:shield-check-line"
                label="查看审批"
                permission="FinanceCarrierPaymentApplication:ViewApproval"
                onClick={() => void openApprovalCenter()}
              />
            )}
          {row.status === 'approved' && hasAuth('FinanceCarrierPaymentApplication:Execute') ? (
            <ArtButtonTable
              type="sign"
              icon="ri:bank-card-line"
              label="付款登记"
              permission="FinanceCarrierPaymentApplication:Execute"
              onClick={() => void handleExecute(row)}
            />
          ) : null}
          {row.status === 'paid' && row.paidTransactionNo && (
            <ArtButtonTable
              type="view"
              icon="ri:bank-card-line"
              label="查看付款"
              permission=""
              onClick={() => void openCashTransaction(row)}
            />
          )}
          <ArtButtonMore
            trigger="click"
            list={() => getMoreActions(row)}
            onClick={(item: ButtonMoreItem) => handleMoreAction(item, row)}
          />
        </BusinessTableRowActions>
      )
    }
  ]

  const getMoreActions = (row: Application): ButtonMoreItem[] => {
    if (['draft', 'rejected'].includes(row.status))
      return [
        {
          key: 'edit',
          auth: 'FinanceCarrierPaymentApplication:Edit',
          label: '编辑申请',
          icon: 'ri:pencil-line'
        },
        {
          key: 'delete',
          auth: 'FinanceCarrierPaymentApplication:Delete',
          label: '删除申请',
          icon: 'ri:delete-bin-line',
          color: 'var(--el-color-danger)'
        }
      ]
    if (row.status === 'approved')
      return [
        {
          key: 'cancel',
          auth: 'FinanceCarrierPaymentApplication:Cancel',
          label: '取消申请',
          icon: 'ri:close-circle-line',
          color: 'var(--el-color-danger)'
        }
      ]
    return []
  }

  const handleMoreAction = (item: ButtonMoreItem, row: Application): void => {
    if (item.key === 'edit') void dialogRef.value?.handleOpen(row)
    if (item.key === 'delete') void handleDelete(row)
    if (item.key === 'cancel') void handleCancel(row)
  }

  const excelColumns = computed<ArtTableQueryExcelColumn[]>(() => [
    { key: 'applicationNo', title: '付款申请单号' },
    { key: 'carrierName', title: '付款承运商' },
    { key: 'plannedPaymentDate', title: '计划付款日期' },
    ...(canViewListField('applicationAmounts') ? [{ key: 'amount', title: '申请金额' }] : []),
    { key: 'statementCount', title: '对账单数' },
    { key: 'statementNos', title: '关联对账单' },
    { key: 'paymentMethod', title: '付款方式' },
    { key: 'status', title: '申请状态' },
    { key: 'paidTransactionNo', title: '付款流水号' },
    { key: 'createBy', title: '申请人' },
    { key: 'createTime', title: '创建时间' }
  ])

  async function fetchTableData(params: TableParams) {
    const { from, to } = buildSupabasePageRange({ current: params.current, size: params.size })
    const result = await fetchCarrierPaymentApplicationList({ ...params, from, to })
    const previousVisibility = getSensitiveColumnVisibility()
    fieldAccess.value = result.fieldAccess
    currentRows.value = result.data
    totalCount.value = result.total
    if (previousVisibility !== getSensitiveColumnVisibility()) {
      await nextTick()
      tableQueryRef.value?.resetColumns()
    }
    return result
  }

  const canViewListField = (field: ApplicationFieldKey): boolean =>
    canViewField(
      mergeFieldAccessMaps(fieldAccess.value, ...currentRows.value.map((row) => row.fieldAccess)),
      field
    )

  const getSensitiveColumnVisibility = (): string => `${canViewListField('applicationAmounts')}`

  const isReadableAccess = (access: Api.Common.FieldAccessLevel): boolean =>
    access === 'read' || access === 'edit'

  async function handleSubmit(row: Application): Promise<void> {
    if (!isReadableAccess(getFieldAccess(row.fieldAccess, 'applicationAmounts'))) {
      ElMessage.warning('当前字段权限不允许读取付款申请金额，无法提交审批')
      return
    }
    try {
      await confirmAction(
        `提交后将占用 ${formatMoney(row.amount)} 可付款额度，并进入审批流程。`,
        '提交付款审批',
        { confirmButtonText: '提交审批', type: 'warning' }
      )
      await submitCarrierPaymentApplication(row)
      await tableQueryRef.value?.refreshUpdate()
    } catch {
      // 用户取消或提交失败时保持当前列表状态。
    }
  }

  function handleExecute(row: Application): void {
    if (!isReadableAccess(getFieldAccess(row.fieldAccess, 'applicationAmounts'))) {
      ElMessage.warning('当前字段权限不允许读取付款申请金额，无法登记付款')
      return
    }
    void executeDialogRef.value?.handleOpen(row)
  }

  async function handleDelete(row: Application): Promise<void> {
    const resources = [{ id: row.id, label: row.applicationNo }]
    try {
      if (await inspectDeleteReferences(resources)) return
      await confirmDelete(`确定删除付款申请 ${row.applicationNo} 吗？删除后无法恢复。`)
    } catch {
      return
    }
    try {
      await deleteCarrierPaymentApplication(row.id)
      await tableQueryRef.value?.refreshRemove()
    } catch {
      await inspectDeleteReferences(resources)
    }
  }

  async function handleCancel(row: Application): Promise<void> {
    try {
      const reason = await promptReason(
        '取消后将释放已占用的可付款额度，且不能再执行本申请。',
        '取消付款申请',
        {
          confirmButtonText: '确认取消',
          placeholder: '请填写取消原因',
          emptyMessage: '取消原因不能为空'
        }
      )
      await cancelCarrierPaymentApplication(row.id, reason)
      await tableQueryRef.value?.refreshUpdate()
    } catch {
      // 用户取消时无需提示。
    }
  }

  function openApprovalCenter(): void {
    void router.push({ name: 'WorkflowWorkbench' })
  }

  function openCashTransaction(row: Application): void {
    void router.push({
      name: financeRouteNames.cashTransaction,
      query: { direction: 'payment', keyword: row.paidTransactionNo ?? '' }
    })
  }

  function handleSaveSuccess(): void {
    void tableQueryRef.value?.refreshCreate()
  }

  function handleExecuteSuccess(): void {
    void tableQueryRef.value?.refreshUpdate()
  }

  async function loadCarrierOptions(): Promise<void> {
    const { data } = await fetchCarrierOptions()
    table.carrierOptions = (data ?? []).map((item) => ({
      label: item.companyName,
      value: item.id
    }))
  }

  function syncMasterDeleteRoute(forceRefresh = false): void {
    const context = deleteContext.value
    const carrierId = context.active ? context.carrierId : ''
    const recordId = context.active ? context.recordId : ''
    const changed =
      table.searchQuery.carrierId !== carrierId || table.searchQuery.recordId !== recordId
    Object.assign(table.searchQuery, {
      carrierId,
      recordId
    })
    if (context.active || changed) {
      Object.assign(table.searchQuery, {
        status: '',
        plannedPaymentDateRange: [],
        keyword: ''
      })
    }
    if (changed || forceRefresh) void nextTick().then(() => tableQueryRef.value?.refreshCreate())
  }

  watch(
    () => route.fullPath,
    () => syncMasterDeleteRoute(),
    { flush: 'post' }
  )

  watch(
    () => route.query.status,
    (value) => {
      if (typeof value !== 'string' || table.searchQuery.status === value) return
      table.searchQuery.status = value
      void tableQueryRef.value?.getData()
    }
  )
  onActivated(() => syncMasterDeleteRoute(true))

  onMounted(() => {
    void Promise.allSettled([
      userStore.ensureDictLoaded('tmsCashPaymentMethod'),
      userStore.ensureDictLoaded('tmsCarrierPaymentApplicationStatus')
    ])
    void loadCarrierOptions()
  })
</script>
