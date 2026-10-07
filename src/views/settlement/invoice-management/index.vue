<template>
  <div class="business-workspace-page art-full-height">
    <BusinessWorkspaceHeader
      density="compact"
      eyebrow="INVOICE OPERATIONS"
      title="发票管理"
      description="统一管理销项与进项发票、业务关联、识别校验和状态流转，提升票据合规性。"
      icon="ri:receipt-line"
      :tags="[
        { label: '票据台账', type: 'primary' },
        { label: '合规校验', type: 'success' }
      ]"
      :metrics="metrics"
    >
      <template #actions>
        <BusinessTableWorkspaceActions :table="tableQueryRef" />
      </template>
    </BusinessWorkspaceHeader>

    <MasterDeleteProcessingNotice
      v-if="customerDeleteContext.active"
      :customer-id="customerDeleteContext.customerId"
      :customer-name="customerDeleteContext.customerName"
      action-hint="已定位到关联发票。草稿可直接删除；已复核、已开具或已作废发票属于财务历史，应保留并停用客户。"
    />

    <ArtTableQuery
      ref="tableQueryRef"
      v-model="table.searchQuery"
      :search-items="table.searchItems"
      :api-fn="fetchTableData"
      :columns-factory="columnsFactory"
      :header-actions="table.headerActions"
      header-actions-placement="workspace"
      :search-bar-props="{ span: 6, labelWidth: 86, showExpand: true }"
      :table-props="{
        rowKey: 'id',
        tableLayout: 'fixed',
        emptyText: '暂无发票记录',
        emptyDescription: '可新增或识别发票，或调整类型、状态、往来单位和日期后查询。'
      }"
      focusable
    />

    <InvoiceDialog ref="dialogRef" @success="handleSaveSuccess" />
    <InvoiceDetailDrawer ref="drawerRef" />
    <InvoiceComplianceAuditDrawer ref="auditDrawerRef" />
    <MasterDataDeleteGuard ref="deleteGuardRef" />
  </div>
</template>

<script setup lang="tsx">
  import type { ComputedRef, UnwrapNestedRefs } from 'vue'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type {
    ArtTableQueryExcelColumn,
    ArtTableQueryExpose,
    ArtTableQueryHeaderAction
  } from '@/components/core/tables/art-table-query/index.vue'
  import type { ColumnOption } from '@/types'
  import {
    deleteInvoice,
    exportInvoiceList,
    fetchCarrierOptions,
    fetchCustomerOptions,
    fetchInvoiceList,
    updateInvoiceStatus
  } from '@fms/api'
  import { useUserStore } from '@/store/modules/user'
  import { buildSupabasePageRange } from '@/utils/supabase/pagination'
  import { formatWithDayjs } from '@/utils/time'
  import {
    canViewField,
    getFieldAccess,
    mergeFieldAccessMaps,
    formatSensitiveNumberWithAffix
  } from '@/utils/field-permission'
  import { financePaths } from '@/router/business-paths'
  import { notifyFriendlyError, useArtFeedback } from '@/hooks/core/useArtFeedback'
  import { useAuth } from '@/hooks/core/useAuth'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import BusinessTableWorkspaceActions from '@/components/business/business-table-workspace-actions/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import MasterDataDeleteGuard from '@/components/business/master-data-delete-guard/index.vue'
  import { useRecordDeleteGuard } from '@/hooks/core/useRecordDeleteGuard'
  import MasterDeleteProcessingNotice from '@/components/business/master-delete-processing-notice/index.vue'
  import { useMasterDataDeleteProcessingContext } from '@/hooks/core/useMasterDataDeleteProcessing'
  import InvoiceDialog from './modules/invoice-dialog.vue'
  import InvoiceComplianceAuditDrawer from './modules/invoice-compliance-audit-drawer.vue'
  import InvoiceDetailDrawer from './modules/invoice-detail-drawer.vue'

  defineOptions({ name: 'FinanceInvoiceManagement' })

  type Invoice = Api.Fms.InvoiceRecord
  type InvoiceFieldKey = Api.Fms.InvoiceFieldKey
  type SearchParams = Api.Fms.InvoiceSearchParams
  type TableParams = SearchParams & Pick<Api.Common.PaginationParams, 'current' | 'size'>

  interface DialogExpose {
    handleOpen: (row?: Invoice) => Promise<void>
    handleOpenFromOcr: (
      result: Api.Fms.InvoiceOcrAnalyzeResponse,
      direction: Api.Fms.InvoiceDirection
    ) => Promise<void>
    handleOpenFromArtifact: (artifactId: string) => Promise<boolean>
  }

  interface DrawerExpose {
    handleOpen: (row: Invoice) => Promise<void>
  }

  interface AuditDrawerExpose {
    handleOpen: (data: { invoiceId: string; invoiceRecordNo: string }) => Promise<void>
  }

  interface TableGroup {
    searchQuery: SearchParams
    searchItems: ComputedRef<SearchFormItem[]>
    headerActions: ComputedRef<ArtTableQueryHeaderAction[]>
    customerOptions: Array<{ label: string; value: string }>
    carrierOptions: Array<{ label: string; value: string }>
  }

  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const { promptReason, confirmAction } = useArtFeedback()
  const { hasAuth } = useAuth()
  const route = useRoute()
  const customerDeleteContext = useMasterDataDeleteProcessingContext()
  const invoiceManagementPath = financePaths.invoiceManagement
  const tableQueryRef = ref<ArtTableQueryExpose>()
  const dialogRef = ref<DialogExpose>()
  const drawerRef = ref<DrawerExpose>()
  const { deleteGuardRef, inspectDeleteReferences } = useRecordDeleteGuard('tms_invoice', '发票')
  const auditDrawerRef = ref<AuditDrawerExpose>()
  const fieldAccess = ref<Api.Fms.InvoiceFieldAccessMap>({})
  const currentRows = ref<Invoice[]>([])
  const totalCount = ref(0)
  const metrics = computed<BusinessWorkspaceMetric[]>(() => [
    {
      key: 'total',
      label: '当前结果',
      value: totalCount.value,
      description: '随筛选条件更新',
      icon: 'ri:receipt-line'
    },
    {
      key: 'output',
      label: '本页销项',
      value: currentRows.value.filter((row) => row.direction === 'output').length,
      description: '开给客户的发票',
      icon: 'ri:arrow-right-up-line',
      tone: 'success'
    },
    {
      key: 'input',
      label: '本页进项',
      value: currentRows.value.filter((row) => row.direction === 'input').length,
      description: '承运商及费用发票',
      icon: 'ri:arrow-left-down-line',
      tone: 'info'
    },
    {
      key: 'review',
      label: '本页待复核',
      value: currentRows.value.filter((row) => row.status === 'pending_review').length,
      description: '需校验票面与业务',
      icon: 'ri:time-line',
      tone: 'warning'
    }
  ])
  let openedRouteArtifactId = ''

  const table: UnwrapNestedRefs<TableGroup> = reactive<TableGroup>({
    searchQuery: {
      direction: typeof route.query.direction === 'string' ? route.query.direction : '',
      status: typeof route.query.status === 'string' ? route.query.status : '',
      invoiceType: '',
      customerId: customerDeleteContext.value.customerId,
      carrierId: customerDeleteContext.value.carrierId,
      recordId: customerDeleteContext.value.recordId,
      issueDateRange: [],
      keyword: ''
    },
    searchItems: computed(() => [
      {
        label: '发票方向',
        key: 'direction',
        type: 'select',
        props: { options: getDictMap.value.tmsInvoiceDirection ?? [], clearable: true }
      },
      {
        label: '发票状态',
        key: 'status',
        type: 'select',
        props: { options: getDictMap.value.tmsInvoiceStatus ?? [], clearable: true }
      },
      {
        label: '发票类型',
        key: 'invoiceType',
        type: 'select',
        props: { options: getDictMap.value.tmsInvoiceType ?? [], clearable: true }
      },
      {
        label: '开票客户',
        key: 'customerId',
        type: 'select',
        props: { options: table.customerOptions, filterable: true, clearable: true }
      },
      {
        label: '来票承运商',
        key: 'carrierId',
        type: 'select',
        props: { options: table.carrierOptions, filterable: true, clearable: true }
      },
      {
        label: '开票日期',
        key: 'issueDateRange',
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
        props: { clearable: true, placeholder: '登记号、发票号码、往来单位或抬头' }
      }
    ]),
    headerActions: computed(() => [
      {
        permission: 'FinanceInvoiceManagement:Add',
        type: 'add',
        label: '登记发票',
        onClick: () => void dialogRef.value?.handleOpen()
      },
      {
        permission: 'FinanceInvoiceManagement:Export',
        type: 'export',
        exportFilename: 'TMS发票台账',
        exportSheetName: '发票台账',
        exportColumns: excelColumns.value,
        exportApi: ({ selectedIds, searchParams, maxRows }) =>
          exportInvoiceList({
            ...(searchParams as SearchParams),
            ids: selectedIds.map(String),
            maxRows
          })
      }
    ]),
    customerOptions: [],
    carrierOptions: []
  })

  const formatMoney = (value?: Api.Fms.SensitiveNumber): string => {
    return formatSensitiveNumberWithAffix(value, { prefix: '¥' })
  }

  const renderStatusActions = (row: Invoice) => {
    if (row.status === 'draft')
      return hasAuth('FinanceInvoiceManagement:Submit') ? (
        <ArtButtonTable
          type="sign"
          icon="ri:send-plane-line"
          label="提交复核"
          permission="FinanceInvoiceManagement:Submit"
          onClick={() => void handleStatusAction(row, 'submit')}
        />
      ) : null
    if (row.status === 'pending_review')
      return hasAuth('FinanceInvoiceManagement:Approve') ? (
        <ArtButtonTable
          type="sign"
          label="审核通过"
          permission="FinanceInvoiceManagement:Approve"
          onClick={() => void handleStatusAction(row, 'approve')}
        />
      ) : null
    return null
  }

  const getMoreActions = (row: Invoice): ButtonMoreItem[] => {
    if (row.status === 'draft')
      return [
        {
          key: 'edit',
          auth: 'FinanceInvoiceManagement:Edit',
          label: '编辑发票',
          icon: 'ri:pencil-line'
        },
        {
          key: 'delete',
          auth: 'FinanceInvoiceManagement:Delete',
          label: '删除草稿',
          icon: 'ri:delete-bin-line',
          color: 'var(--el-color-danger)'
        }
      ]
    if (row.status === 'pending_review')
      return [
        {
          key: 'reject',
          auth: 'FinanceInvoiceManagement:Reject',
          label: '驳回复核',
          icon: 'ri:arrow-go-back-line',
          color: 'var(--el-color-danger)'
        }
      ]
    if (row.status === 'issued' || row.status === 'certified')
      return [
        {
          key: 'void',
          auth: 'FinanceInvoiceManagement:Void',
          label: '作废发票',
          icon: 'ri:close-circle-line',
          color: 'var(--el-color-danger)'
        }
      ]
    return []
  }

  const handleMoreAction = (item: ButtonMoreItem, row: Invoice): void => {
    if (item.key === 'edit') void dialogRef.value?.handleOpen(row)
    if (item.key === 'delete') void handleDelete(row)
    if (item.key === 'reject') void handleRemarkAction(row, 'reject')
    if (item.key === 'void') void handleRemarkAction(row, 'void')
  }

  const columnsFactory = (): ColumnOption<Invoice>[] => [
    { type: 'selection', width: 50, fixed: 'left', reserveSelection: true },
    {
      prop: 'invoiceRecordNo',
      label: '发票',
      minWidth: 205,
      formatter: (row) => (
        <div
          class="min-w-0 py-1"
          title={`${row.invoiceRecordNo} · ${row.invoiceNo || '暂无票号'} · 登记 ${formatWithDayjs(row.createTime, 'YYYY-MM-DD HH:mm')}`}
        >
          <strong class="block truncate text-sm font-semibold text-[var(--el-text-color-primary)]">
            {row.invoiceNo || row.invoiceRecordNo}
          </strong>
          <small class="block truncate text-xs text-[var(--el-text-color-secondary)]">
            {row.invoiceRecordNo}
          </small>
          <small class="block truncate text-xs text-[var(--el-text-color-secondary)]">
            登记 {formatWithDayjs(row.createTime, 'YYYY-MM-DD HH:mm')}
          </small>
        </div>
      )
    },
    {
      prop: 'counterpartyNameSnapshot',
      label: '往来单位',
      minWidth: 160,
      formatter: (row) => (
        <div
          class="min-w-0 py-1"
          title={`${row.counterpartyNameSnapshot || '--'} · 开票 ${row.issueDate}`}
        >
          <strong class="block truncate text-sm font-medium text-[var(--el-text-color-primary)]">
            {row.counterpartyNameSnapshot || '--'}
          </strong>
          <small class="block truncate text-xs text-[var(--el-text-color-secondary)]">
            开票 {row.issueDate}
          </small>
        </div>
      )
    },
    {
      prop: 'direction',
      label: '方向 / 类型',
      width: 150,
      formatter: (row) => (
        <div class="min-w-0 py-1">
          <ArtDictDisplay dictCode="tmsInvoiceDirection" value={row.direction} display="tag" />
          <small class="block truncate text-xs text-[var(--el-text-color-secondary)]">
            <ArtDictDisplay dictCode="tmsInvoiceType" value={row.invoiceType} display="text" />
          </small>
        </div>
      )
    },
    ...(canViewListField('invoiceAmounts')
      ? [
          {
            prop: 'totalAmount',
            label: '价税合计',
            width: 125,
            align: 'right' as const,
            formatter: (row: Invoice) => formatMoney(row.totalAmount)
          },
          {
            prop: 'unlinkedAmount',
            label: '对账关联',
            width: 150,
            align: 'right' as const,
            formatter: (row: Invoice) => (
              <div
                class="py-1 text-right leading-5"
                title={`已关联 ${formatMoney(row.linkedAmount)} · 未关联 ${formatMoney(row.unlinkedAmount)}`}
              >
                <small class="block text-xs text-[var(--el-text-color-secondary)]">
                  已关联 {formatMoney(row.linkedAmount)}
                </small>
                <strong class="block text-sm font-semibold text-[var(--el-text-color-primary)]">
                  未关联 {formatMoney(row.unlinkedAmount)}
                </strong>
              </div>
            )
          }
        ]
      : []),
    {
      prop: 'status',
      label: '状态',
      width: 100,
      dict: { code: 'tmsInvoiceStatus', display: 'tag' }
    },
    {
      prop: 'operation',
      label: '操作',
      width: 160,
      fixed: 'right',
      formatter: (row) => (
        <BusinessTableRowActions>
          {hasAuth('FinanceInvoiceManagement:View') ? (
            <ArtButtonTable
              type="view"
              permission="FinanceInvoiceManagement:View"
              onClick={() => void drawerRef.value?.handleOpen(row)}
            />
          ) : null}
          {row.status !== 'voided' &&
          hasAuth('FinanceInvoiceManagement:AiAudit') &&
          canAuditInvoice(row) ? (
            <ArtButtonTable
              type="view"
              icon="ri:sparkling-2-line"
              label="AI 审核"
              permission="FinanceInvoiceManagement:AiAudit"
              onClick={() =>
                void auditDrawerRef.value?.handleOpen({
                  invoiceId: row.id,
                  invoiceRecordNo: row.invoiceNo || row.invoiceRecordNo
                })
              }
            />
          ) : null}
          {renderStatusActions(row)}
          <ArtButtonMore
            trigger="click"
            list={() => getMoreActions(row)}
            onClick={(item: ButtonMoreItem) => handleMoreAction(item, row)}
          />
        </BusinessTableRowActions>
      )
    }
  ]

  const excelColumns = computed<ArtTableQueryExcelColumn[]>(() => [
    { key: 'invoiceRecordNo', title: '登记单号' },
    { key: 'invoiceNo', title: '发票号码' },
    { key: 'direction', title: '方向' },
    { key: 'invoiceType', title: '发票类型' },
    { key: 'counterpartyNameSnapshot', title: '往来单位' },
    { key: 'invoiceTitle', title: '发票抬头' },
    ...(canViewListField('taxIdentity') ? [{ key: 'taxNumber', title: '税号' }] : []),
    { key: 'issueDate', title: '开票日期' },
    ...(canViewListField('invoiceAmounts')
      ? [
          { key: 'amountExcludingTax', title: '不含税金额' },
          { key: 'taxAmount', title: '税额' },
          { key: 'totalAmount', title: '价税合计' },
          { key: 'linkedAmount', title: '已关联对账金额' },
          { key: 'unlinkedAmount', title: '未关联金额' }
        ]
      : []),
    { key: 'status', title: '状态' }
  ])

  async function fetchTableData(params: TableParams) {
    const { from, to } = buildSupabasePageRange({ current: params.current, size: params.size })
    const result = await fetchInvoiceList({ ...params, from, to })
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

  const canViewListField = (field: InvoiceFieldKey): boolean =>
    canViewField(
      mergeFieldAccessMaps(fieldAccess.value, ...currentRows.value.map((row) => row.fieldAccess)),
      field
    )

  const getSensitiveColumnVisibility = (): string =>
    `${canViewListField('invoiceAmounts')}:${canViewListField('taxIdentity')}`

  const canAuditInvoice = (row: Invoice): boolean =>
    isReadableAccess(getFieldAccess(row.fieldAccess, 'invoiceAmounts')) &&
    isReadableAccess(getFieldAccess(row.fieldAccess, 'taxIdentity')) &&
    isReadableAccess(getFieldAccess(row.fieldAccess, 'invoiceAttachments'))

  const isReadableAccess = (access: Api.Common.FieldAccessLevel): boolean =>
    access === 'read' || access === 'edit'

  async function handleStatusAction(row: Invoice, statusAction: Api.Fms.InvoiceStatusAction) {
    const label = statusAction === 'submit' ? '提交复核' : '审核通过'
    try {
      await confirmAction(`确定${label}发票 ${row.invoiceNo || row.invoiceRecordNo} 吗？`, label, {
        type: 'warning'
      })
      await updateInvoiceStatus({
        id: row.id,
        action: statusAction,
        businessTitle: `发票 ${row.invoiceNo || row.invoiceRecordNo}`
      })
      await tableQueryRef.value?.refreshUpdate()
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        notifyFriendlyError(error, `${label}失败，请检查审批流程与发票状态后重试`)
      }
    }
  }

  async function handleRemarkAction(
    row: Invoice,
    statusAction: Extract<Api.Fms.InvoiceStatusAction, 'reject' | 'void'>
  ) {
    const label = statusAction === 'reject' ? '驳回发票' : '作废发票'
    try {
      const reason = await promptReason(`请填写${label}原因`, label, {
        confirmButtonText: statusAction === 'reject' ? '确认驳回' : '确认作废',
        placeholder: `请填写${label}原因`
      })
      await updateInvoiceStatus({
        id: row.id,
        action: statusAction,
        remark: reason,
        businessTitle: `发票 ${row.invoiceNo || row.invoiceRecordNo}`
      })
      await tableQueryRef.value?.refreshUpdate()
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        notifyFriendlyError(error, `${label}失败，请刷新发票状态后重试`)
      }
    }
  }

  async function handleDelete(row: Invoice) {
    const resources = [{ id: row.id, label: row.invoiceNo || row.invoiceRecordNo }]
    try {
      if (await inspectDeleteReferences(resources)) return
      await confirmAction('仅草稿发票可以删除，删除后无法恢复。', '删除发票', {
        type: 'warning'
      })
    } catch {
      return
    }
    try {
      await deleteInvoice(row.id)
      await tableQueryRef.value?.refreshRemove()
    } catch {
      await inspectDeleteReferences(resources)
    }
  }

  async function loadCounterpartyOptions() {
    const [customerResponse, carrierResponse] = await Promise.all([
      fetchCustomerOptions(),
      fetchCarrierOptions()
    ])
    table.customerOptions = (customerResponse.data ?? []).map((item) => ({
      label: item.customerName,
      value: item.id
    }))
    table.carrierOptions = (carrierResponse.data ?? []).map((item) => ({
      label: item.companyName,
      value: item.id
    }))
  }

  function handleSaveSuccess() {
    void tableQueryRef.value?.refreshCreate()
  }

  function getRouteArtifactId(): string {
    return typeof route.query.aiArtifactId === 'string' ? route.query.aiArtifactId : ''
  }

  function isCurrentRecognitionRoute(artifactId: string): boolean {
    return route.path === invoiceManagementPath && getRouteArtifactId() === artifactId
  }

  async function restoreRecognitionDraft(artifactId: string): Promise<void> {
    openedRouteArtifactId = artifactId
    await nextTick()
    if (!isCurrentRecognitionRoute(artifactId)) return
    const restored = await dialogRef.value?.handleOpenFromArtifact(artifactId)
    if (!restored && isCurrentRecognitionRoute(artifactId)) openedRouteArtifactId = ''
  }

  function syncRecognitionRouteContext(): void {
    if (route.path !== invoiceManagementPath) {
      openedRouteArtifactId = ''
      return
    }

    const artifactId = getRouteArtifactId()
    if (!artifactId || artifactId === openedRouteArtifactId) return
    void restoreRecognitionDraft(artifactId)
  }

  function syncCustomerDeleteRoute(forceRefresh = false): void {
    const context = customerDeleteContext.value
    const customerId = context.active ? context.customerId : ''
    const carrierId = context.active ? context.carrierId : ''
    const recordId = context.active ? context.recordId : ''
    const changed =
      table.searchQuery.customerId !== customerId ||
      table.searchQuery.carrierId !== carrierId ||
      table.searchQuery.recordId !== recordId
    Object.assign(table.searchQuery, {
      customerId,
      carrierId,
      recordId
    })
    if (context.active || changed) {
      Object.assign(table.searchQuery, {
        direction: '',
        status: '',
        invoiceType: '',
        issueDateRange: [],
        keyword: ''
      })
    }
    if (changed || forceRefresh) {
      void nextTick().then(() => tableQueryRef.value?.refreshCreate())
    }
  }

  watch(
    () => route.fullPath,
    () => {
      syncRecognitionRouteContext()
      syncCustomerDeleteRoute()
    },
    { flush: 'post' }
  )

  watch(
    () => [route.query.direction, route.query.status] as const,
    ([direction, status]) => {
      let changed = false
      if (typeof direction === 'string' && table.searchQuery.direction !== direction) {
        table.searchQuery.direction = direction
        changed = true
      }
      if (typeof status === 'string' && table.searchQuery.status !== status) {
        table.searchQuery.status = status
        changed = true
      }
      if (changed) void tableQueryRef.value?.getData()
    }
  )

  onActivated(() => {
    syncRecognitionRouteContext()
    syncCustomerDeleteRoute(true)
  })

  onMounted(() => {
    void Promise.allSettled([
      userStore.ensureDictLoaded('tmsInvoiceDirection'),
      userStore.ensureDictLoaded('tmsInvoiceType'),
      userStore.ensureDictLoaded('tmsInvoiceStatus')
    ])
    void loadCounterpartyOptions()
    syncRecognitionRouteContext()
  })
</script>
