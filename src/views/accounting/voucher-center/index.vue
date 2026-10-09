<template>
  <FinanceAccountingWorkspaceShell class="voucher-center-page">
    <BusinessWorkspaceHeader
      density="compact"
      eyebrow="GENERAL LEDGER CONTROL"
      title="凭证中心"
      description="统一管理手工及业务自动生成凭证，覆盖制单、审核、过账、作废、冲销和审计追踪。"
      icon="ri:file-list-3-line"
      :tags="[
        { label: '借贷平衡', type: 'primary' },
        { label: '审核过账', type: 'success' },
        { label: '冲销留痕', type: 'warning' }
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
      :search-bar-props="{ span: 6, labelWidth: 88, showExpand: true }"
      :table-props="{
        rowKey: 'id',
        tableLayout: 'fixed',
        emptyText: '暂无会计凭证',
        emptyDescription: '请选择账套和日期范围，或新建一张借贷平衡的会计凭证。'
      }"
      focusable
    />

    <VoucherDialog ref="dialogRef" @success="handleMutationSuccess" />
    <VoucherActionDialog ref="actionDialogRef" @success="handleMutationSuccess" />
    <VoucherDetailDrawer ref="drawerRef" />
  </FinanceAccountingWorkspaceShell>
</template>

<script setup lang="tsx">
  import FinanceAccountingWorkspaceShell from '@fms/views/modules/finance-accounting-workspace-shell/index.vue'
  import type { ComputedRef, UnwrapNestedRefs } from 'vue'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type {
    ArtTableQueryExcelColumn,
    ArtTableQueryExpose,
    ArtTableQueryHeaderAction
  } from '@/components/core/tables/art-table-query/index.vue'
  import type { ColumnOption } from '@/types'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import BusinessTableWorkspaceActions from '@/components/business/business-table-workspace-actions/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import { useFinanceAccountSetPrerequisite } from '../../modules/use-finance-account-set-prerequisite'
  import {
    formatVoucherSummary,
    voucherSourceLabel,
    voucherSourceOptions
  } from '../../modules/voucher-summary'
  import { useUserStore } from '@/store/modules/user'
  import { notifyFriendlyError, useArtFeedback } from '@/hooks/core/useArtFeedback'
  import { useAuth } from '@/hooks/core/useAuth'
  import { buildSupabasePageRange } from '@/utils/supabase/pagination'
  import { formatWithDayjs } from '@/utils/time'
  import {
    isReadableFieldAccess,
    canViewField,
    formatSensitiveNumber,
    getFieldAccess,
    mergeFieldAccessMaps
  } from '@/utils/field-permission'
  import {
    exportVoucherList,
    fetchAccountSetOptions,
    fetchAuxiliaryItemList,
    fetchCurrencyList,
    fetchSubjectList,
    fetchVoucherList,
    fetchVoucherSummary,
    fetchVoucherTemplateList,
    transitionVoucher
  } from '@fms/api'
  import VoucherDialog from './modules/voucher-dialog.vue'
  import VoucherActionDialog from './modules/voucher-action-dialog.vue'
  import VoucherDetailDrawer from './modules/voucher-detail-drawer.vue'

  defineOptions({ name: 'FinanceVoucherCenter' })

  type Voucher = Api.Fms.SecureVoucherRecord
  type SearchParams = Api.Fms.VoucherSearchParams
  type TableParams = SearchParams & Pick<Api.Common.PaginationParams, 'current' | 'size'>

  interface DialogContext {
    accountSet: Api.Fms.AccountSetOption
    subjects: Api.Fms.SubjectRecord[]
    currencies: Api.Fms.CurrencyRecord[]
    auxiliaryItems: Api.Fms.AuxiliaryItemRecord[]
    templates: Api.Fms.VoucherTemplateRecord[]
  }

  interface DialogExpose {
    handleOpen: (
      context: DialogContext,
      row?: Voucher,
      loadContext?: () => Promise<DialogContext | undefined>
    ) => Promise<void>
  }

  interface ActionDialogExpose {
    handleOpen: (row: Voucher, action: 'reject' | 'void' | 'reverse') => Promise<void>
  }

  interface DrawerExpose {
    handleOpen: (row: Voucher) => Promise<void>
  }

  interface TableGroup {
    searchQuery: SearchParams
    searchItems: ComputedRef<SearchFormItem[]>
    headerActions: ComputedRef<ArtTableQueryHeaderAction[]>
    accountSetOptions: Api.Fms.AccountSetOption[]
  }

  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const { hasAuth } = useAuth()
  const { confirmAction } = useArtFeedback()
  const { ensureAccountSet } = useFinanceAccountSetPrerequisite()
  const route = useRoute()
  const voucherStatuses = new Set<Api.Fms.VoucherStatus>([
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'posted',
    'reversed',
    'voided'
  ])
  const parseVoucherStatus = (value: unknown): Api.Fms.VoucherStatus | '' =>
    typeof value === 'string' && voucherStatuses.has(value as Api.Fms.VoucherStatus)
      ? (value as Api.Fms.VoucherStatus)
      : ''
  const tableQueryRef = ref<ArtTableQueryExpose>()
  const dialogRef = ref<DialogExpose>()
  const actionDialogRef = ref<ActionDialogExpose>()
  const drawerRef = ref<DrawerExpose>()
  const entryContext = shallowRef<DialogContext>()
  const currentRows = ref<Voucher[]>([])
  const listFieldAccess = ref<Api.Fms.VoucherFieldAccessMap>({})
  const effectiveFieldAccess = computed(() =>
    mergeFieldAccessMaps(listFieldAccess.value, ...currentRows.value.map((row) => row.fieldAccess))
  )
  const canViewListField = (field: Api.Fms.VoucherFieldKey): boolean =>
    canViewField(effectiveFieldAccess.value, field)
  const summary = reactive<Api.Fms.VoucherSummary>({
    accountSetId: '',
    draftCount: 0,
    pendingReviewCount: 0,
    approvedCount: 0,
    postedCount: 0,
    reversedCount: 0,
    currentPeriodPostedAmount: 0
  })

  const table: UnwrapNestedRefs<TableGroup> = reactive<TableGroup>({
    searchQuery: {
      accountSetId: '',
      status: parseVoucherStatus(route.query.status),
      voucherType: '',
      sourceType: '',
      voucherDateRange: [],
      keyword: ''
    },
    accountSetOptions: [],
    searchItems: computed<SearchFormItem[]>(() => [
      {
        label: '账套',
        key: 'accountSetId',
        type: 'select',
        props: {
          options: table.accountSetOptions,
          filterable: true,
          clearable: true,
          placeholder: '全部可查看账套',
          onChange: () => void handleAccountSetChange()
        }
      },
      {
        label: '凭证状态',
        key: 'status',
        type: 'select',
        props: { options: getDictMap.value.fmsVoucherStatus ?? [], clearable: true }
      },
      {
        label: '凭证类型',
        key: 'voucherType',
        type: 'select',
        props: { options: getDictMap.value.fmsVoucherType ?? [], clearable: true }
      },
      {
        label: '凭证日期',
        key: 'voucherDateRange',
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
        label: '业务来源',
        key: 'sourceType',
        type: 'select',
        props: {
          options: voucherSourceOptions(getDictMap.value.fmsVoucherSourceType),
          clearable: true
        }
      },
      {
        label: '关键词',
        key: 'keyword',
        type: 'input',
        props: {
          clearable: true,
          placeholder: ['凭证号、摘要', canFilterSourceReference.value ? '来源单号' : '']
            .filter(Boolean)
            .join('、')
        }
      }
    ]),
    headerActions: computed<ArtTableQueryHeaderAction[]>(() => {
      const actions: ArtTableQueryHeaderAction[] = []
      actions.push({
        permission: 'FinanceVoucherCenter:Add',
        type: 'add',
        label: '新增凭证',
        onClick: () => void openDialog()
      })
      actions.push({
        permission: 'FinanceVoucherCenter:Export',
        type: 'export',
        exportFilename: '会计凭证台账',
        exportSheetName: '会计凭证',
        exportColumns: excelColumns.value,
        exportApi: ({ selectedIds, searchParams, maxRows }) =>
          exportVoucherList({
            ...(searchParams as SearchParams),
            ids: selectedIds.map(String),
            maxRows
          })
      })
      return actions
    })
  })

  const canFilterSourceReference = computed(() =>
    isReadableFieldAccess(getFieldAccess(listFieldAccess.value, 'sourceReferences'))
  )

  const metrics = computed<BusinessWorkspaceMetric[]>(() => [
    {
      key: 'draft',
      label: '待完善',
      value: summary.draftCount,
      description: '草稿与已驳回',
      icon: 'ri:draft-line',
      tone: 'info'
    },
    {
      key: 'review',
      label: '待审核',
      value: summary.pendingReviewCount,
      description: '等待财务审核',
      icon: 'ri:user-follow-line',
      tone: 'warning'
    },
    {
      key: 'approved',
      label: '待过账',
      value: summary.approvedCount,
      description: '审核通过未过账',
      icon: 'ri:checkbox-circle-line',
      tone: 'primary'
    },
    {
      key: 'posted',
      label: canViewField(summary.fieldAccess, 'voucherAmounts') ? '本期过账额' : '本期已过账',
      value: canViewField(summary.fieldAccess, 'voucherAmounts')
        ? formatSensitiveNumber(summary.currentPeriodPostedAmount)
        : summary.postedCount,
      description: canViewField(summary.fieldAccess, 'voucherAmounts')
        ? `累计已过账 ${summary.postedCount} 张`
        : '金额受字段权限控制',
      icon: 'ri:book-open-line',
      tone: 'success'
    }
  ])

  const columnsFactory = (): ColumnOption<Voucher>[] => [
    { type: 'selection', width: 50, fixed: 'left', reserveSelection: true },
    { type: 'globalIndex', label: '序号', width: 70 },
    {
      prop: 'voucherNo',
      label: '凭证号',
      width: 180,
      fixed: 'left',
      formatter: (row) => <span class="voucher-center-page__voucher-no">{row.voucherNo}</span>
    },
    { prop: 'voucherDate', label: '凭证日期', width: 115 },
    {
      prop: 'voucherType',
      label: '类型',
      width: 110,
      dict: { code: 'fmsVoucherType', display: 'text' }
    },
    {
      prop: 'summary',
      label: '摘要',
      minWidth: 220,
      showOverflowTooltip: true,
      formatter: (row: Voucher) =>
        formatVoucherSummary(row.summary, getDictMap.value.fmsPostingWaybillCostType, {
          sourceType: row.sourceType,
          billEvents: getDictMap.value.fmsBillEventType
        })
    },
    {
      prop: 'sourceType',
      label: '业务来源',
      width: 125,
      formatter: (row: Voucher) =>
        voucherSourceLabel(row.sourceType, getDictMap.value.fmsVoucherSourceType)
    },
    ...(canViewListField('sourceReferences')
      ? [
          {
            prop: 'sourceNo',
            label: '来源单号',
            minWidth: 150,
            showOverflowTooltip: true
          }
        ]
      : []),
    {
      prop: 'lineCount',
      label: '分录',
      width: 80,
      align: 'center',
      formatter: (row) => `${row.lineCount} 条`
    },
    ...(canViewListField('voucherAmounts')
      ? [
          {
            prop: 'totalDebit',
            label: '凭证金额',
            width: 135,
            align: 'right' as const,
            formatter: (row: Voucher) => formatSensitiveNumber(row.totalDebit)
          }
        ]
      : []),
    {
      prop: 'status',
      label: '状态',
      width: 110,
      dict: { code: 'fmsVoucherStatus', display: 'tag' }
    },
    { prop: 'createBy', label: '制单人', minWidth: 150, showOverflowTooltip: true },
    {
      prop: 'createTime',
      label: '制单时间',
      width: 165,
      formatter: (row) => formatWithDayjs(row.createTime, 'YYYY-MM-DD HH:mm')
    },
    {
      prop: 'operation',
      label: '操作',
      width: 180,
      fixed: 'right',
      formatter: (row) => (
        <BusinessTableRowActions>
          {hasAuth('FinanceVoucherCenter:View') ? (
            <ArtButtonTable
              type="view"
              permission="FinanceVoucherCenter:View"
              onClick={() => void drawerRef.value?.handleOpen(row)}
            />
          ) : null}
          {['draft', 'rejected'].includes(row.status) && (
            <>
              {hasAuth('FinanceVoucherCenter:Edit') && canOpenEdit(row) ? (
                <ArtButtonTable
                  type="edit"
                  permission="FinanceVoucherCenter:Edit"
                  onClick={() => void openDialog(row)}
                />
              ) : null}
              {hasAuth('FinanceVoucherCenter:Submit') ? (
                <ArtButtonTable
                  type="sign"
                  icon="ri:send-plane-line"
                  label="提交审核"
                  permission="FinanceVoucherCenter:Submit"
                  onClick={() => void runSimpleAction(row, 'submit')}
                />
              ) : null}
            </>
          )}
          {row.status === 'pending_review' &&
            (hasAuth('FinanceVoucherCenter:Approve') ? (
              <ArtButtonTable
                type="sign"
                label="审核通过"
                permission="FinanceVoucherCenter:Approve"
                onClick={() => void runSimpleAction(row, 'approve')}
              />
            ) : null)}
          {row.status === 'approved' &&
            (hasAuth('FinanceVoucherCenter:Post') ? (
              <ArtButtonTable
                type="sign"
                icon="ri:book-open-line"
                label="过账"
                permission="FinanceVoucherCenter:Post"
                onClick={() => void runSimpleAction(row, 'post')}
              />
            ) : null)}
          <ArtButtonMore
            trigger="click"
            list={() => getMoreActions(row)}
            onClick={(item: ButtonMoreItem) => handleMoreAction(item, row)}
          />
        </BusinessTableRowActions>
      )
    }
  ]

  const getMoreActions = (row: Voucher): ButtonMoreItem[] => {
    if (['draft', 'rejected', 'approved'].includes(row.status))
      return [
        {
          key: 'void',
          auth: 'FinanceVoucherCenter:Void',
          label: '作废凭证',
          icon: 'ri:close-circle-line',
          color: 'var(--el-color-danger)'
        }
      ]
    if (row.status === 'pending_review')
      return [
        {
          key: 'reject',
          auth: 'FinanceVoucherCenter:Reject',
          label: '驳回凭证',
          icon: 'ri:arrow-go-back-line',
          color: 'var(--el-color-danger)'
        }
      ]
    if (row.status === 'posted')
      return [
        {
          key: 'reverse',
          auth: 'FinanceVoucherCenter:Reverse',
          label: '冲销凭证',
          icon: 'ri:arrow-go-back-line'
        }
      ]
    return []
  }

  const handleMoreAction = (item: ButtonMoreItem, row: Voucher): void => {
    if (item.key === 'void') void actionDialogRef.value?.handleOpen(row, 'void')
    if (item.key === 'reject') void actionDialogRef.value?.handleOpen(row, 'reject')
    if (item.key === 'reverse') void actionDialogRef.value?.handleOpen(row, 'reverse')
  }

  const excelColumns = computed<ArtTableQueryExcelColumn[]>(() => [
    { key: 'voucherNo', title: '凭证号' },
    { key: 'voucherDate', title: '凭证日期' },
    { key: 'voucherType', title: '凭证类型' },
    { key: 'summary', title: '摘要' },
    { key: 'sourceType', title: '业务来源' },
    ...(canViewListField('sourceReferences') ? [{ key: 'sourceNo', title: '来源单号' }] : []),
    { key: 'lineCount', title: '分录数' },
    ...(canViewListField('voucherAmounts')
      ? [
          { key: 'totalDebit', title: '借方合计' },
          { key: 'totalCredit', title: '贷方合计' }
        ]
      : []),
    { key: 'status', title: '状态' },
    { key: 'createBy', title: '制单人' },
    { key: 'createTime', title: '制单时间' }
  ])

  async function fetchTableData(params: TableParams) {
    const { from, to } = buildSupabasePageRange({ current: params.current, size: params.size })
    const result = await fetchVoucherList({ ...params, from, to })
    listFieldAccess.value = result.fieldAccess
    currentRows.value = result.data ?? []
    return result
  }

  async function loadSummary(): Promise<void> {
    if (!table.searchQuery.accountSetId) {
      Object.assign(summary, {
        accountSetId: '',
        draftCount: 0,
        pendingReviewCount: 0,
        approvedCount: 0,
        postedCount: 0,
        reversedCount: 0,
        currentPeriodPostedAmount: 0,
        fieldAccess: listFieldAccess.value
      })
      return
    }
    const { data } = await fetchVoucherSummary(table.searchQuery.accountSetId)
    if (data) {
      Object.assign(summary, data)
      if (data.fieldAccess) listFieldAccess.value = data.fieldAccess
    }
  }

  async function loadEntryContext(): Promise<DialogContext | undefined> {
    const accountSet = table.accountSetOptions.find(
      (item) => item.value === table.searchQuery.accountSetId
    )
    if (!accountSet) return undefined
    if (entryContext.value?.accountSet.value === accountSet.value) return entryContext.value
    const [subjectResult, currencyResult, auxiliaryResult, templateResult] = await Promise.all([
      fetchSubjectList(accountSet.value),
      fetchCurrencyList(accountSet.value),
      fetchAuxiliaryItemList(accountSet.value),
      fetchVoucherTemplateList({ accountSetId: accountSet.value, from: 0, to: 999 })
    ])
    entryContext.value = {
      accountSet,
      subjects: subjectResult.data ?? [],
      currencies: currencyResult.data ?? [],
      auxiliaryItems: auxiliaryResult.data ?? [],
      templates: templateResult.data ?? []
    }
    return entryContext.value
  }

  async function openDialog(row?: Voucher): Promise<void> {
    if (
      !(await ensureAccountSet({
        actionLabel: row ? '编辑会计凭证' : '新增会计凭证',
        activeRequired: true,
        available: Boolean(row?.accountSetId || table.searchQuery.accountSetId)
      }))
    )
      return
    const accountSet = table.accountSetOptions.find(
      (item) => item.value === table.searchQuery.accountSetId
    )
    if (!accountSet) return
    const context =
      entryContext.value?.accountSet.value === accountSet.value
        ? entryContext.value
        : { accountSet, subjects: [], currencies: [], auxiliaryItems: [], templates: [] }
    await dialogRef.value?.handleOpen(context, row, loadEntryContext)
  }

  function canOpenEdit(row: Voucher): boolean {
    return isReadableFieldAccess(getFieldAccess(row.fieldAccess, 'voucherAmounts'))
  }

  async function runSimpleAction(
    row: Voucher,
    action: 'submit' | 'approve' | 'post'
  ): Promise<void> {
    const config = {
      submit: {
        title: '提交凭证审核',
        text: '提交后将锁定凭证核算范围和分录内容。',
        button: '确认提交'
      },
      approve: {
        title: '审核通过凭证',
        text: '审核通过后凭证进入待过账状态。',
        button: '审核通过'
      },
      post: {
        title: '凭证过账',
        text: '过账后凭证将进入总账且只能通过冲销更正。',
        button: '确认过账'
      }
    }[action]
    try {
      await confirmAction(config.text, `${config.title} · ${row.voucherNo}`, {
        confirmButtonText: config.button,
        type: action === 'post' ? 'warning' : 'info'
      })
      await transitionVoucher(row.id, action)
      handleMutationSuccess()
    } catch (error) {
      if (error === 'cancel' || error === 'close') return
      notifyFriendlyError(error, `${config.title}失败，请刷新凭证状态后重试。`)
    }
  }

  function handleMutationSuccess(): void {
    entryContext.value = undefined
    void Promise.all([tableQueryRef.value?.refreshUpdate(), loadSummary()])
  }

  async function handleAccountSetChange(): Promise<void> {
    entryContext.value = undefined
    await loadSummary()
  }

  async function loadAccountSets(): Promise<void> {
    const { data } = await fetchAccountSetOptions({ status: 'active', from: 0, to: 999 })
    table.accountSetOptions = data ?? []
    if (!table.searchQuery.accountSetId && table.accountSetOptions.length) {
      table.searchQuery.accountSetId = table.accountSetOptions[0].value
      await nextTick()
      await Promise.all([tableQueryRef.value?.getData(), loadSummary()])
    }
  }

  watch(
    () => [canViewListField('sourceReferences'), canViewListField('voucherAmounts')],
    (visibility, previousVisibility) => {
      if (visibility.every((value, index) => value === previousVisibility?.[index])) return
      void nextTick(() => tableQueryRef.value?.resetColumns())
    }
  )
  onMounted(() => {
    void Promise.allSettled([
      userStore.ensureDictLoaded('fmsVoucherStatus'),
      userStore.ensureDictLoaded('fmsVoucherType'),
      userStore.ensureDictLoaded('fmsVoucherSourceType'),
      userStore.ensureDictLoaded('fmsPostingWaybillCostType'),
      userStore.ensureDictLoaded('fmsBillEventType')
    ])
    void loadAccountSets()
  })

  watch(
    () => route.query.status,
    (value) => {
      const nextStatus = parseVoucherStatus(value)
      if (table.searchQuery.status === nextStatus) return
      table.searchQuery.status = nextStatus
      void tableQueryRef.value?.getData()
    }
  )
</script>

<style scoped lang="scss">
  .voucher-center-page {
    &__voucher-no {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--el-color-primary);
    }
  }
</style>
