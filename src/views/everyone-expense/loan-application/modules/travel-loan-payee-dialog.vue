<template>
  <ArtDialog ref="dialogRef" size="lg">
    <ElAlert
      v-if="payeeOptionsLoaded && !payeeOptions.length"
      class="mb-3"
      type="warning"
      :closable="false"
      title="当前借款人没有可用的收款信息，请先维护收款银行和账号。"
    />
    <ArtForm
      ref="formRef"
      v-model="model"
      :items="items"
      :rules="rules"
      :span="12"
      :gutter="20"
      label-position="top"
      :show-reset="false"
      :show-submit="false"
    />
  </ArtDialog>
</template>

<script setup lang="ts">
  import { useDictionaryOptions } from '@/hooks/core/useDictionaryOptions'
  import { validateArtFormForSubmit } from '@/utils/form/validate-art-form'
  import { normalizeNonNullableText, normalizeNullableText } from '@/utils/form/normalize'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import { fetchLoanPayeeOptions, type LoanPayeeOption, type TravelLoanPayeeInput } from '@fms/api'

  interface OpenData {
    payee?: TravelLoanPayeeInput
    tenantId: string
    borrowerEmployeeId: string
    defaultAmount: number
    copy?: boolean
  }
  const emit = defineEmits<{ save: [payee: TravelLoanPayeeInput] }>()
  const dialogRef = ref<ArtDialogExpose<OpenData>>()
  const formRef = ref<InstanceType<typeof ArtForm>>()
  const settlementOptions = useDictionaryOptions('fmsSettlementMethod')
  const payeeTypeOptions = useDictionaryOptions('fmsPayeeType')
  const tenantId = ref('')
  const borrowerEmployeeId = ref('')
  const payeeOptions = ref<LoanPayeeOption[]>([])
  const payeeOptionsLoaded = ref(false)
  const model = ref<TravelLoanPayeeInput>({
    settlementMethod: 'bank_transfer',
    payeeType: 'person',
    payeeInformationId: '',
    bankAccount: '',
    accountName: null,
    bankName: '',
    amount: 0,
    remark: null
  })

  const items = computed<FormItem[]>(() => [
    {
      key: 'settlementMethod',
      label: '支付方式',
      type: 'select',
      props: { filterable: true, options: settlementOptions }
    },
    {
      key: 'payeeType',
      label: '收款人类型',
      type: 'select',
      props: { options: payeeTypeOptions }
    },
    {
      key: 'payeeInformationId',
      label: '收款人',
      type: 'select',
      api: async () => {
        const result = await fetchLoanPayeeOptions(tenantId.value, borrowerEmployeeId.value)
        payeeOptions.value = result.data ?? []
        payeeOptionsLoaded.value = true
        return result
      },
      labelField: 'payeeName',
      valueField: 'id',
      labelFn: (option) => {
        const payee = option as LoanPayeeOption
        return `${payee.payeeName} · ${payee.bankName} · ${payee.bankAccount.slice(-4)}`
      },
      props: {
        filterable: true,
        placeholder: '从收款信息中选择',
        onChange: (value: string) => selectPayee(value)
      }
    },
    { key: 'bankAccount', label: '银行账号', type: 'input', props: { maxlength: 64 } },
    { key: 'accountName', label: '账户名称', type: 'input', props: { maxlength: 120 } },
    { key: 'bankName', label: '开户银行', type: 'input', props: { maxlength: 120 } },
    {
      key: 'amount',
      label: '收款金额（元）',
      type: 'number',
      props: { min: 0.01, precision: 2, class: 'w-full' }
    },
    {
      key: 'remark',
      label: '备注',
      type: 'input',
      span: 24,
      props: { type: 'textarea', rows: 2, maxlength: 500, showWordLimit: true }
    }
  ])
  const rules = {
    settlementMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
    payeeType: [{ required: true, message: '请选择收款人类型', trigger: 'change' }],
    payeeInformationId: [{ required: true, message: '请选择收款人', trigger: 'change' }],
    bankAccount: [{ required: true, message: '请输入银行账号', trigger: 'blur' }],
    bankName: [{ required: true, message: '请输入开户银行', trigger: 'blur' }],
    amount: [{ required: true, message: '请输入收款金额', trigger: 'change' }]
  }
  function selectPayee(id: string): void {
    const payee = payeeOptions.value.find((item) => item.id === id)
    if (!payee) return
    model.value.bankAccount = payee.bankAccount
    model.value.accountName = payee.accountName
    model.value.bankName = payee.bankName
  }
  async function handleOpen(data: OpenData): Promise<void> {
    tenantId.value = data.tenantId
    borrowerEmployeeId.value = data.borrowerEmployeeId
    payeeOptionsLoaded.value = false
    payeeOptions.value = []
    model.value = {
      settlementMethod: data.payee?.settlementMethod ?? 'bank_transfer',
      payeeType: 'person',
      payeeInformationId: data.payee?.payeeInformationId ?? '',
      bankAccount: data.payee?.bankAccount ?? '',
      accountName: data.payee?.accountName ?? null,
      bankName: data.payee?.bankName ?? '',
      amount: data.payee?.amount ?? data.defaultAmount,
      remark: data.payee?.remark ?? null,
      id: data.copy ? undefined : data.payee?.id
    }
    await dialogRef.value?.handleOpen(data, {
      title: data.copy ? '复制收款明细' : data.payee ? '编辑收款明细' : '添加收款信息',
      subtitle: '选择收款资料后自动带入银行信息，保存前仍可核对和修正。',
      confirmText: data.payee && !data.copy ? '保存收款明细' : '添加收款明细',
      onOpen: () => formRef.value?.clearValidate(),
      onConfirm: async () => {
        if (!(await validateArtFormForSubmit(formRef.value))) return false
        if (model.value.amount <= 0) return false
        emit('save', {
          ...model.value,
          payeeName:
            payeeOptions.value.find((item) => item.id === model.value.payeeInformationId)
              ?.payeeName ?? data.payee?.payeeName,
          bankAccount: normalizeNonNullableText(model.value.bankAccount),
          accountName: normalizeNullableText(model.value.accountName),
          bankName: normalizeNonNullableText(model.value.bankName),
          remark: normalizeNullableText(model.value.remark)
        })
        return true
      }
    })
  }
  defineExpose({ handleOpen })
</script>
