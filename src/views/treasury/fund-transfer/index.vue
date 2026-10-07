<template>
  <FinanceAccountingWorkspaceShell
    class="fund-transfer-page"
    :location-ready="Boolean(locatedTransferId)"
  >
    <ArtAsyncState
      v-if="linkedTransferLoading || linkedTransferError"
      :loading="linkedTransferLoading"
      :error="linkedTransferError ? '关联资金调拨加载失败，请重新加载。' : null"
      min-height="160px"
      size="compact"
      @retry="retryLinkedTransfer"
    />
    <BusinessWorkspaceHeader
      density="compact"
      eyebrow="TREASURY CONTROL"
      title="资金调拨"
      description="以审批、余额校验和双边资金流水管控企业内部账户调拨，执行与冲销均保留完整操作轨迹。"
      icon="ri:swap-2-line"
      :tags="[
        { label: '同账套同币种', type: 'primary' },
        { label: '审批后执行', type: 'success' },
        { label: '可审计冲销', type: 'info' }
      ]"
      :metrics="metrics"
      @metric-click="handleMetricClick"
    >
      <template #actions>
        <BusinessTableWorkspaceActions :table="tableRef" />
      </template>
    </BusinessWorkspaceHeader>

    <ArtTableQuery
      class="fund-transfer-page__table"
      ref="tableRef"
      v-model="table.search"
      :search-items="searchItems"
      :api-fn="fetchTableData"
      :columns-factory="columnsFactory"
      :header-actions="headerActions"
      header-actions-placement="workspace"
      :search-bar-props="{ span: 6, labelWidth: 86, isExpand: true, showExpand: false }"
      :table-props="{
        rowKey: 'id',
        tableLayout: 'fixed',
        emptyText: '暂无资金调拨',
        emptyDescription: '创建调拨草稿，经提交、审批和执行后自动形成双边资金流水。'
      }"
      focusable
    />

    <FundTransferDialog ref="dialogRef" @success="handleSaved" />
    <FundTransferDetailDrawer ref="drawerRef" />
    <MasterDataDeleteGuard ref="deleteGuardRef" />
  </FinanceAccountingWorkspaceShell>
</template>

<script setup lang="tsx">
  import { normalizeNullableNumber } from '@/utils/form/normalize'
  import FinanceAccountingWorkspaceShell from '@fms/views/modules/finance-accounting-workspace-shell/index.vue'
  import ArtAsyncState from '@/components/core/feedback/art-async-state/index.vue'
  import { useRouteDocumentDrawer } from '@/hooks/core/useRouteDocumentDrawer'
  import { useAuth } from '@/hooks/core/useAuth'
  import dayjs from 'dayjs'
  import { storeToRefs } from 'pinia'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type {
    ArtTableQueryExpose,
    ArtTableQueryHeaderAction
  } from '@/components/core/tables/art-table-query/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import BusinessTableWorkspaceActions from '@/components/business/business-table-workspace-actions/index.vue'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import {
    useFinanceAccountSetPrerequisite,
    type FinancePrerequisiteOverlay
  } from '../../modules/use-finance-account-set-prerequisite'
  import type { ColumnOption } from '@/types'
  import { buildSupabasePageRange } from '@/utils/supabase/pagination'
  import { formatCurrencyValue } from '@/utils/ui'
  import { formatWithDayjs } from '@/utils/time'
  import { canViewField, getFieldAccess, mergeFieldAccessMaps } from '@/utils/field-permission'
  import { notifyFriendlyError, useArtFeedback } from '@/hooks/core/useArtFeedback'
  import MasterDataDeleteGuard from '@/components/business/master-data-delete-guard/index.vue'
  import { useRecordDeleteGuard } from '@/hooks/core/useRecordDeleteGuard'
  import { useUserStore } from '@/store/modules/user'
  import {
    deleteFundTransfer,
    fetchAccountSetOptions,
    fetchFundAccountOptions,
    fetchFundTransferDetail,
    fetchFundTransferList,
    transitionFundTransfer
  } from '@fms/api'
  import FundTransferDialog from './modules/fund-transfer-dialog.vue'
  import FundTransferDetailDrawer from './modules/fund-transfer-detail-drawer.vue'

  defineOptions({ name: 'FinanceFundTransfer' })

  type Transfer = Api.Fms.FundTransferRecord
  type SearchParams = Api.Fms.FundTransferSearchParams
  type TableParams = SearchParams & { current: number; size: number }

  interface DialogExpose extends FinancePrerequisiteOverlay {
    handleOpen: (row?: Transfer) => Promise<void>
  }
  interface DrawerExpose {
    handleOpen: (row: Transfer) => Promise<void>
  }

  const { confirmAction, promptReason } = useArtFeedback()
  const { deleteGuardRef, deleteRecord, deleteBusy } = useRecordDeleteGuard(
    'fms_fund_transfer',
    '资金调拨'
  )
  const transitionBusy = ref(false)
  const { runWithAccountSet } = useFinanceAccountSetPrerequisite()
  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const tableRef = ref<ArtTableQueryExpose>()
  const dialogRef = ref<DialogExpose>()
  const drawerRef = ref<DrawerExpose>()
  const locatedTransferId = ref('')
  const { hasAuth } = useAuth()
  const {
    loading: linkedTransferLoading,
    error: linkedTransferError,
    retry: retryLinkedTransfer
  } = useRouteDocumentDrawer({
    routeName: 'FinanceFundTransfer',
    queryKey: 'recordId',
    clearQueryOnOpen: false,
    canOpen: () => hasAuth('FinanceFundTransfer:View'),
    fetchDocument: async (id) => {
      locatedTransferId.value = ''
      const { data, error } = await fetchFundTransferDetail(id, { showErrorMessage: false })
      if (error || !data) throw new Error('关联资金调拨加载失败', { cause: error })
      return data
    },
    openDocument: async (transfer) => {
      if (!drawerRef.value) throw new Error('资金调拨详情尚未就绪')
      await drawerRef.value.handleOpen(transfer)
      locatedTransferId.value = transfer.id
    }
  })
  const accountSetOptions = ref<Api.Fms.AccountSetOption[]>([])
  const accountOptions = ref<Api.Fms.FundAccountOption[]>([])
  const overviewRows = ref<Transfer[]>([])
  const currentRows = ref<Transfer[]>([])
  const listFieldAccess = ref<Api.Fms.FundTransferFieldAccessMap>({})
  const effectiveFieldAccess = computed(() =>
    mergeFieldAccessMaps(listFieldAccess.value, ...currentRows.value.map((row) => row.fieldAccess))
  )
  const canViewListField = (field: Api.Fms.FundTransferFieldKey): boolean =>
    canViewField(effectiveFieldAccess.value, field)
  const canFilterAccount = computed(() =>
    ['read', 'edit'].includes(getFieldAccess(listFieldAccess.value, 'transferAccounts'))
  )
  const table = reactive<{ search: SearchParams }>({
    search: { keyword: '', accountSetId: undefined, status: undefined }
  })

  const searchItems = computed<SearchFormItem[]>(() => [
    {
      label: '所属账套',
      key: 'accountSetId',
      type: 'select',
      props: {
        options: accountSetOptions.value,
        clearable: true,
        filterable: true,
        placeholder: '全部账套',
        onChange: (value: string) => void loadAccountOptions(value)
      }
    },
    ...(canFilterAccount.value
      ? [
          {
            label: '调拨账户',
            key: 'sourceAccountId',
            type: 'select' as const,
            props: {
              options: accountOptions.value,
              clearable: true,
              filterable: true,
              placeholder: '全部转出账户'
            }
          }
        ]
      : []),
    {
      label: '调拨状态',
      key: 'status',
      type: 'select',
      props: {
        options: getDictMap.value.fmsFundTransferStatus ?? [],
        clearable: true,
        placeholder: '全部状态'
      }
    },
    {
      label: '调拨日期',
      key: 'transferDateRange',
      type: 'daterange',
      props: { valueFormat: 'YYYY-MM-DD' }
    },
    {
      label: '关键字',
      key: 'keyword',
      type: 'input',
      props: {
        clearable: true,
        placeholder: [
          '调拨单号、用途',
          canFilterAccount.value ? '账户名称' : '',
          ['read', 'edit'].includes(getFieldAccess(listFieldAccess.value, 'bankReference'))
            ? '银行参考号'
            : ''
        ]
          .filter(Boolean)
          .join('、')
      }
    }
  ])

  const headerActions = computed<ArtTableQueryHeaderAction[]>(() => [
    {
      permission: 'FinanceFundTransfer:Add',
      type: 'add',
      label: '新建资金调拨',
      onClick: () =>
        void runWithAccountSet(
          {
            actionLabel: '新建资金调拨',
            activeRequired: true,
            accountSetId: table.search.accountSetId,
            foundationRequired: true,
            fundAccountRequired: true,
            available: accountSetOptions.value.length > 0
          },
          () => dialogRef.value?.handleOpen(),
          dialogRef.value
        )
    }
  ])

  const metrics = computed<BusinessWorkspaceMetric[]>(() => {
    const selected = table.search.status
    const count = (status: Api.Fms.FundTransferStatus) =>
      overviewRows.value.filter((row) => row.status === status).length
    const completedRows = overviewRows.value.filter((row) => row.status === 'completed')
    const amountAccess = getFieldAccess(listFieldAccess.value, 'transferAmounts')
    const completedAmounts = completedRows.map(
      (row) => normalizeNullableNumber(row.amount) ?? undefined
    )
    const canAggregateAmount =
      ['read', 'edit'].includes(amountAccess) &&
      completedAmounts.every((value): value is number => value !== undefined)
    const completedAmount = canAggregateAmount
      ? completedAmounts.reduce((sum, value) => sum + value, 0)
      : undefined
    return [
      {
        key: 'all',
        label: '全部调拨',
        value: overviewRows.value.length,
        description: '当前可见调拨单',
        icon: 'ri:swap-2-line',
        tone: 'primary',
        interactive: true,
        selected: !selected
      },
      {
        key: 'pending_review',
        label: '待审批',
        value: count('pending_review'),
        description: '等待资金审批',
        icon: 'ri:time-line',
        tone: 'warning',
        interactive: true,
        selected: selected === 'pending_review'
      },
      {
        key: 'approved',
        label: '待执行',
        value: count('approved'),
        description: '已审批未入账',
        icon: 'ri:play-circle-line',
        tone: 'primary',
        interactive: true,
        selected: selected === 'approved'
      },
      {
        key: 'completed',
        label: canAggregateAmount ? '已完成金额' : '已完成调拨',
        value:
          completedAmount === undefined
            ? amountAccess === 'masked'
              ? '***'
              : count('completed')
            : formatCurrencyValue(completedAmount),
        description: canAggregateAmount ? `${count('completed')} 笔已入账` : '金额受字段权限控制',
        icon: 'ri:checkbox-circle-line',
        tone: 'success',
        interactive: true,
        selected: selected === 'completed'
      }
    ]
  })

  function columnsFactory(): ColumnOption<Transfer>[] {
    return [
      {
        prop: 'transferNo',
        label: '调拨单号',
        minWidth: 165,
        fixed: 'left',
        formatter: (row) => (
          <button
            class="fund-transfer-link"
            type="button"
            onClick={() => void drawerRef.value?.handleOpen(row)}
          >
            <strong translate="no">{row.transferNo}</strong>
            <small
              title={`最近更新 ${formatWithDayjs(row.updateTime, 'YYYY-MM-DD HH:mm') || '--'}`}
            >
              {formatWithDayjs(row.transferDate, 'YYYY-MM-DD')}
            </small>
          </button>
        )
      },
      ...(canViewListField('transferAccounts')
        ? [
            {
              prop: 'sourceAccountName',
              label: '转出账户',
              minWidth: 180,
              formatter: (row: Transfer) => (
                <div class="fund-transfer-account">
                  <strong title={row.sourceAccountName || '--'}>
                    {row.sourceAccountName || '--'}
                  </strong>
                  <small>{row.sourceAccountNoMasked || '--'}</small>
                </div>
              )
            },
            {
              prop: 'targetAccountName',
              label: '转入账户',
              minWidth: 180,
              formatter: (row: Transfer) => (
                <div class="fund-transfer-account">
                  <strong title={row.targetAccountName || '--'}>
                    {row.targetAccountName || '--'}
                  </strong>
                  <small>{row.targetAccountNoMasked || '--'}</small>
                </div>
              )
            }
          ]
        : []),
      ...(canViewListField('transferAmounts')
        ? [
            {
              prop: 'amount',
              label: '调拨金额',
              minWidth: 120,
              align: 'right' as const,
              formatter: (row: Transfer) => formatTransferAmount(row.amount, row.currencyCode)
            },
            {
              prop: 'feeAmount',
              label: '手续费',
              width: 95,
              align: 'right' as const,
              formatter: (row: Transfer) => formatTransferAmount(row.feeAmount, row.currencyCode)
            }
          ]
        : []),
      { prop: 'purpose', label: '调拨用途', minWidth: 155, showOverflowTooltip: true },
      {
        prop: 'status',
        label: '状态',
        width: 85,
        dict: { code: 'fmsFundTransferStatus', display: 'tag' }
      },
      {
        prop: 'operation',
        label: '操作',
        width: 160,
        fixed: 'right',
        formatter: (row) => (
          <BusinessTableRowActions>
            <ArtButtonTable
              type="view"
              permission="FinanceFundTransfer:View"
              onClick={() => void drawerRef.value?.handleOpen(row)}
            />
            {['draft', 'rejected'].includes(row.status) ? (
              <ArtButtonTable
                type="edit"
                permission="FinanceFundTransfer:Edit"
                disabled={transitionBusy.value || deleteBusy.value}
                onClick={() => void dialogRef.value?.handleOpen(row)}
              />
            ) : null}
            {getActionItems(row).length ? (
              <ArtButtonMore
                trigger="click"
                list={getActionItems(row).map((item) => ({
                  ...item,
                  disabled: transitionBusy.value || deleteBusy.value
                }))}
                onClick={(item: ButtonMoreItem) => void handleAction(item, row)}
              />
            ) : null}
          </BusinessTableRowActions>
        )
      }
    ]
  }

  function getActionItems(row: Transfer): ButtonMoreItem[] {
    if (['draft', 'rejected'].includes(row.status)) {
      return [
        {
          auth: 'FinanceFundTransfer:Submit',
          key: 'submit',
          label: '提交审批',
          icon: 'ri:send-plane-line',
          color: 'var(--el-color-primary)'
        },
        {
          auth: 'FinanceFundTransfer:Delete',
          key: 'delete',
          label: '删除草稿',
          icon: 'ri:delete-bin-line',
          color: 'var(--el-color-danger)'
        }
      ]
    }
    if (row.status === 'pending_review') {
      return [
        {
          auth: 'FinanceFundTransfer:Approve',
          key: 'approve',
          label: '审批通过',
          icon: 'ri:check-line',
          color: 'var(--el-color-success)'
        },
        {
          auth: 'FinanceFundTransfer:Reject',
          key: 'reject',
          label: '驳回',
          icon: 'ri:close-line',
          color: 'var(--el-color-danger)'
        }
      ]
    }
    if (row.status === 'approved') {
      return [
        {
          auth: 'FinanceFundTransfer:Execute',
          key: 'execute',
          label: '执行入账',
          icon: 'ri:play-line',
          color: 'var(--el-color-success)'
        }
      ]
    }
    if (row.status === 'completed') {
      return [
        {
          auth: 'FinanceFundTransfer:Reverse',
          key: 'reverse',
          label: '冲销调拨',
          icon: 'ri:arrow-go-back-line',
          color: 'var(--el-color-warning)'
        }
      ]
    }
    return []
  }

  async function fetchTableData(params: TableParams) {
    const { from, to } = buildSupabasePageRange({ current: params.current, size: params.size })
    const result = await fetchFundTransferList({ ...params, from, to })
    listFieldAccess.value = result.fieldAccess
    currentRows.value = result.data ?? []
    return result
  }

  async function loadOverview(): Promise<void> {
    const result = await fetchFundTransferList({
      accountSetId: table.search.accountSetId,
      from: 0,
      to: 999
    })
    overviewRows.value = result.data ?? []
    listFieldAccess.value = result.fieldAccess
  }

  async function loadAccountOptions(accountSetId?: string): Promise<void> {
    table.search.sourceAccountId = undefined
    if (!accountSetId) {
      accountOptions.value = []
      return
    }
    const { data } = await fetchFundAccountOptions({ accountSetId, status: 'active' })
    accountOptions.value = data ?? []
  }

  function handleMetricClick(metric: BusinessWorkspaceMetric): void {
    table.search.status =
      metric.key === 'all' ? undefined : (metric.key as Api.Fms.FundTransferStatus)
    void tableRef.value?.getData()
  }

  async function handleAction(item: ButtonMoreItem, row: Transfer): Promise<void> {
    if (transitionBusy.value || deleteBusy.value) return
    const action = getActionItems(row).find((candidate) => candidate.key === item.key)
    const canRunAction = () =>
      Boolean(
        action?.auth &&
        hasAuth(action.auth) &&
        getActionItems(row).some(
          (candidate) => candidate.key === action.key && candidate.auth === action.auth
        )
      )
    if (!action || !canRunAction()) {
      ElMessage.error('调拨操作权限或状态已变化，请刷新页面后重试')
      return
    }
    if (item.key === 'delete') {
      await deleteRecord({
        resource: { id: row.id, label: row.transferNo },
        permission: 'FinanceFundTransfer:Delete',
        confirmMessage: `确定删除调拨草稿“${row.transferNo}”吗？`,
        remove: () => deleteFundTransfer(row.id),
        onDeleted: () => refreshAll('delete'),
        failureMessage: '资金调拨删除失败，请刷新调拨状态后重试'
      })
      return
    }
    transitionBusy.value = true
    try {
      if (
        item.key !== 'submit' &&
        item.key !== 'approve' &&
        item.key !== 'reject' &&
        item.key !== 'execute' &&
        item.key !== 'reverse'
      )
        return
      let reason: string | undefined
      if (item.key === 'reject' || item.key === 'reverse') {
        reason = await promptReason(
          item.key === 'reject'
            ? '请说明驳回原因和修改要求。'
            : '冲销会生成反向资金流水，请说明业务原因。',
          item.key === 'reject' ? '驳回资金调拨' : '冲销资金调拨',
          { emptyMessage: '请填写原因', placeholder: '填写可审计的处理原因' }
        )
      } else {
        const messages: Record<string, string> = {
          submit: '提交后将进入资金审批流程。',
          approve: '审批通过后仍需执行入账，当前操作不会立即改变余额。',
          execute: buildExecuteConfirmMessage(row)
        }
        await confirmAction(messages[item.key] || '确定执行该操作吗？', item.label, {
          type: item.key === 'execute' ? 'warning' : 'info',
          confirmButtonText: item.label
        })
      }
      if (!canRunAction()) {
        ElMessage.error('调拨操作权限或状态已变化，请刷新页面后重试')
        return
      }
      await transitionFundTransfer(row.id, item.key, {
        reason,
        executionDate: ['execute', 'reverse'].includes(String(item.key))
          ? dayjs().format('YYYY-MM-DD')
          : null,
        version: row.version
      })
      await refreshAll('update')
    } catch (error) {
      if (error === 'cancel' || error === 'close') return
      notifyFriendlyError(error, `${item.label}失败，请刷新调拨状态后重试`)
    } finally {
      transitionBusy.value = false
    }
  }

  function formatTransferAmount(
    value: Api.Fms.SensitiveNumber | undefined,
    currency = 'CNY'
  ): string {
    if (value === null || value === undefined || value === '') return '--'
    return formatCurrencyValue(value, currency)
  }

  function buildExecuteConfirmMessage(row: Transfer): string {
    const amount = normalizeNullableNumber(row.amount) ?? undefined
    const feeAmount = normalizeNullableNumber(row.feeAmount) ?? undefined
    if (row.sourceAccountName && amount !== undefined && feeAmount !== undefined) {
      return `执行后将从“${row.sourceAccountName}”扣减 ${formatCurrencyValue(amount + feeAmount, row.currencyCode)}。`
    }
    return '执行后将生成双边资金流水并更新账户余额。'
  }

  async function refreshAll(mode: 'add' | 'edit' | 'update' | 'delete'): Promise<void> {
    const refresh =
      mode === 'add'
        ? tableRef.value?.refreshCreate()
        : mode === 'delete'
          ? tableRef.value?.refreshRemove()
          : tableRef.value?.refreshUpdate()
    await Promise.all([refresh, loadOverview()])
  }

  async function handleSaved(type: 'add' | 'edit'): Promise<void> {
    await refreshAll(type)
  }

  watch(
    () => table.search.accountSetId,
    () => void loadOverview()
  )

  watch(canFilterAccount, (allowed) => {
    if (!allowed) table.search.sourceAccountId = undefined
  })

  watch(
    () => [canViewListField('transferAccounts'), canViewListField('transferAmounts')],
    (nextVisibility, previousVisibility) => {
      if (nextVisibility.every((value, index) => value === previousVisibility?.[index])) return
      void nextTick(() => tableRef.value?.resetColumns())
    }
  )

  onMounted(async () => {
    const [{ data }] = await Promise.all([
      fetchAccountSetOptions({ status: 'active', from: 0, to: 999 }),
      userStore.ensureDictLoaded('fmsFundTransferStatus')
    ])
    accountSetOptions.value = data ?? []
    await loadOverview()
  })
</script>

<style scoped lang="scss">
  .fund-transfer-page {
    overflow: auto;

    :deep(.art-table-query.fund-transfer-page__table) {
      min-height: 420px;
    }
  }

  :deep(.fund-transfer-link) {
    display: grid;
    gap: 3px;
    max-width: 100%;
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;

    strong,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      color: var(--el-text-color-secondary);
    }
  }

  :deep(.fund-transfer-account) {
    display: grid;
    gap: 3px;
    min-width: 0;

    strong,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      color: var(--el-text-color-secondary);
    }
  }
</style>
