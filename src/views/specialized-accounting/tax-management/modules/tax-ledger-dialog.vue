<template>
  <ArtDialog ref="dialogRef" size="md"
    ><template #subtitle
      >税率由业务单据或财务人员录入，系统仅校验金额并汇总，不内置固定税率。</template
    ><ArtForm
      root-class="art-form--mobile-stack"
      ref="formRef"
      :model-value="form"
      @update:model-value="replaceReactiveModel(form, $event)"
      :items="items"
      :rules="rules"
      :span="12"
      :gutter="18"
      label-width="104px"
      :show-reset="false"
      :show-submit="false"
  /></ArtDialog>
</template>
<script setup lang="ts">
  import { replaceReactiveModel } from '@/utils/form/model'
  import { notifyFriendlyError } from '@/hooks/core/useArtFeedback'
  import { validateArtFormForSubmit } from '@/utils/form/validate-art-form'
  import { normalizeNullableNumber, normalizeNullableText } from '@/utils/form/normalize'
  import dayjs from 'dayjs'
  import { storeToRefs } from 'pinia'
  import type { FormRules } from 'element-plus'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import { saveTaxLedgerLine } from '@fms/api'
  import { useUserStore } from '@/store/modules/user'
  import { canEditField } from '@/utils/field-permission'
  defineOptions({ name: 'FinanceTaxLedgerDialog' })
  const emit = defineEmits<{ success: [] }>()
  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const booleanOptions = computed(() =>
    (getDictMap.value.commonBoolean ?? []).map((item) => ({
      ...item,
      value: item.value === 'true'
    }))
  )
  const dialogRef = ref<ArtDialogExpose>()
  const formRef = ref<{ validate: () => Promise<boolean>; clearValidate: () => void }>()
  const periodId = ref('')
  const form = reactive<Api.Fms.SaveTaxLedgerLinePayload>({
    sourceType: 'manual',
    sourceNo: null,
    occurredOn: dayjs().format('YYYY-MM-DD'),
    direction: 'output',
    taxableAmount: 0,
    taxRate: null,
    taxAmount: 0,
    isDeductible: true,
    remark: null
  })
  const rules: FormRules = {
    sourceType: [{ required: true, message: '请选择或输入来源类型', trigger: 'change' }],
    occurredOn: [{ required: true, message: '请选择发生日期', trigger: 'change' }],
    direction: [{ required: true, message: '请选择方向', trigger: 'change' }],
    taxAmount: [{ required: true, message: '请输入税额', trigger: 'change' }]
  }
  const items = computed<FormItem[]>(() => [
    { label: '业务来源', key: 'sourceSection', type: 'divider', span: 24 },
    {
      label: '来源类型',
      key: 'sourceType',
      type: 'select',
      props: {
        options: [
          { label: '手工录入', value: 'manual' },
          { label: '发票', value: 'invoice' },
          ...(form.sourceType && !['manual', 'invoice'].includes(form.sourceType)
            ? [{ label: form.sourceType, value: form.sourceType }]
            : [])
        ],
        filterable: true,
        allowCreate: true,
        defaultFirstOption: true,
        placeholder: '选择或输入其他来源代码'
      }
    },
    { label: '来源单号', key: 'sourceNo', type: 'input', props: { maxlength: 120 } },
    {
      label: '发生日期',
      key: 'occurredOn',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', class: '!w-full' }
    },
    {
      label: '税额方向',
      key: 'direction',
      type: 'segment',
      props: { options: getDictMap.value.fmsTaxLedgerDirection ?? [] }
    },
    { label: '计税信息', key: 'amountSection', type: 'divider', span: 24 },
    {
      label: '计税金额',
      key: 'taxableAmount',
      type: 'number',
      props: { min: 0, precision: 2, controlsPosition: 'right', class: '!w-full' }
    },
    {
      label: '税率',
      key: 'taxRate',
      type: 'number',
      description: '以小数录入，例如 0.09 表示 9%。',
      props: { min: 0, precision: 6, step: 0.01, controlsPosition: 'right', class: '!w-full' }
    },
    {
      label: '税额',
      key: 'taxAmount',
      type: 'number',
      props: { min: 0, precision: 2, controlsPosition: 'right', class: '!w-full' }
    },
    {
      label: '允许抵扣',
      key: 'isDeductible',
      type: 'segment',
      props: { options: booleanOptions.value }
    },
    { label: '明细说明', key: 'remarkSection', type: 'divider', span: 24 },
    { label: '备注', key: 'remark', type: 'input', span: 24, props: { type: 'textarea', rows: 3 } }
  ])
  async function submit() {
    try {
      if (!(await validateArtFormForSubmit(formRef.value))) return false
      const { error } = await saveTaxLedgerLine(periodId.value, {
        ...form,
        sourceType: form.sourceType.trim(),
        sourceNo: normalizeNullableText(form.sourceNo),
        remark: normalizeNullableText(form.remark)
      })
      if (error) return false
      emit('success')
      return true
    } catch (error) {
      notifyFriendlyError(error, '税务台账保存失败，请检查内容后重试')
      return false
    }
  }
  async function handleOpen(period: Api.Fms.TaxPeriodRecord, line?: Api.Fms.TaxLedgerLineRecord) {
    const access = line?.fieldAccess ?? period.fieldAccess
    if (!canEditField(access, 'taxSources') || !canEditField(access, 'taxAmounts')) {
      ElMessage.warning('你没有该税务期间来源与税额字段的编辑权限')
      return
    }
    periodId.value = period.id
    Object.assign(form, {
      id: line?.id,
      sourceType: line?.sourceType || 'manual',
      sourceNo: line?.sourceNo || null,
      occurredOn: line?.occurredOn || dayjs().format('YYYY-MM-DD'),
      direction: line?.direction || 'output',
      taxableAmount: normalizeNullableNumber(line?.taxableAmount) ?? 0,
      taxRate: normalizeNullableNumber(line?.taxRate),
      taxAmount: normalizeNullableNumber(line?.taxAmount) ?? 0,
      isDeductible: line?.isDeductible ?? true,
      remark: line?.remark || null
    })
    await dialogRef.value?.handleOpen(undefined, {
      title: line ? '编辑税务明细' : '新增税务明细',
      confirmText: '保存明细',
      loading: true,
      loadingText: '正在加载税务明细…',
      onConfirm: submit,
      onOpen: async (_data, api) => {
        try {
          await Promise.all([
            userStore.ensureDictLoaded('fmsTaxLedgerDirection'),
            userStore.ensureDictLoaded('commonBoolean')
          ])
          formRef.value?.clearValidate()
        } catch (error) {
          notifyFriendlyError(error, '税务明细加载失败，请重新打开重试')
          await dialogRef.value?.handleClose()
        } finally {
          api.setLoading(false)
        }
      },
      dialogProps: { closeOnClickModal: false }
    })
  }
  defineExpose({ handleOpen })
</script>
