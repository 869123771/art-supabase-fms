<template>
  <ArtDialog ref="dialogRef" size="md"
    ><template #subtitle
      >执行后期间进入“关账中”，系统生成九项检查结果；阻断项修复后可重新检查。</template
    >
    <ElAlert v-if="periodLoadFailed" type="error" :closable="false" show-icon class="mb-4">
      <template #title>会计期间加载失败，请重试后再开始检查。</template>
      <ElButton text type="primary" @click="loadPeriods">重新加载期间</ElButton>
    </ElAlert>
    <ArtForm
      ref="formRef"
      v-model="form"
      :items="items"
      :rules="rules"
      :span="24"
      label-width="104px"
      :show-reset="false"
      :show-submit="false"
  /></ArtDialog>
</template>
<script setup lang="ts">
  import { toRef } from 'vue'
  import { useAccountingPeriodOptions } from '../../../modules/use-accounting-period-options'
  import { notifyFriendlyError } from '@/hooks/core/useArtFeedback'
  import { validateArtFormForSubmit } from '@/utils/form/validate-art-form'
  import { createFinancePrerequisiteOverlay } from '../../../modules/use-finance-account-set-prerequisite'
  import type { FormRules } from 'element-plus'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import { fetchAccountSetOptions, runPeriodCloseChecks } from '@fms/api'
  import { ACCOUNTING_SELECT_EMPTY_TEXT } from '../../../modules/accounting-select-text'
  defineOptions({ name: 'FinancePeriodCloseStartDialog' })
  const emit = defineEmits<{ success: [] }>()
  const dialogRef = ref<ArtDialogExpose>()
  const prerequisiteOverlay = createFinancePrerequisiteOverlay(dialogRef)
  const formRef = ref<{ validate: () => Promise<boolean>; clearValidate: () => void }>()
  const accountSetOptions = ref<Api.Fms.AccountSetOption[]>([])
  const form = reactive({ accountSetId: '', periodId: '' })
  const { periodOptions, periodsLoading, periodLoadFailed, loadPeriods, resetPeriods } =
    useAccountingPeriodOptions(
      toRef(form, 'accountSetId'),
      toRef(form, 'periodId'),
      computed(() => Boolean(false)),
      ['open', 'closing']
    )
  const rules: FormRules = {
    accountSetId: [{ required: true, message: '请选择账套', trigger: 'change' }],
    periodId: [{ required: true, message: '请选择会计期间', trigger: 'change' }]
  }
  const items = computed<FormItem[]>(() => [
    {
      label: '所属账套',
      key: 'accountSetId',
      type: 'select',
      props: {
        options: accountSetOptions.value,
        filterable: true,
        onChange: loadPeriods,
        noDataText: ACCOUNTING_SELECT_EMPTY_TEXT.accountSet
      }
    },
    {
      label: '会计期间',
      key: 'periodId',
      type: 'select',
      props: {
        options: periodOptions.value,
        placeholder: '选择开放或关账中期间',
        disabled: !form.accountSetId || periodsLoading.value || periodLoadFailed.value,
        loading: periodsLoading.value,
        noDataText: form.accountSetId
          ? ACCOUNTING_SELECT_EMPTY_TEXT.openAccountingPeriod
          : ACCOUNTING_SELECT_EMPTY_TEXT.chooseAccountSet
      }
    }
  ])
  async function submit() {
    try {
      if (periodsLoading.value || periodLoadFailed.value) return false
      if (!(await validateArtFormForSubmit(formRef.value))) return false
      await runPeriodCloseChecks(form.periodId)
      emit('success')
      return true
    } catch (error) {
      notifyFriendlyError(error, '期末结账检查失败，请稍后重试')
      return false
    }
  }
  async function handleOpen() {
    accountSetOptions.value = []
    resetPeriods()
    form.periodId = ''
    form.accountSetId = ''
    await dialogRef.value?.handleOpen(undefined, {
      title: '执行月末关账检查',
      confirmText: '开始检查',
      loading: true,
      loadingText: '正在加载账套与会计期间…',
      onConfirm: submit,
      onOpen: async () => {
        formRef.value?.clearValidate()
        try {
          const { data, error } = await fetchAccountSetOptions({
            status: 'active',
            from: 0,
            to: 999
          })
          if (error) throw error
          accountSetOptions.value = data ?? []
          form.accountSetId = accountSetOptions.value[0]?.value ?? ''
          await loadPeriods()
        } catch (error) {
          notifyFriendlyError(error, '账套加载失败，请重新打开重试')
          await dialogRef.value?.handleClose()
        } finally {
          prerequisiteOverlay.finishLoading()
        }
      },
      dialogProps: { closeOnClickModal: false }
    })
  }
  defineExpose({ handleOpen, ...prerequisiteOverlay })
</script>
