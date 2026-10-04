<template>
  <ArtDialog ref="dialogRef" size="xl">
    <section class="reimbursement-dialog__summary art-card-xs" aria-label="本次报销摘要">
      <article>
        <span class="is-primary"><ArtSvgIcon icon="ri:money-cny-circle-line" /></span>
        <div>
          <small>本次报销金额</small>
          <strong>{{ money(totalAmount) }}</strong>
          <p>合并所选费用后生成</p>
        </div>
      </article>
      <article>
        <span class="is-info"><ArtSvgIcon icon="ri:file-list-3-line" /></span>
        <div>
          <small>费用明细</small>
          <strong>{{ state.expenses.length }} 笔</strong>
          <p>{{ relatedWaybillLabel }}</p>
        </div>
      </article>
      <article>
        <span class="is-warning"><ArtSvgIcon icon="ri:time-line" /></span>
        <div>
          <small>费用核销状态</small>
          <ArtDictDisplay
            dict-code="tmsWaybillCostSettlementStatus"
            value="pending_payment"
            display="tag"
          />
          <p>付款登记后自动更新为已支付</p>
        </div>
      </article>
    </section>

    <ElAlert
      v-if="!attachmentTenantId"
      class="mb-4"
      type="warning"
      :closable="false"
      show-icon
      title="无法确定费用所属租户，暂不能上传补充附件"
    />

    <ArtForm
      ref="formRef"
      v-model="form.data"
      :items="form.items"
      :rules="form.rules"
      :span="isCompact ? 24 : 12"
      :gutter="20"
      :show-reset="false"
      :show-submit="false"
    >
      <template #basisUrls>
        <ArtUploadImage
          v-model="form.data.basisUrls"
          title="上传附件"
          :size="96"
          :limit="5"
          :resource-tenant-id="attachmentTenantId"
          :disabled="!attachmentTenantId"
          multiple
        />
      </template>
    </ArtForm>

    <section class="reimbursement-dialog__items">
      <div class="reimbursement-dialog__items-head">
        <div>
          <ArtSectionTitle :show-line="false">费用上报明细</ArtSectionTitle>
          <p>原费用单的运输、票据、上报和审核信息将一并关联到报销单。</p>
        </div>
        <div class="reimbursement-dialog__items-total">
          <span>合计</span>
          <strong>{{ money(totalAmount) }}</strong>
        </div>
      </div>
      <ArtTable
        :data="state.expenses"
        :columns="columns"
        :pagination="false"
        height="auto"
        :show-table-header="false"
        table-layout="auto"
        max-height="320px"
      />
    </section>
  </ArtDialog>
</template>

<script setup lang="tsx">
  import { notifyFriendlyError } from '@/hooks/core/useArtFeedback'
  import { validateArtFormForSubmit } from '@/utils/form/validate-art-form'
  import { normalizeNullableText } from '@/utils/form/normalize'
  import dayjs from 'dayjs'
  import { uniq } from 'lodash-es'
  import { useMediaQuery } from '@vueuse/core'
  import type { ComputedRef } from 'vue'
  import { ElMessage, type FormRules } from 'element-plus'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtUploadImage from '@/components/core/forms/art-upload-image/index.vue'
  import ArtSectionTitle from '@/components/core/surfaces/art-section-title/index.vue'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import type { ColumnOption } from '@/types'
  import { createExpenseReimbursement } from '@fms/api'
  import { useUserStore } from '@/store/modules/user'
  import { useTenantScopeStore } from '@/store/modules/tenant-scope'
  import { formatWithDayjs } from '@/utils/time'
  import { formatCurrencyValue } from '@/utils/ui'
  import { useDocumentNumberRule } from '@/hooks/core/useDocumentNumberRule'
  import {
    cloneReimbursementExpenses,
    validateReimbursementSelection
  } from './reimbursement-selection'

  defineOptions({ name: 'FinanceWaybillExpenseReimbursementDialog' })

  type Expense = Api.Fms.WaybillCostRecord

  interface ReimbursementForm {
    reimbursementNo: string
    payeeName: string
    payeeBank: string
    payeeAccount: string
    plannedPaymentDate: string
    paymentMethod: Api.Fms.CashPaymentMethod
    basisUrls: string[]
    remark: string
  }

  interface FormGroup {
    data: ReimbursementForm
    items: ComputedRef<FormItem[]>
    rules: FormRules<ReimbursementForm>
  }

  interface FormExpose {
    validate: () => Promise<boolean>
    clearValidate: () => void
  }

  const emit = defineEmits<{ success: [] }>()
  const isCompact = useMediaQuery('(max-width: 767px)')
  const userStore = useUserStore()
  const { getDictMap, getUserInfo } = storeToRefs(userStore)
  const tenantScopeStore = useTenantScopeStore()
  const dialogRef = ref<ArtDialogExpose<{ expenses: Expense[] }>>()
  const formRef = ref<FormExpose>()
  const state = reactive<{ expenses: Expense[] }>({ expenses: [] })
  const attachmentTenantId = computed(() => {
    const expenseTenantIds = uniq(state.expenses.map((item) => item.tenantId).filter(Boolean))
    if (expenseTenantIds.length > 1) return ''
    return expenseTenantIds[0] || tenantScopeStore.effectiveTenantId || ''
  })
  const reimbursementNumber = useDocumentNumberRule('tms.expense_reimbursement')

  const currentUserName = computed(
    () => getUserInfo.value.nickName || getUserInfo.value.userName || getUserInfo.value.email || ''
  )

  const createInitialForm = (): ReimbursementForm => ({
    reimbursementNo: '',
    payeeName: currentUserName.value,
    payeeBank: '',
    payeeAccount: '',
    plannedPaymentDate: dayjs().format('YYYY-MM-DD'),
    paymentMethod: 'bank_transfer',
    basisUrls: [],
    remark: ''
  })

  const form = reactive<FormGroup>({
    data: createInitialForm(),
    rules: {
      reimbursementNo: [
        {
          validator: (_rule, value, callback) =>
            reimbursementNumber.manualRequired(false) && !String(value || '').trim()
              ? callback(new Error('请输入费用报销单号'))
              : callback(),
          trigger: 'blur'
        }
      ],
      payeeName: [{ required: true, message: '请填写实际收款人', trigger: 'blur' }],
      plannedPaymentDate: [{ required: true, message: '请选择计划付款日期', trigger: 'change' }],
      paymentMethod: [{ required: true, message: '请选择付款方式', trigger: 'change' }]
    },
    items: computed<FormItem[]>(() => [
      { label: '报销申请', key: 'payeeSection', type: 'divider', span: 24 },
      {
        label: '报销单号',
        key: 'reimbursementNo',
        type: 'input',
        props: {
          maxlength: 50,
          ...reimbursementNumber.inputProps(false, '请输入费用报销单号')
        },
        description: reimbursementNumber.description.value
      },
      {
        label: '收款人',
        key: 'payeeName',
        type: 'input',
        props: {
          maxlength: 200,
          clearable: true,
          placeholder: '请选择或填写实际垫付员工、司机或收款人'
        },
        description: '默认当前登录人，可按实际报销关系修改。'
      },
      {
        label: '计划付款日',
        key: 'plannedPaymentDate',
        type: 'date',
        props: { valueFormat: 'YYYY-MM-DD', class: '!w-full' }
      },
      {
        label: '付款方式',
        key: 'paymentMethod',
        type: 'select',
        props: { options: getDictMap.value.tmsCashPaymentMethod ?? [] }
      },
      {
        label: '开户银行',
        key: 'payeeBank',
        type: 'input',
        props: { maxlength: 200, placeholder: '非转账可不填' }
      },
      {
        label: '收款账号',
        key: 'payeeAccount',
        type: 'input',
        span: 24,
        props: { maxlength: 200, placeholder: '银行卡号或收款账户，可选' }
      },
      { label: '说明与依据', key: 'basisSection', type: 'divider', span: 24 },
      {
        label: '报销说明',
        key: 'remark',
        type: 'textarea',
        span: 24,
        props: {
          rows: 2,
          maxlength: 500,
          showWordLimit: true,
          placeholder: '说明报销用途、收款安排或需财务关注的事项'
        }
      },
      { label: '补充附件', key: 'basisUrls', type: 'input', span: 24 }
    ])
  })

  const totalAmount = computed(() =>
    state.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  )
  const relatedWaybillLabel = computed(() => {
    const waybillNo = state.expenses.find((item) => item.waybillNoSnapshot)?.waybillNoSnapshot
    return waybillNo ? `关联运单 ${waybillNo}` : '关联同一运单'
  })
  const columns: ColumnOption<Expense>[] = [
    { prop: 'costNo', label: '费用单号', width: 190 },
    { prop: 'waybillNoSnapshot', label: '运单号', width: 180 },
    {
      prop: 'expenseItem.itemName',
      label: '费用项目',
      width: 130,
      formatter: (row) => row.expenseItem?.itemName || '--'
    },
    {
      prop: 'amount',
      label: '报销金额',
      width: 130,
      align: 'right',
      formatter: (row) => money(row.amount)
    },
    {
      prop: 'occurredOn',
      label: '发生日期',
      width: 120,
      formatter: (row) => formatWithDayjs(row.occurredOn, 'YYYY-MM-DD')
    },
    {
      prop: 'providerName',
      label: '服务商',
      width: 150,
      showOverflowTooltip: true,
      formatter: (row) => emptyText(row.providerName)
    },
    {
      prop: 'attachments',
      label: '附件',
      width: 90,
      align: 'center',
      formatter: (row) => `${row.attachments?.length ?? 0} 份`
    }
  ]

  function money(value: Api.Fms.SensitiveNumber): string {
    if (value === null || value === undefined) return '--'
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? formatCurrencyValue(numericValue) : String(value)
  }

  function emptyText(value?: string | null): string {
    return value || '--'
  }

  async function handleSubmit(): Promise<boolean> {
    try {
      if (!(await validateArtFormForSubmit(formRef.value))) return false
    } catch (error) {
      notifyFriendlyError(error, '运单报销校验失败，请重试')
      return false
    }
    try {
      await createExpenseReimbursement({
        reimbursementNo: normalizeNullableText(form.data.reimbursementNo),
        costIds: state.expenses.flatMap((item) => (item.id ? [item.id] : [])),
        payeeName: form.data.payeeName.trim(),
        payeeBank: normalizeNullableText(form.data.payeeBank),
        payeeAccount: normalizeNullableText(form.data.payeeAccount),
        plannedPaymentDate: form.data.plannedPaymentDate,
        paymentMethod: form.data.paymentMethod,
        basisUrls: [...form.data.basisUrls],
        remark: normalizeNullableText(form.data.remark)
      })
      emit('success')
      return true
    } catch (error) {
      notifyFriendlyError(error, '运单报销保存失败，请检查内容后重试')
      return false
    }
  }

  async function resetForm(): Promise<void> {
    Object.assign(form.data, createInitialForm())
    state.expenses = []
    await nextTick()
    formRef.value?.clearValidate()
  }

  async function handleOpen(expenses: Expense[]): Promise<void> {
    await userStore.ensureDictLoaded('tmsCashPaymentMethod')
    const validation = validateReimbursementSelection(expenses)
    if (!validation.valid) {
      ElMessage.warning(validation.message)
      return
    }

    await resetForm()
    state.expenses = cloneReimbursementExpenses(expenses)
    const fallbackPayee =
      expenses.find((item) => item.payeeName)?.payeeName ||
      expenses.find((item) => item.driverNameSnapshot)?.driverNameSnapshot ||
      ''
    form.data.payeeName = currentUserName.value || fallbackPayee || ''
    form.data.basisUrls = uniq(expenses.flatMap((item) => item.attachments ?? [])).slice(0, 5)
    await dialogRef.value?.handleOpen(
      { expenses },
      {
        title: `转费用报销 · ${expenses.length} 笔`,
        subtitle: '报销审批通过后由出纳登记付款，付款完成即逐笔核销运单费用',
        confirmText: '生成报销单',
        contentMaxHeight: '78vh',
        loading: true,
        loadingText: '正在加载编号规则…',
        onOpen: async (_openData, api) => {
          try {
            await reimbursementNumber.loadRule()
          } finally {
            api.setLoading(false)
          }
        },
        onConfirm: handleSubmit,
        onReset: () => void resetForm(),
        dialogProps: { appendToBody: true, closeOnClickModal: false }
      }
    )
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .reimbursement-dialog {
    &__summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      padding: 0;
      margin-bottom: var(--art-space-5);
      overflow: hidden;

      article {
        display: flex;
        gap: var(--art-space-3);
        align-items: center;
        min-width: 0;
        padding: var(--art-space-4);

        &:not(:last-child) {
          border-right: 1px solid var(--el-border-color-lighter);
        }

        > span {
          display: grid;
          flex: 0 0 40px;
          place-items: center;
          width: 40px;
          height: 40px;
          font-size: 19px;
          border-radius: var(--el-border-radius-base);

          &.is-primary {
            color: var(--el-color-primary);
            background: var(--el-color-primary-light-9);
          }

          &.is-info {
            color: var(--el-color-info);
            background: var(--el-color-info-light-9);
          }

          &.is-warning {
            color: var(--el-color-warning);
            background: var(--el-color-warning-light-9);
          }
        }

        > div {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        small,
        p {
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--el-text-color-secondary);
          white-space: nowrap;
        }

        strong {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 18px;
          font-variant-numeric: tabular-nums;
          color: var(--el-text-color-primary);
          white-space: nowrap;
        }

        p {
          margin: 0;
          font-size: 11px;
        }
      }
    }

    &__items {
      min-width: 0;
      margin-top: var(--art-space-5);
    }

    &__items-head {
      display: flex;
      gap: var(--art-space-4);
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: var(--art-space-3);

      > div:first-child {
        min-width: 0;

        p {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }

    &__items-total {
      display: flex;
      flex: 0 0 auto;
      gap: var(--art-space-2);
      align-items: baseline;

      span {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }

      strong {
        font-size: 20px;
        font-variant-numeric: tabular-nums;
        color: var(--el-color-primary);
      }
    }

    @media (width <= 767px) {
      &__summary {
        grid-template-columns: 1fr;

        article:not(:last-child) {
          border-right: 0;
          border-bottom: 1px solid var(--el-border-color-lighter);
        }
      }

      &__items-head {
        align-items: flex-start;

        > div:first-child p {
          white-space: normal;
        }
      }
    }

    @media (width <= 520px) {
      &__items-head {
        flex-direction: column;
      }
    }
  }
</style>
