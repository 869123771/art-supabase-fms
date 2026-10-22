<template>
  <ArtPermissionGuard permission="FinancePayableWriteoff:View" resource-name="应付核销工作台">
    <div class="business-workspace-page min-w-0">
      <BusinessWorkspaceHeader
        title="应付核销工作台"
        description="核对已审核应付与已确认付款，按方案执行核销，分别保留核销记录与需记账核销单。"
        icon="ri:checkbox-circle-line"
        density="compact"
        :metrics="metrics"
      >
        <template #actions>
          <ElButton v-auth="'FinancePayableWriteoff:Scheme'" @click="schemeDialog?.handleOpen()"
            ><ArtSvgIcon icon="ri:settings-3-line" />核销方案</ElButton
          >
          <ElButton :loading="loading" @click="load"
            ><ArtSvgIcon icon="ri:refresh-line" />刷新</ElButton
          >
        </template>
      </BusinessWorkspaceHeader>
      <ArtSectionCard
        title="核销条件"
        subtitle="当前支持人民币应付付款及预付款核销；单次查询最多显示各 200 条单据，核销时服务端重新校验。"
      >
        <ArtForm
          v-model="filter"
          :items="filterItems"
          :span="6"
          label-position="top"
          :show-submit="false"
          :show-reset="false"
        />
        <div class="flex flex-wrap items-center gap-3">
          <ElButton type="primary" :loading="loading" @click="load">查询</ElButton>
          <ElSwitch v-model="onlyAvailable" aria-label="仅显示可核销数据" /><span
            class="text-sm text-g-600"
            >仅显示主辅方都有可核销数据的往来单位</span
          >
          <span class="ml-auto text-sm text-g-600">仅核销会计余额，不发起银行转账</span>
        </div>
      </ArtSectionCard>
      <div class="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ArtSectionCard
          title="往来单位"
          subtitle="按单位定位核销双方"
          :loading="loading"
          :error="loadError"
          @retry="load"
        >
          <ElInput
            v-model="partyKeyword"
            placeholder="搜索往来单位"
            clearable
            aria-label="搜索往来单位"
          />
          <ElScrollbar class="mt-3" max-height="570px"
            ><ElTree
              :data="partyNodes"
              node-key="id"
              :props="{ label: 'label' }"
              highlight-current
              :expand-on-click-node="false"
              @node-click="(node) => (selectedParty = node.id)"
          /></ElScrollbar>
        </ArtSectionCard>
        <ArtSectionCard
          title="应付付款核销"
          subtitle="选择双方明细并填写本次金额；主辅方合计必须相等。"
          :loading="loading"
          :error="loadError"
          @retry="load"
        >
          <ElTabs v-model="activeTab">
            <ElTabPane label="待核销单据" name="candidates">
              <div class="mb-4 flex flex-wrap items-center gap-3">
                <ElButton
                  v-auth="'FinancePayableWriteoff:Writeoff'"
                  type="primary"
                  :loading="busy"
                  :disabled="!primarySelection.length || !secondarySelection.length"
                  @click="execute"
                  >核销</ElButton
                >
                <ElButton
                  v-auth="'FinancePayableWriteoff:AutoWriteoff'"
                  :disabled="busy || loading"
                  @click="openAutomatic"
                  ><ArtSvgIcon icon="ri:magic-line" />按方案自动核销</ElButton
                >
                <span class="text-sm text-g-600"
                  >主方 {{ formatCurrencyValue(primaryTotal) }} · 辅方
                  {{ formatCurrencyValue(secondaryTotal) }}</span
                >
              </div>
              <ArtSectionCard
                title="财务应付单"
                :subtitle="`共 ${primaryRows.length} 条`"
                :empty="!primaryRows.length"
                empty-title="暂无待核销应付"
                empty-description="请选择其他往来单位，或先审核财务应付单。"
                :show-scrollbar="false"
              >
                <ArtTable
                  ref="primaryTable"
                  :data="primaryRows"
                  :columns="candidateColumns"
                  row-key="id"
                  :pagination="false"
                  :max-height="270"
                  @selection-change="(rows: PayableWriteoffCandidate[]) => (primarySelection = rows)"
                />
              </ArtSectionCard>
              <ArtSectionCard
                class="mt-4"
                title="付款单"
                :subtitle="`共 ${secondaryRows.length} 条`"
                :empty="!secondaryRows.length"
                empty-title="暂无可核销付款"
                empty-description="先确认付款，或关闭“仅显示可核销数据”查看其他往来单位。"
                :show-scrollbar="false"
              >
                <ArtTable
                  ref="secondaryTable"
                  :data="secondaryRows"
                  :columns="candidateColumns"
                  row-key="id"
                  :pagination="false"
                  :max-height="270"
                  @selection-change="(rows: PayableWriteoffCandidate[]) => (secondarySelection = rows)"
                />
              </ArtSectionCard>
            </ElTabPane>
            <ElTabPane :label="`核销记录（${historyRows.length}）`" name="history"
              ><ArtTable
                :data="historyRows"
                :columns="historyColumns"
                :pagination="false"
                :max-height="560"
                row-key="id"
            /></ElTabPane>
            <ElTabPane :label="`核销单（${voucherRows.length}）`" name="documents"
              ><ArtTable
                :data="voucherRows"
                :columns="historyColumns"
                :pagination="false"
                :max-height="560"
                row-key="id"
                empty-text="暂无需要记账的核销单"
                empty-description="仅跨往来单位、预付款等需要调整会计科目的核销生成核销单。"
            /></ElTabPane>
          </ElTabs>
        </ArtSectionCard>
      </div>
      <ArtDialog ref="schemeDialog" title="应付核销方案" size="xl" :show-footer="false">
        <div class="mb-4"
          ><ElButton
            v-auth="'FinancePayableWriteoff:Scheme'"
            type="primary"
            @click="schemeEditor?.open()"
            ><ArtSvgIcon icon="ri:add-line" />新增方案</ElButton
          ></div
        >
        <ArtTable :data="workspace.schemes" :columns="schemeColumns" :pagination="false" />
      </ArtDialog>
      <ReferenceEditor ref="schemeEditor" kind="scheme" @success="load" />
      <PayableAutomaticWriteoff ref="automaticDialog" @success="load" @refresh="load" />
      <ArtDialog ref="recordDialog" title="应付核销单" size="lg" :show-footer="false"
        ><ArtDescriptions v-if="currentRecord" :data="currentRecord" :items="recordItems" />
        <ArtSectionCard
          v-if="currentRecord?.matchSnapshot?.rules?.length"
          class="mt-4"
          title="匹配依据"
          :subtitle="`${currentRecord.matchSnapshot.schemeName} · ${currentRecord.matchSnapshot.schemeCode}；保存核销当时的条件，不随方案修改。`"
        >
          <ArtTable
            :data="currentRecord.matchSnapshot.rules"
            :columns="matchingColumns"
            :pagination="false"
            :max-height="230"
          />
        </ArtSectionCard>
      </ArtDialog>
      <FinanceVoucherPreview ref="previewRef" :result="voucherResult" />
    </div>
  </ArtPermissionGuard>
</template>
<script setup lang="tsx">
  import { computed, onMounted, ref, watch } from 'vue'
  import dayjs from 'dayjs'
  import { ElInputNumber, ElMessage, ElButton } from 'element-plus'
  import { uniq, uniqBy } from 'lodash-es'
  import { useTenantScopeStore } from '@/store/modules/tenant-scope'
  import { formatTenantLabel } from '@/utils/tenant-display'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import ArtDescriptions from '@/components/core/base/art-descriptions/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import BusinessWorkspaceHeader from '@/components/business/business-workspace-header/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import FinanceVoucherPreview from '@/components/business/finance-voucher-preview/index.vue'
  import ReferenceEditor from '@/components/business/payable-reference-workspace/modules/reference-editor.vue'
  import PayableAutomaticWriteoff from '@/components/business/payable-automatic-writeoff/index.vue'
  import {
    fetchPayableWriteoffWorkspace,
    executePayableWriteoff,
    reversePayableWriteoff,
    payableSettlementVoucher,
    type PayableWriteoffCandidate,
    type PayableWriteoffRecord,
    type PayableWriteoffWorkspace,
    type PayableVoucherResult
  } from '@/api/payable-writeoff'
  import type { PayableReference, PayableMatchRule } from '@/api/payable-reference'
  import { payableMatchFields, payableMatchOperators } from '@/utils/finance/payable-match'
  import { allocatePayableWriteoff } from '@/utils/finance/payable-writeoff'
  import { formatCurrencyValue } from '@/utils/ui/format'
  import { notifyFriendlyError, useArtFeedback } from '@/hooks/core/useArtFeedback'
  import type { ColumnOption } from '@/types'

  defineOptions({ name: 'FinancePayableWriteoff' })
  const filter = ref({
    keyword: '',
    organizationId: '',
    schemeId: '',
    writeoffDate: dayjs().format('YYYY-MM-DD')
  })
  const tenantScope = useTenantScopeStore()
  const onlyAvailable = ref(false)
  const partyKeyword = ref('')
  const selectedParty = ref('all')
  const activeTab = ref('candidates')
  const loading = ref(false)
  const loadError = ref('')
  const busy = ref(false)
  const automaticDialog = ref<InstanceType<typeof PayableAutomaticWriteoff>>()
  let version = 0
  const workspace = ref<PayableWriteoffWorkspace>({
    primary: [],
    secondary: [],
    history: [],
    schemes: []
  })
  const primarySelection = ref<PayableWriteoffCandidate[]>([])
  const secondarySelection = ref<PayableWriteoffCandidate[]>([])
  const primaryTable = ref<InstanceType<typeof ArtTable>>()
  const secondaryTable = ref<InstanceType<typeof ArtTable>>()
  const schemeDialog = ref<ArtDialogExpose>()
  const schemeEditor = ref<InstanceType<typeof ReferenceEditor>>()
  const recordDialog = ref<ArtDialogExpose>()
  const currentRecord = ref<PayableWriteoffRecord>()
  const previewRef = ref<InstanceType<typeof FinanceVoucherPreview>>()
  const voucherResult = ref<PayableVoucherResult>()
  const { confirm, promptReason } = useArtFeedback()
  const availableParties = computed(() => {
    const both = workspace.value.primary.filter((main) =>
      workspace.value.secondary.some(
        (side) => side.supplierId === main.supplierId && side.tenantId === main.tenantId
      )
    )
    return onlyAvailable.value
      ? both
      : [...workspace.value.primary, ...workspace.value.secondary, ...workspace.value.history]
  })
  const partyNodes = computed(() => [
    {
      id: 'all',
      label: '全部往来单位',
      children: uniqBy(availableParties.value, (row) => `${row.tenantId}:${row.supplierId}`)
        .filter((row) => !partyKeyword.value || row.supplierName.includes(partyKeyword.value))
        .map((row) => ({ id: `${row.tenantId}:${row.supplierId}`, label: row.supplierName }))
    }
  ])
  const partyMatches = (row: { tenantId: string; supplierId: string }) =>
    selectedParty.value === 'all' || `${row.tenantId}:${row.supplierId}` === selectedParty.value
  const primaryRows = computed(() =>
    workspace.value.primary.filter(
      (row) =>
        partyMatches(row) &&
        (!onlyAvailable.value ||
          availableParties.value.some(
            (party) => party.tenantId === row.tenantId && party.supplierId === row.supplierId
          ))
    )
  )
  const secondaryRows = computed(() =>
    workspace.value.secondary.filter(
      (row) =>
        partyMatches(row) &&
        (!onlyAvailable.value ||
          availableParties.value.some(
            (party) => party.tenantId === row.tenantId && party.supplierId === row.supplierId
          ))
    )
  )
  const historyRows = computed(() =>
    workspace.value.history.filter((row) => selectedParty.value === 'all' || partyMatches(row))
  )
  const voucherRows = computed(() =>
    historyRows.value.filter((row) => row.needsVoucher && row.status === 'active' && row.documentNo)
  )
  const total = (rows: PayableWriteoffCandidate[]) =>
    rows.reduce((sum, row) => sum + Number(row.writeoffAmount ?? row.availableAmount), 0)
  const primaryTotal = computed(() => total(primarySelection.value))
  const secondaryTotal = computed(() => total(secondarySelection.value))
  const metrics = computed(() => [
    {
      key: 'payable',
      icon: 'ri:bill-line',
      description: '当前查询范围内的应付未核销余额',
      label: '当前待核销应付',
      value: formatCurrencyValue(
        workspace.value.primary.reduce((sum, row) => sum + row.availableAmount, 0)
      )
    },
    {
      key: 'payment',
      icon: 'ri:secure-payment-line',
      description: '当前查询范围内的已确认付款余额',
      label: '当前可核销付款',
      value: formatCurrencyValue(
        workspace.value.secondary.reduce((sum, row) => sum + row.availableAmount, 0)
      )
    },
    {
      key: 'written',
      icon: 'ri:checkbox-circle-line',
      description: '当前查询的有效核销记录合计',
      label: '查询内已核销',
      value: formatCurrencyValue(
        workspace.value.history
          .filter((row) => row.status === 'active')
          .reduce((sum, row) => sum + row.amount, 0)
      )
    }
  ])
  const filterItems = computed<FormItem[]>(() => [
    {
      key: 'organizationId',
      label: '结算组织',
      type: 'select',
      props: {
        clearable: true,
        options: (workspace.value.organizations || []).map((row) => ({
          value: row.id,
          label: row.name
        }))
      }
    },
    {
      key: 'keyword',
      label: '查询条件',
      type: 'input',
      props: { placeholder: '往来单位或单据编号', clearable: true }
    },
    {
      key: 'schemeId',
      label: '核销方案',
      type: 'select',
      props: {
        options: workspace.value.schemes
          .filter((row) => row.enabled)
          .map((row) => ({
            value: row.id,
            label: tenantScope.isAllTenants ? `${row.name} · ${formatTenantLabel(row)}` : row.name
          }))
      }
    },
    { key: 'writeoffDate', label: '核销日期', type: 'date', props: { valueFormat: 'YYYY-MM-DD' } }
  ])
  const candidateColumns: ColumnOption<PayableWriteoffCandidate>[] = [
    { type: 'selection', width: 44 },
    { prop: 'documentNo', label: '单据编号', minWidth: 210, fixed: 'left' },
    { prop: 'businessDate', label: '业务日期', width: 125 },
    { prop: 'documentTypeName', label: '单据类型', minWidth: 150 },
    { prop: 'purposeName', label: '付款用途', minWidth: 130 },
    { prop: 'supplierName', label: '往来单位', minWidth: 200 },
    { prop: 'currencyCode', label: '币种', width: 95 },
    { prop: 'projectName', label: '项目名称', minWidth: 170 },
    { prop: 'sourceDocumentNo', label: '源单据号', minWidth: 190 },
    {
      prop: 'amount',
      label: '单据金额(元)',
      width: 150,
      align: 'right',
      formatter: (row) => formatCurrencyValue(row.amount)
    },
    {
      prop: 'availableAmount',
      label: '允许核销金额(元)',
      width: 170,
      fixed: 'right',
      align: 'right',
      formatter: (row) => formatCurrencyValue(row.availableAmount)
    },
    {
      prop: 'writeoffAmount',
      label: '本次核销金额(元)',
      width: 170,
      fixed: 'right',
      formatter: (row) => (
        <ElInputNumber
          v-model={row.writeoffAmount}
          min={0.01}
          max={row.availableAmount}
          precision={2}
          controls={false}
          aria-label="本次核销金额"
          class="w-full!"
        />
      )
    }
  ]
  const historyColumns: ColumnOption<PayableWriteoffRecord>[] = [
    { prop: 'recordNo', label: '核销记录号', minWidth: 245 },
    { prop: 'writeoffDate', label: '核销日期', width: 130 },
    { prop: 'supplierName', label: '往来单位', minWidth: 170 },
    { prop: 'payableNo', label: '财务应付单', minWidth: 210 },
    { prop: 'paymentNo', label: '付款单', minWidth: 210 },
    {
      prop: 'documentNo',
      label: '核销单',
      minWidth: 240,
      formatter: (row) =>
        row.documentNo ? (
          <ElButton link type="primary" onClick={() => showRecord(row)}>
            {row.documentNo}
          </ElButton>
        ) : row.status === 'reversed' ? (
          '已撤销'
        ) : (
          '无需记账'
        )
    },
    {
      prop: 'amount',
      label: '核销金额(元)',
      width: 165,
      align: 'right',
      formatter: (row) => formatCurrencyValue(row.amount)
    },
    {
      prop: 'paymentAmount',
      label: '实付分摊金额(元)',
      width: 175,
      align: 'right',
      formatter: (row) => formatCurrencyValue(row.paymentAmount ?? row.amount)
    },
    {
      prop: 'cashDiscountAmount',
      label: '现金折扣金额(元)',
      width: 175,
      align: 'right',
      formatter: (row) => formatCurrencyValue(row.cashDiscountAmount ?? 0)
    },
    {
      prop: 'status',
      label: '状态',
      width: 100,
      formatter: (row) => (row.status === 'active' ? '已核销' : '已反核销')
    },
    { prop: 'voucherNo', label: '凭证号', minWidth: 190 },
    {
      prop: 'operation',
      label: '操作',
      width: 145,
      fixed: 'right',
      formatter: (row) => (
        <BusinessTableRowActions>
          {row.needsVoucher && row.status === 'active' && (
            <>
              <ArtButtonTable
                icon="ri:file-search-line"
                label="预览凭证"
                permission="FinancePayableWriteoff:Voucher"
                onClick={() => voucher(row, true)}
              />
              <ArtButtonTable
                icon="ri:file-add-line"
                label="生成凭证"
                permission="FinancePayableWriteoff:Voucher"
                onClick={() => voucher(row, false)}
              />
            </>
          )}
          {row.status === 'active' && (
            <ArtButtonTable
              icon="ri:arrow-go-back-line"
              label="反核销"
              permission="FinancePayableWriteoff:Reverse"
              onClick={() => reverse(row)}
            />
          )}
        </BusinessTableRowActions>
      )
    }
  ]
  const matchingColumns: ColumnOption<PayableMatchRule>[] = [
    {
      prop: 'primaryField',
      label: '主方单据字段',
      minWidth: 180,
      formatter: (row) =>
        payableMatchFields.find((item) => item.value === row.primaryField)?.label || '未识别字段'
    },
    {
      prop: 'operator',
      label: '匹配关系',
      width: 125,
      formatter: (row) =>
        payableMatchOperators.find((item) => item.value === row.operator)?.label || '未识别关系'
    },
    {
      prop: 'secondaryField',
      label: '辅方单据字段',
      minWidth: 180,
      formatter: (row) =>
        payableMatchFields.find((item) => item.value === row.secondaryField)?.label || '未识别字段'
    },
    {
      prop: 'emptyMatches',
      label: '任一为空时匹配',
      width: 165,
      formatter: (row) => (row.emptyMatches ? '是' : '否')
    }
  ]
  const schemeColumns: ColumnOption<PayableReference>[] = [
    ...(tenantScope.isAllTenants
      ? [
          {
            prop: 'tenant',
            label: '所属租户',
            minWidth: 180,
            formatter: (row: PayableReference) => formatTenantLabel(row)
          }
        ]
      : []),
    { prop: 'code', label: '方案编码', minWidth: 180 },
    { prop: 'name', label: '方案名称', minWidth: 220 },
    {
      prop: 'automatic',
      label: '自动核销',
      width: 110,
      formatter: (row) => (row.automatic ? '启用' : '关闭')
    },
    {
      prop: 'enabled',
      label: '状态',
      width: 100,
      formatter: (row) => (row.enabled ? '启用' : '停用')
    },
    { prop: 'remark', label: '备注', minWidth: 180 },
    {
      prop: 'operation',
      label: '操作',
      width: 85,
      formatter: (row) => (
        <ArtButtonTable
          type="edit"
          label="编辑方案"
          permission="FinancePayableWriteoff:Scheme"
          onClick={() => schemeEditor.value?.open(row)}
        />
      )
    }
  ]
  const recordItems = [
    { key: 'documentNo', field: 'documentNo', label: '核销单号' },
    { key: 'writeoffDate', field: 'writeoffDate', label: '核销日期' },
    { key: 'payableNo', field: 'payableNo', label: '主方财务应付' },
    { key: 'paymentNo', field: 'paymentNo', label: '辅方付款单' },
    { key: 'supplierName', field: 'supplierName', label: '往来单位' },
    { key: 'amount', field: 'amount', label: '核销金额(元)' },
    {
      key: 'paymentAmount',
      label: '实付分摊金额(元)',
      value: (row: PayableWriteoffRecord) => formatCurrencyValue(row.paymentAmount ?? row.amount)
    },
    {
      key: 'cashDiscountAmount',
      label: '现金折扣金额(元)',
      value: (row: PayableWriteoffRecord) => formatCurrencyValue(row.cashDiscountAmount ?? 0)
    },
    { key: 'voucherNo', field: 'voucherNo', label: '凭证号' },
    { key: 'remark', field: 'remark', label: '备注' }
  ]
  async function showRecord(row: PayableWriteoffRecord): Promise<void> {
    currentRecord.value = row
    await recordDialog.value?.handleOpen()
  }
  async function load(): Promise<void> {
    const current = ++version
    loading.value = true
    loadError.value = ''
    primarySelection.value = []
    secondarySelection.value = []
    try {
      const response = await fetchPayableWriteoffWorkspace({
        keyword: filter.value.keyword,
        organizationId: filter.value.organizationId
      })
      if (current !== version) return
      response.primary.forEach((row) => (row.writeoffAmount = row.availableAmount))
      response.secondary.forEach((row) => (row.writeoffAmount = row.availableAmount))
      workspace.value = response
      if (!response.schemes.some((row) => row.id === filter.value.schemeId && row.enabled))
        filter.value.schemeId =
          response.schemes.find((row) => row.enabled && !row.automatic)?.id || ''
    } catch (error) {
      if (current === version) {
        loadError.value = '核销资料加载失败，请重新加载'
        notifyFriendlyError(error, loadError.value)
      }
    } finally {
      if (current === version) loading.value = false
    }
  }
  async function openAutomatic(): Promise<void> {
    const scheme = workspace.value.schemes.find((row) => row.id === filter.value.schemeId)
    if (!scheme?.enabled || !scheme.automatic || !filter.value.writeoffDate) {
      ElMessage.warning('请选择已启用自动核销的方案和核销日期')
      return
    }
    await automaticDialog.value?.open({
      schemeId: scheme.id || '',
      date: filter.value.writeoffDate,
      query: {
        keyword: filter.value.keyword,
        organizationId: filter.value.organizationId,
        supplierId: selectedParty.value === 'all' ? undefined : selectedParty.value
      }
    })
  }
  async function execute(): Promise<void> {
    if (busy.value) return
    if (
      uniq([...primarySelection.value, ...secondarySelection.value].map((row) => row.tenantId))
        .length > 1
    ) {
      ElMessage.warning('单次核销不能跨租户，请按同一租户选择双方单据')
      return
    }
    if (!filter.value.schemeId || !filter.value.writeoffDate) {
      ElMessage.warning('请选择核销方案和日期')
      return
    }
    let items: ReturnType<typeof allocatePayableWriteoff>
    try {
      items = allocatePayableWriteoff(primarySelection.value, secondarySelection.value)
    } catch (error) {
      notifyFriendlyError(error, '双方金额不正确，请调整后重试')
      return
    }
    try {
      await confirm(
        `本次核销 ${formatCurrencyValue(primaryTotal.value)}，执行后扣减双方未核销余额。`,
        { title: '核销确认', confirmButtonText: '执行核销' }
      )
    } catch {
      return
    }
    busy.value = true
    try {
      await executePayableWriteoff(
        items,
        filter.value.schemeId,
        filter.value.writeoffDate,
        '手工应付付款核销'
      )
      ElMessage.success('应付付款已核销')
      await load()
    } catch (error) {
      notifyFriendlyError(error, '核销未完成，请重新查询核对余额')
    } finally {
      busy.value = false
    }
  }
  async function reverse(row: PayableWriteoffRecord): Promise<void> {
    if (busy.value) return
    let reason: string
    try {
      reason = await promptReason(
        '反核销将恢复双方余额；已生成凭证的核销单不能反核销。',
        '反核销原因'
      )
    } catch {
      return
    }
    busy.value = true
    try {
      await reversePayableWriteoff(row.id, reason)
      ElMessage.success('已反核销，未制证核销单已移除')
      await load()
    } catch (error) {
      notifyFriendlyError(error, '反核销未完成，请先核对凭证状态')
    } finally {
      busy.value = false
    }
  }
  async function voucher(row: PayableWriteoffRecord, preview: boolean): Promise<void> {
    if (busy.value) return
    busy.value = true
    try {
      voucherResult.value = await payableSettlementVoucher(row.id, 'writeoff', preview)
      if (preview) await previewRef.value?.handleOpen()
      else {
        if (voucherResult.value.status === 'generated')
          ElMessage.success(voucherResult.value.message)
        else ElMessage.warning(voucherResult.value.message)
        await load()
      }
    } catch (error) {
      notifyFriendlyError(error, '凭证处理未完成，请核对规则后重试')
    } finally {
      busy.value = false
    }
  }
  watch([selectedParty, onlyAvailable], () => {
    primarySelection.value = []
    secondarySelection.value = []
    primaryTable.value?.elTableRef?.clearSelection()
    secondaryTable.value?.elTableRef?.clearSelection()
  })
  watch(
    () => primarySelection.value[0]?.tenantId || secondarySelection.value[0]?.tenantId,
    (tenant) => {
      const current = workspace.value.schemes.find((row) => row.id === filter.value.schemeId)
      if (tenant && current?.tenantId && current.tenantId !== tenant)
        filter.value.schemeId =
          workspace.value.schemes.find(
            (row) => row.tenantId === tenant && row.enabled && !row.automatic
          )?.id || ''
    }
  )
  watch(
    () => tenantScope.revision,
    () => {
      workspace.value = { primary: [], secondary: [], history: [], schemes: [] }
      selectedParty.value = 'all'
      filter.value.schemeId = ''
      void load()
    }
  )
  onMounted(load)
</script>
