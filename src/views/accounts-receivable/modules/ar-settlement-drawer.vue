<template>
  <ArtDrawer
    ref="drawerRef"
    size="xl"
    :loading="loading"
    :show-confirm-button="editable"
    confirm-text="保存草稿"
  >
    <ArtAsyncState :error="loadError" @retry="retry">
      <ArtDescriptions
        v-if="!editable && record"
        :data="record"
        :items="detailItems"
        :columns="3"
      />
      <template v-else>
        <ElAlert
          :title="
            mode === 'receipt'
              ? '保存即占用应收额度；审核后确认收款才核销并登记资金。'
              : '退款以原已确认收款的可退余额为限，须审核后确认付款。'
          "
          type="info"
          :closable="false"
          class="mb-4"
        />
        <ArtForm
          ref="formRef"
          v-model="form"
          :items="formItems"
          :rules="rules"
          :show-submit="false"
          :show-reset="false"
          label-position="top"
          :span="8"
        />
      </template>
      <ArtSectionCard
        v-if="mode === 'receipt'"
        class="mt-5"
        title="收款分配"
        :description="
          allowSourceZero
            ? '应收来源自动带入；金额填 0 表示本次不收该行，至少填写一行正数金额。'
            : '应收来源自动带入；未指定应收的独立收款可在核销工作台分配。'
        "
      >
        <ArtTable
          ref="lineTable"
          :data="lines"
          :columns="lineColumns"
          :pagination="false"
          :height="280"
        />
        <p class="mt-4 text-right text-sm font-medium tabular-nums"
          >收款合计：{{ money(total, record?.currencyCode || form.currencyCode) }}</p
        >
      </ArtSectionCard>
    </ArtAsyncState>
  </ArtDrawer>
</template>
<script setup lang="tsx">
  import { ref, computed } from 'vue'
  import dayjs from 'dayjs'
  import { sumBy, cloneDeep } from 'lodash-es'
  import { ElInputNumber, ElInput, ElMessage } from 'element-plus'
  import {
    fetchArWorkspace,
    fetchArOptions,
    saveArReceipt,
    saveArRefund,
    type ReceiptDocument,
    type ReceiptLine,
    type ReceivableDocument,
    type ArOption
  } from '@/api/receivables'
  import { useTenantScopeStore } from '@/store/modules/tenant-scope'
  import { useUserStore } from '@/store/modules/user'
  import { useDictionaryOptions } from '@/hooks/core/useDictionaryOptions'
  import { notifyFriendlyError } from '@/hooks/core/useArtFeedback'
  import { validateArtFormForSubmit } from '@/utils/form/validate-art-form'
  import { formatSensitiveCurrencyValue as money } from '@/utils/ui/format'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtAsyncState from '@/components/core/feedback/art-async-state/index.vue'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtDescriptions from '@/components/core/base/art-descriptions/index.vue'
  import type { ArtDescriptionItem } from '@/components/core/base/art-descriptions/types'
  import ArtTable, { type ArtTableExpose } from '@/components/core/tables/art-table/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import type { ColumnOption } from '@/types'
  import type { DataSelectKey } from '@/components/core/forms/art-data-select/types'
  defineOptions({ name: 'ArSettlementDrawer' })
  const emit = defineEmits<{ success: [] }>()
  const drawerRef = ref<ArtDrawerExpose>()
  const formRef = ref<InstanceType<typeof ArtForm>>()
  const lineTable = ref<ArtTableExpose>()
  const mode = ref<'receipt' | 'refund'>('receipt')
  const editable = ref(true)
  const loading = ref(false)
  const loadError = ref<Error>()
  const record = ref<ReceiptDocument>()
  const lines = ref<ReceiptLine[]>([])
  let financialId: string | undefined
  const form = ref<Partial<ReceiptDocument>>({})
  let retry = async (): Promise<void> => {}
  const settlementOptions = useDictionaryOptions('arSettlementMethod')
  const currencyOptions = useDictionaryOptions('mdmCurrency')
  const pickerColumns = [
    { prop: 'code', label: '编码', minWidth: 160 },
    { prop: 'name', label: '名称', minWidth: 200 }
  ]
  const total = computed(() => sumBy(lines.value, (row) => row.amount ?? 0))
  const allowSourceZero = computed(
    () =>
      !form.value.id && lines.value.length > 1 && lines.value.every((row) => row.financialLineId)
  )
  const rules = computed(() =>
    mode.value === 'receipt'
      ? {
          customerId: [{ required: true, message: '请选择结算客户' }],
          settlementOrganizationId: [{ required: true, message: '请选择结算组织' }],
          businessDate: [{ required: true, message: '请选择业务日期' }],
          paymentMethod: [{ required: true, message: '请选择结算方式' }]
        }
      : {
          originalReceiptId: [{ required: true, message: '请选择原收款单' }],
          amount: [
            { required: true, type: 'number' as const, min: 0.01, message: '退款金额须大于零' }
          ],
          businessDate: [{ required: true, message: '请选择退款日期' }],
          remark: [{ required: true, message: '请填写退款原因' }]
        }
  )
  function remote(key: string, label: string, type: string, picker = false): FormItem {
    return {
      key,
      label,
      type: picker ? 'dataSelect' : 'select',
      api: () => fetchArOptions(type, form.value.tenantId),
      labelField: 'name',
      valueField: 'id',
      props: picker
        ? {
            rowKey: 'id',
            labelKey: 'name',
            columns: pickerColumns,
            title: `选择${label}`,
            resolveSelected: async (keys: DataSelectKey[]) =>
              (await fetchArOptions(type, form.value.tenantId)).filter((row) =>
                keys.includes(row.id)
              )
          }
        : { filterable: true, clearable: true }
    }
  }
  async function fetchRefundReceipts(): Promise<
    (ReceiptDocument & { name: string; code: string })[]
  > {
    const result = await fetchArWorkspace('receipt', {
      status: 'confirmed',
      tenantId: useTenantScopeStore().effectiveTenantId ?? undefined,
      size: 10000,
      financialId
    })
    return result.data
      .filter((row) => (row.refundableAmount ?? 0) > 0)
      .map((row) => ({ ...row, name: row.documentNo, code: row.documentNo }))
  }
  const formItems = computed<FormItem[]>(() =>
    mode.value === 'receipt'
      ? [
          remote('customerId', '结算客户', 'customer', true),
          remote('settlementOrganizationId', '结算组织', 'company'),
          {
            key: 'businessDate',
            label: '业务日期',
            type: 'date',
            props: { valueFormat: 'YYYY-MM-DD' }
          },
          remote('fundAccountId', '收款账户', 'fund'),
          {
            key: 'currencyCode',
            label: '收款币种',
            type: 'select',
            props: { options: currencyOptions }
          },
          {
            key: 'paymentMethod',
            label: '结算方式',
            type: 'select',
            props: { options: settlementOptions }
          },
          { key: 'bankReference', label: '银行流水号', type: 'input', props: { maxlength: 100 } },
          {
            key: 'matchingReference',
            label: '核心单据号 / 结算行标识',
            type: 'input',
            props: { maxlength: 100, placeholder: '指定后确认收款时自动匹配；留空则保留待分配' }
          },
          {
            key: 'remark',
            label: '备注',
            type: 'textarea',
            span: 24,
            props: { maxlength: 2000, rows: 2 }
          }
        ]
      : [
          {
            key: 'originalReceiptId',
            label: '原收款单',
            type: 'dataSelect',
            api: fetchRefundReceipts,
            labelField: 'name',
            valueField: 'id',
            span: 16,
            props: {
              rowKey: 'id',
              labelKey: 'name',
              resolveSelected: async (keys: DataSelectKey[]) =>
                (await fetchRefundReceipts()).filter((row) => keys.includes(row.id)),
              columns: [
                { prop: 'documentNo', label: '收款单号', minWidth: 200 },
                { prop: 'customerName', label: '客户', minWidth: 180 },
                { prop: 'refundableAmount', label: '可退金额', width: 150 }
              ],
              title: '参选原收款单'
            }
          },
          {
            key: 'businessDate',
            label: '退款日期',
            type: 'date',
            props: { valueFormat: 'YYYY-MM-DD' }
          },
          { key: 'amount', label: '退款金额', type: 'number', props: { min: 0.01, precision: 2 } },
          {
            key: 'remark',
            label: '退款原因',
            type: 'textarea',
            span: 24,
            props: { maxlength: 2000, rows: 3 }
          }
        ]
  )
  const detailItems: ArtDescriptionItem<ReceiptDocument>[] = [
    { key: 'documentNo', label: '单据编号', field: 'documentNo' },
    { key: 'status', label: '状态', field: 'status', dictCode: 'arDocumentStatus' },
    { key: 'customerName', label: '结算客户', field: 'customerName' },
    { key: 'organizationName', label: '结算组织', field: 'organizationName' },
    { key: 'businessDate', label: '业务日期', field: 'businessDate' },
    { key: 'currencyCode', label: '币种', field: 'currencyCode' },
    {
      key: 'amount',
      label: '金额',
      field: 'amount',
      formatter: (value, row) => money(value, row.currencyCode)
    },
    { key: 'sourceNo', label: '来源单据', field: 'sourceNo' },
    { key: 'bankReference', label: '银行流水号', field: 'bankReference' },
    { key: 'remark', label: '备注', field: 'remark', span: 3 }
  ]
  const lineColumns = computed<ColumnOption<ReceiptLine>[]>(() => [
    { prop: 'lineNo', label: '行号', width: 70 },
    {
      prop: 'sourceNo',
      label: '应收来源',
      minWidth: 220,
      formatter: (row) => row.sourceNo || '独立收款，待手工分配'
    },
    {
      prop: 'amount',
      label: '本次收款金额',
      width: 180,
      required: true,
      rules: {
        validator: ({ row }) =>
          row.amount !== null &&
          row.amount !== undefined &&
          (allowSourceZero.value ? row.amount >= 0 : row.amount > 0),
        message: allowSourceZero.value ? '收款金额不能小于0' : '收款金额须大于0'
      },
      formatter: (row) =>
        editable.value ? (
          <ElInputNumber
            v-model={row.amount}
            aria-label={`第${row.lineNo}行本次收款金额`}
            min={allowSourceZero.value ? 0 : 0.01}
            precision={2}
            controls={false}
            class="w-full!"
          />
        ) : row.amount === null ? (
          '—'
        ) : (
          money(row.amount, record.value?.currencyCode || form.value.currencyCode)
        )
    },
    {
      prop: 'remark',
      label: '核销备注',
      minWidth: 200,
      formatter: (row) =>
        editable.value ? (
          <ElInput v-model={row.remark} maxlength={1000} aria-label={`第${row.lineNo}行核销备注`} />
        ) : (
          row.remark || '—'
        )
    }
  ])
  async function save(): Promise<boolean> {
    if (!(await validateArtFormForSubmit(formRef.value))) return false
    try {
      if (mode.value === 'receipt') {
        const validation = await lineTable.value?.validate()
        if (validation && !validation.valid) {
          ElMessage.warning(validation.firstError?.message || '请补全收款分配')
          return false
        }
        const allocations = allowSourceZero.value
          ? lines.value.filter((row) => (row.amount ?? 0) > 0)
          : lines.value
        if (!allocations.length) {
          ElMessage.warning('请至少填写一行大于0的收款金额')
          return false
        }
        await saveArReceipt({ ...form.value, lines: allocations })
      } else
        await saveArRefund({
          requestId: form.value.requestId,
          originalReceiptId: form.value.originalReceiptId || '',
          amount: form.value.amount ?? 0,
          businessDate: form.value.businessDate || '',
          remark: form.value.remark || ''
        })
      ElMessage.success('草稿已保存')
      emit('success')
      return true
    } catch (error) {
      notifyFriendlyError(error, '单据未保存，请检查金额与来源后重试')
      return false
    }
  }
  async function openReceipt(
    source?: ReceivableDocument,
    cash?: ArOption,
    existing?: ReceiptDocument
  ): Promise<void> {
    mode.value = 'receipt'
    editable.value = true
    loadError.value = undefined
    record.value = existing
    form.value = existing
      ? cloneDeep(existing)
      : {
          requestId: crypto.randomUUID(),
          tenantId:
            source?.tenantId ||
            cash?.tenantId ||
            (useTenantScopeStore().effectiveTenantId ?? useUserStore().getUserInfo.tenantId),
          customerId: source?.customerId || cash?.customerId || '',
          settlementOrganizationId: source?.settlementOrganizationId || '',
          businessDate: cash?.businessDate || dayjs().format('YYYY-MM-DD'),
          currencyCode: source?.currencyCode || cash?.currencyCode || 'CNY',
          paymentMethod: 'bank_transfer',
          fundAccountId: cash?.fundAccountId,
          cashTransactionId: cash?.id,
          remark: ''
        }
    lines.value = existing
      ? cloneDeep(existing.lines)
      : source
        ? (source.lines || [])
            .filter((row) => (row.availableAmount ?? 0) > 0)
            .map((row, index) => ({
              lineNo: (index + 1) * 10,
              financialLineId: row.id,
              amount: row.availableAmount ?? 0,
              sourceNo: source.documentNo,
              remark: ''
            }))
        : [{ lineNo: 10, financialLineId: null, amount: cash?.amount ?? 0, remark: '' }]
    if (source && !lines.value.length) {
      ElMessage.warning('该应收单已无可收款额度')
      return
    }
    retry = async () => openReceipt(source, cash, existing)
    await drawerRef.value?.handleOpen(undefined, {
      title: existing ? '编辑收款单' : '新增收款单',
      showConfirmButton: true,
      onConfirm: save
    })
  }
  async function openRefund(original?: ReceiptDocument, sourceFinancialId?: string): Promise<void> {
    financialId = sourceFinancialId
    mode.value = 'refund'
    editable.value = true
    record.value = undefined
    form.value = {
      requestId: crypto.randomUUID(),
      tenantId:
        original?.tenantId ||
        (useTenantScopeStore().effectiveTenantId ?? useUserStore().getUserInfo.tenantId),
      originalReceiptId: original?.id,
      businessDate: dayjs().format('YYYY-MM-DD'),
      amount: 0,
      remark: ''
    }
    loadError.value = undefined
    retry = async () => openRefund(original, sourceFinancialId)
    await drawerRef.value?.handleOpen(undefined, {
      title: '新增收款退款',
      showConfirmButton: true,
      onConfirm: save
    })
  }
  async function openRefundForFinancial(id: string): Promise<void> {
    await openRefund(undefined, id)
  }
  async function view(row: ReceiptDocument, kind: 'receipt' | 'refund'): Promise<void> {
    mode.value = kind
    editable.value = false
    record.value = row
    lines.value = row.lines || []
    await drawerRef.value?.handleOpen(undefined, {
      title: kind === 'receipt' ? '收款单详情' : '收款退款详情',
      showConfirmButton: false
    })
  }
  defineExpose({ openReceipt, openRefund, openRefundForFinancial, view })
</script>
