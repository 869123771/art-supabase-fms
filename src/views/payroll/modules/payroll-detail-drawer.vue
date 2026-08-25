<template>
  <ArtDrawer ref="drawerRef" :show-footer="false"
    ><div v-if="run" class="payroll-detail"
      ><section class="payroll-detail__summary"
        ><div
          ><small>薪资批次</small><strong>{{ run.runNo }}</strong
          ><span>{{ formatWithDayjs(run.payrollMonth, 'YYYY-MM') }}</span></div
        ><ArtDictDisplay
          dict-code="fmsPayrollRunStatus"
          :value="run.status"
          display="tag" /></section
      ><div class="payroll-detail__toolbar"
        ><div><strong>员工薪资明细</strong><small>应发、扣款、企业成本与实发金额</small></div
        ><div v-if="editable" class="payroll-detail__toolbar-actions"
          ><ElButton
            v-auth="'FinancePayroll:Calculate'"
            :loading="importing"
            plain
            type="primary"
            @click="importFromHr"
            ><ArtSvgIcon icon="ri:download-cloud-2-line" />同步 HR 薪酬</ElButton
          ><ElButton
            v-auth="'FinancePayroll:Calculate'"
            type="primary"
            @click="lineDialogRef?.handleOpen(run)"
            >新增员工</ElButton
          ></div
        ></div
      ><ElTable :data="lines" row-key="id"
        ><ElTableColumn
          v-if="canViewIdentity"
          prop="employeeNoSnapshot"
          label="工号"
          min-width="110"
        /><ElTableColumn
          v-if="canViewIdentity"
          prop="employeeNameSnapshot"
          label="姓名"
          min-width="120"
        /><ElTableColumn v-if="canViewAmounts" label="应发" min-width="120" align="right"
          ><template #default="{ row }">{{
            formatProtectedAmount(row.grossAmount)
          }}</template></ElTableColumn
        ><ElTableColumn v-if="canViewAmounts" label="扣款" min-width="120" align="right"
          ><template #default="{ row }">{{
            formatProtectedAmount(row.deductionAmount)
          }}</template></ElTableColumn
        ><ElTableColumn v-if="canViewAmounts" label="企业成本" min-width="120" align="right"
          ><template #default="{ row }">{{
            formatProtectedAmount(row.employerCostAmount)
          }}</template></ElTableColumn
        ><ElTableColumn v-if="canViewAmounts" label="实发" min-width="120" align="right"
          ><template #default="{ row }">{{
            formatProtectedAmount(row.netAmount)
          }}</template></ElTableColumn
        ><ElTableColumn v-if="editable" label="操作" width="110" fixed="right"
          ><template #default="{ row }"
            ><ElButton
              v-auth="'FinancePayroll:Calculate'"
              link
              type="primary"
              @click="editLine(row)"
              >编辑</ElButton
            ><ElButton
              v-auth="'FinancePayroll:Calculate'"
              link
              type="danger"
              @click="removeLine(row)"
              >删除</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      ><PayrollLineDialog ref="lineDialogRef" @success="reload" /></div
  ></ArtDrawer>
</template>
<script setup lang="ts">
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import { useAuth } from '@/hooks/core/useAuth'
  import { useArtFeedback } from '@/hooks/core/useArtFeedback'
  import {
    deletePayrollLine,
    fetchPayrollLines,
    fetchPayrollRunDetail,
    importHrCompensationLines
  } from '@fms/api'
  import { canEditField, canViewField, mergeFieldAccessMaps } from '@/utils/field-permission'
  import { formatCurrencyValue } from '@/utils/ui'
  import { formatWithDayjs } from '@/utils/time'
  import PayrollLineDialog from './payroll-line-dialog.vue'
  defineOptions({ name: 'FinancePayrollDetailDrawer' })
  const emit = defineEmits<{ success: [] }>()
  const { hasAuth } = useAuth()
  const { confirmAction } = useArtFeedback()
  const drawerRef = ref<ArtDrawerExpose>()
  const lineDialogRef = ref<{
    handleOpen: (run: Api.Fms.PayrollRunRecord, line?: Api.Fms.PayrollLineRecord) => Promise<void>
  }>()
  const run = ref<Api.Fms.PayrollRunRecord>()
  const lines = ref<Api.Fms.PayrollLineRecord[]>([])
  const importing = ref(false)
  const lineFieldAccess = ref<Api.Fms.PayrollFieldAccessMap>({})
  const effectiveLineAccess = computed(() =>
    mergeFieldAccessMaps(lineFieldAccess.value, ...lines.value.map((line) => line.fieldAccess))
  )
  const canViewIdentity = computed(() =>
    canViewField(effectiveLineAccess.value, 'employeeIdentity')
  )
  const canViewAmounts = computed(() => canViewField(effectiveLineAccess.value, 'salaryAmounts'))
  const editable = computed(
    () =>
      hasAuth('FinancePayroll:Calculate') &&
      Boolean(run.value && ['draft', 'calculated'].includes(run.value.status)) &&
      canEditField(lineFieldAccess.value, 'employeeIdentity') &&
      canEditField(lineFieldAccess.value, 'salaryAmounts')
  )
  async function reload(): Promise<void> {
    if (!run.value) return
    const result = await fetchPayrollLines(run.value.id)
    lines.value = result.data ?? []
    lineFieldAccess.value = result.fieldAccess
    emit('success')
  }
  function editLine(rawRow: object): void {
    if (!run.value) return
    void lineDialogRef.value?.handleOpen(run.value, rawRow as Api.Fms.PayrollLineRecord)
  }

  async function removeLine(rawRow: object): Promise<void> {
    const row = rawRow as Api.Fms.PayrollLineRecord
    try {
      await confirmAction(
        `确定删除 ${row.employeeNameSnapshot || '该员工'} 的薪资明细吗？`,
        '删除薪资明细',
        {
          type: 'warning'
        }
      )
      await deletePayrollLine(row.id)
      await reload()
    } catch {
      /* 用户取消 */
    }
  }
  async function importFromHr(): Promise<void> {
    if (!run.value) return
    try {
      await confirmAction(
        '系统将导入本薪资月份已批准且有效的 HR 薪酬。已有员工明细会保留，不会被覆盖。',
        '同步 HR 薪酬',
        { confirmButtonText: '开始同步', cancelButtonText: '取消', type: 'warning' }
      )
      importing.value = true
      const response = await importHrCompensationLines(run.value.id)
      const result = response.data
      if (!result?.eligibleCount) {
        ElMessage.warning('该月份暂无已批准的 HR 员工薪酬，请先在 HR 薪酬管理中完成定薪与批准')
      } else if (!result.importedCount) {
        ElMessage.info(`符合条件的 ${result.skippedCount} 名员工均已有薪资明细，本次未覆盖`)
      } else {
        ElMessage.success(
          `已导入 ${result.importedCount} 名员工，保留 ${result.skippedCount} 条已有明细`
        )
      }
      await reload()
    } catch {
      /* 用户取消或服务端权限、状态校验失败时保持当前明细。 */
    } finally {
      importing.value = false
    }
  }
  async function handleOpen(row: Api.Fms.PayrollRunRecord): Promise<void> {
    run.value = (await fetchPayrollRunDetail(row.id)).data ?? row
    await reload()
    await drawerRef.value?.handleOpen(undefined, {
      title: `薪资批次详情 · ${row.runNo}`,
      size: 'xl',
      contentHeight: 'calc(100vh - 132px)',
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: false }
    })
  }
  function formatProtectedAmount(value: Api.Fms.SensitiveNumber | undefined): string {
    if (value === null || value === undefined || value === '') return '--'
    return formatCurrencyValue(value)
  }
  defineExpose({ handleOpen })
</script>
<style scoped lang="scss">
  .payroll-detail {
    display: grid;
    gap: 18px;
  }

  .payroll-detail__summary,
  .payroll-detail__toolbar {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
  }

  .payroll-detail__summary > div,
  .payroll-detail__toolbar > div {
    display: grid;
    gap: 4px;
  }

  .payroll-detail__toolbar-actions {
    display: flex !important;
    grid-auto-flow: column;
    gap: 8px !important;
    align-items: center;

    svg {
      width: 16px;
      height: 16px;
      margin-right: 5px;
    }
  }

  .payroll-detail small,
  .payroll-detail span {
    color: var(--el-text-color-secondary);
  }
</style>
