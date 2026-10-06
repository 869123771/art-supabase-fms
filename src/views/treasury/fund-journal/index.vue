<template>
  <FinanceAccountingWorkspaceShell class="fund-journal-page">
    <BusinessWorkspaceHeader
      density="compact"
      eyebrow="TREASURY LEDGER"
      title="资金日记账"
      description="集中呈现客户收款、承运商付款、费用付款与内部调拨形成的实际资金流动，原流水与冲销流水均完整保留。"
      icon="ri:book-2-line"
      :tags="[
        { label: '业务自动登记', type: 'primary' },
        { label: '原始单据可追溯', type: 'success' },
        { label: '冲销不删记录', type: 'info' }
      ]"
      :metrics="metrics"
      @metric-click="handleMetricClick"
    />

    <ElAlert
      type="info"
      :closable="false"
      show-icon
      title="资金日记账由已实现的业务收付款与资金调拨自动生成，不允许在列表中直接修改，以保证业务单、资金流水和会计凭证链路一致。"
    />

    <ArtTableQuery
      class="fund-journal-page__table"
      ref="tableRef"
      v-model="table.search"
      :search-items="searchItems"
      :api-fn="fetchTableData"
      :columns-factory="columnsFactory"
      :search-bar-props="{ span: 8, labelWidth: 86, isExpand: true, showExpand: false }"
      :table-props="{
        rowKey: 'id',
        tableLayout: 'fixed',
        emptyText: '暂无资金流水',
        emptyDescription: '收款、付款或资金调拨执行后，系统会在此生成可审计资金流水。'
      }"
      focusable
    />
  </FinanceAccountingWorkspaceShell>
</template>

<script setup lang="tsx">
  import FinanceAccountingWorkspaceShell from '@fms/views/modules/finance-accounting-workspace-shell/index.vue'
  import { storeToRefs } from 'pinia'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type { ArtTableQueryExpose } from '@/components/core/tables/art-table-query/index.vue'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import type { ColumnOption } from '@/types'
  import { buildSupabasePageRange } from '@/utils/supabase/pagination'
  import { formatCurrencyValue } from '@/utils/ui'
  import { formatWithDayjs } from '@/utils/time'
  import { canViewField, getFieldAccess, mergeFieldAccessMaps } from '@/utils/field-permission'
  import { useUserStore } from '@/store/modules/user'
  import { fetchAccountSetOptions, fetchFundAccountOptions, fetchFundLedgerList } from '@fms/api'

  defineOptions({ name: 'FinanceFundJournal' })

  type Ledger = Api.Fms.FundLedgerRecord
  type SearchParams = Api.Fms.FundLedgerSearchParams
  type TableParams = SearchParams & { current: number; size: number }

  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const tableRef = ref<ArtTableQueryExpose>()
  const accountSetOptions = ref<Api.Fms.AccountSetOption[]>([])
  const accountOptions = ref<Api.Fms.FundAccountOption[]>([])
  const overviewRows = ref<Ledger[]>([])
  const overviewLoading = ref(false)
  const overviewReady = ref(false)
  const appliedDirection = ref<SearchParams['direction']>()
  let ledgerRequestId = 0
  let accountOptionsRequestId = 0
  const currentRows = ref<Ledger[]>([])
  const listFieldAccess = ref<Api.Fms.FundLedgerFieldAccessMap>({})
  const effectiveFieldAccess = computed(() =>
    mergeFieldAccessMaps(listFieldAccess.value, ...currentRows.value.map((row) => row.fieldAccess))
  )
  const canViewListField = (field: Api.Fms.FundLedgerFieldKey): boolean =>
    canViewField(effectiveFieldAccess.value, field)
  const canFilterAccount = computed(() =>
    ['read', 'edit'].includes(getFieldAccess(listFieldAccess.value, 'accountDetails'))
  )
  const table = reactive<{ search: SearchParams }>({
    search: {
      keyword: '',
      accountSetId: undefined,
      fundAccountId: undefined,
      direction: undefined,
      sourceType: undefined,
      status: undefined
    }
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
            label: '资金账户',
            key: 'fundAccountId',
            type: 'select' as const,
            props: {
              options: accountOptions.value,
              clearable: true,
              filterable: true,
              placeholder: '全部账户'
            }
          }
        ]
      : []),
    {
      label: '收支方向',
      key: 'direction',
      type: 'select',
      props: {
        options: getDictMap.value.fmsFundLedgerDirection ?? [],
        clearable: true,
        placeholder: '全部方向'
      }
    },
    {
      label: '业务来源',
      key: 'sourceType',
      type: 'select',
      props: {
        options: getDictMap.value.fmsFundLedgerSourceType ?? [],
        clearable: true,
        placeholder: '全部来源'
      }
    },
    {
      label: '入账日期',
      key: 'entryDateRange',
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
          '资金流水号',
          canFilterAccount.value ? '账户名称' : '',
          ['read', 'edit'].includes(getFieldAccess(listFieldAccess.value, 'transactionDetails'))
            ? '业务单号、摘要、对方或银行参考号'
            : ''
        ]
          .filter(Boolean)
          .join('、')
      }
    }
  ])

  const metrics = computed<BusinessWorkspaceMetric[]>(() => {
    const rows = overviewRows.value
    const amountAccess = getFieldAccess(listFieldAccess.value, 'ledgerAmounts')
    const summarizeAmount = (direction: Api.Fms.FundLedgerDirection) => {
      const directionRows = rows.filter((row) => row.direction === direction)
      const values = directionRows.map((row) => toFiniteNumber(row.amount))
      const readable =
        ['read', 'edit'].includes(amountAccess) &&
        values.every((value): value is number => value !== undefined)
      return {
        count: directionRows.length,
        value: readable
          ? formatCurrencyValue(values.reduce((sum, value) => sum + value, 0))
          : amountAccess === 'masked'
            ? '***'
            : '--'
      }
    }
    const inflow = summarizeAmount('inflow')
    const outflow = summarizeAmount('outflow')
    const reversalCount = rows.filter((row) => row.reversalOfId || row.status === 'reversed').length
    return [
      {
        key: 'all',
        label: '资金流水',
        value: overviewReady.value ? rows.length : '--',
        loading: overviewLoading.value,
        description: '当前筛选范围记录',
        icon: 'ri:list-check-3',
        tone: 'primary',
        interactive: true,
        selected: !appliedDirection.value
      },
      {
        key: 'inflow',
        label: '资金流入',
        value: overviewReady.value ? inflow.value : '--',
        loading: overviewLoading.value,
        description: overviewReady.value ? `${inflow.count} 笔` : '当前查询范围',
        icon: 'ri:arrow-left-down-line',
        tone: 'success',
        interactive: true,
        selected: appliedDirection.value === 'inflow'
      },
      {
        key: 'outflow',
        label: '资金流出',
        value: overviewReady.value ? outflow.value : '--',
        loading: overviewLoading.value,
        description: overviewReady.value ? `${outflow.count} 笔` : '当前查询范围',
        icon: 'ri:arrow-right-up-line',
        tone: 'warning',
        interactive: true,
        selected: appliedDirection.value === 'outflow'
      },
      {
        key: 'reversal',
        label: '冲销关联',
        value: overviewReady.value ? reversalCount : '--',
        loading: overviewLoading.value,
        description: '原流水与反向流水均保留',
        icon: 'ri:arrow-go-back-line',
        tone: reversalCount ? 'warning' : 'info'
      }
    ]
  })

  function columnsFactory(): ColumnOption<Ledger>[] {
    return [
      {
        prop: 'entryNo',
        label: '资金流水号',
        minWidth: 170,
        fixed: 'left',
        formatter: (row) => (
          <div class="fund-ledger-identity">
            <strong translate="no" title={row.entryNo}>
              {row.entryNo}
            </strong>
            <small>{row.entryDate}</small>
          </div>
        )
      },
      ...(canViewListField('accountDetails')
        ? [
            {
              prop: 'fundAccount',
              label: '资金账户',
              minWidth: 170,
              formatter: (row: Ledger) => (
                <div class="fund-ledger-identity">
                  <strong title={row.fundAccount?.accountName || '--'}>
                    {row.fundAccount?.accountName || '--'}
                  </strong>
                  <small>{row.fundAccount?.accountNoMasked || '--'}</small>
                </div>
              )
            }
          ]
        : []),
      {
        prop: 'direction',
        label: '方向',
        width: 75,
        dict: { code: 'fmsFundLedgerDirection', display: 'tag' }
      },
      ...(canViewListField('ledgerAmounts')
        ? [
            {
              prop: 'amount',
              label: '发生金额',
              width: 115,
              align: 'right' as const,
              formatter: (row: Ledger) => formatLedgerAmount(row.amount, row.currencyCode)
            }
          ]
        : []),
      {
        prop: 'sourceType',
        label: '业务来源',
        width: 110,
        dict: { code: 'fmsFundLedgerSourceType', display: 'text' }
      },
      ...(canViewListField('transactionDetails')
        ? [
            {
              prop: 'summary',
              label: '业务摘要',
              minWidth: 235,
              formatter: (row: Ledger) => (
                <div class="fund-ledger-identity">
                  <strong title={row.summary || '--'}>{row.summary || '--'}</strong>
                  <small title={row.sourceNo || '--'} translate="no">
                    {row.sourceNo || '--'}
                  </small>
                  {row.counterpartyName || row.bankReference ? (
                    <small
                      title={[row.counterpartyName, row.bankReference].filter(Boolean).join(' · ')}
                    >
                      {[row.counterpartyName, row.bankReference].filter(Boolean).join(' · ')}
                    </small>
                  ) : null}
                </div>
              )
            }
          ]
        : []),
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row) =>
          row.status === 'reversed' ? '已被冲销' : row.reversalOfId ? '冲销流水' : '已入账'
      },
      {
        prop: 'postedAt',
        label: '登记时间',
        width: 135,
        formatter: (row) => formatWithDayjs(row.postedAt, 'YYYY-MM-DD HH:mm') || '--'
      }
    ]
  }

  async function fetchTableData(params: TableParams) {
    const requestId = ++ledgerRequestId
    overviewLoading.value = true
    overviewReady.value = false
    const { from, to } = buildSupabasePageRange({ current: params.current, size: params.size })
    try {
      const [result, overview] = await Promise.all([
        fetchFundLedgerList({ ...params, from, to }, { showErrorMessage: false }),
        fetchFundLedgerList({ ...params, from: 0, to: 999 }, { showErrorMessage: false })
      ])
      if (result.error) throw result.error
      if (overview.error) throw overview.error
      if (requestId === ledgerRequestId) {
        listFieldAccess.value = result.fieldAccess
        currentRows.value = result.data ?? []
        overviewRows.value = overview.data ?? []
        overviewReady.value = true
        appliedDirection.value = params.direction
      }
      return result
    } finally {
      if (requestId === ledgerRequestId) overviewLoading.value = false
    }
  }

  async function loadAccountOptions(accountSetId?: string): Promise<void> {
    const requestId = ++accountOptionsRequestId
    table.search.fundAccountId = undefined
    accountOptions.value = []
    if (!accountSetId || !canFilterAccount.value) {
      accountOptions.value = []
      return
    }
    const { data } = await fetchFundAccountOptions({ accountSetId })
    if (requestId !== accountOptionsRequestId) return
    accountOptions.value = data ?? []
  }

  function toFiniteNumber(value: Api.Fms.SensitiveNumber | undefined): number | undefined {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : undefined
  }

  function formatLedgerAmount(
    value: Api.Fms.SensitiveNumber | undefined,
    currency = 'CNY'
  ): string {
    if (value === null || value === undefined || value === '') return '--'
    return formatCurrencyValue(value, currency)
  }

  function handleMetricClick(metric: BusinessWorkspaceMetric): void {
    if (!['all', 'inflow', 'outflow'].includes(String(metric.key))) return
    table.search.direction =
      metric.key === 'all' ? undefined : (metric.key as Api.Fms.FundLedgerDirection)
    void tableRef.value?.getData()
  }

  watch(canFilterAccount, (allowed) => {
    if (!allowed) {
      table.search.fundAccountId = undefined
      accountOptions.value = []
    } else if (table.search.accountSetId) {
      void loadAccountOptions(table.search.accountSetId)
    }
  })

  watch(
    () => [
      canViewListField('accountDetails'),
      canViewListField('ledgerAmounts'),
      canViewListField('transactionDetails')
    ],
    (nextVisibility, previousVisibility) => {
      if (nextVisibility.every((value, index) => value === previousVisibility?.[index])) return
      void nextTick(() => tableRef.value?.resetColumns())
    }
  )

  onMounted(async () => {
    await Promise.all([
      userStore.ensureDictLoaded('fmsFundLedgerDirection'),
      userStore.ensureDictLoaded('fmsFundLedgerSourceType')
    ])
    const { data } = await fetchAccountSetOptions({ status: 'active', from: 0, to: 999 })
    accountSetOptions.value = data ?? []
  })
</script>

<style scoped lang="scss">
  .fund-journal-page {
    overflow: auto;

    :deep(.art-table-query.fund-journal-page__table) {
      min-height: 440px;
    }
  }

  :deep(.fund-ledger-identity) {
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
