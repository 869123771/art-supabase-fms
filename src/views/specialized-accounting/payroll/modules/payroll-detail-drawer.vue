<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <div v-if="run" class="payroll-detail">
      <section class="payroll-detail__summary">
        <div>
          <small>薪资批次</small>
          <strong>{{ run.runNo }}</strong>
          <span>{{ formatWithDayjs(run.payrollMonth, 'YYYY-MM') }}</span>
        </div>
        <ArtDictDisplay dict-code="fmsPayrollRunStatus" :value="run.status" display="tag" />
      </section>

      <ArtSectionCard
        title="员工薪资明细"
        subtitle="核对应发、扣款、企业成本与实发金额"
        :empty="!lines.length"
        empty-title="暂无员工薪资明细"
        empty-description="可同步已批准的 HR 薪酬，或手动新增员工明细。"
        :empty-visual-size="72"
        :min-height="188"
        preserve-content-structure
      >
        <template v-if="editable" #actions>
          <div class="payroll-detail__toolbar-actions">
            <ElButton
              v-auth="'FinancePayroll:Calculate'"
              :loading="importing"
              plain
              type="primary"
              @click="importFromHr"
            >
              <ArtSvgIcon icon="ri:download-cloud-2-line" />同步 HR 薪酬
            </ElButton>
            <ElButton
              v-auth="'FinancePayroll:Calculate'"
              type="primary"
              @click="lineDialogRef?.handleOpen(run)"
            >
              新增员工
            </ElButton>
          </div>
        </template>
        <ArtTable
          v-if="!isCompact"
          :pagination="false"
          :border="false"
          :show-table-header="false"
          :data="lines"
          row-key="id"
        >
          <ElTableColumn
            v-if="canViewIdentity"
            prop="employeeNoSnapshot"
            label="工号"
            min-width="140"
          />
          <ElTableColumn
            v-if="canViewIdentity"
            prop="employeeNameSnapshot"
            label="姓名"
            min-width="120"
          />
          <ElTableColumn v-if="canViewAmounts" label="应发" min-width="110" align="right">
            <template #default="{ row }">{{ formatProtectedAmount(row.grossAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewAmounts" label="扣款" min-width="110" align="right">
            <template #default="{ row }">{{ formatProtectedAmount(row.deductionAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewAmounts" label="企业成本" min-width="110" align="right">
            <template #default="{ row }">{{
              formatProtectedAmount(row.employerCostAmount)
            }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewAmounts" label="实发" min-width="110" align="right">
            <template #default="{ row }">{{ formatProtectedAmount(row.netAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="editable" label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <BusinessTableRowActions>
                <ArtButtonTable
                  type="edit"
                  label="编辑员工薪资"
                  permission="FinancePayroll:Calculate"
                  @click="editLine(row)"
                />
                <ArtButtonTable
                  type="delete"
                  label="删除员工薪资"
                  permission="FinancePayroll:Calculate"
                  @click="removeLine(row)"
                />
              </BusinessTableRowActions>
            </template>
          </ElTableColumn>
        </ArtTable>
        <div v-else-if="lines.length" class="payroll-detail__mobile-list">
          <article v-for="line in lines" :key="line.id" class="payroll-detail__mobile-item">
            <div class="payroll-detail__mobile-heading">
              <div class="payroll-detail__employee">
                <strong>{{ canViewIdentity ? line.employeeNameSnapshot : '员工薪资' }}</strong>
                <small v-if="canViewIdentity">{{ line.employeeNoSnapshot }}</small>
              </div>
              <BusinessTableRowActions v-if="editable">
                <ArtButtonTable
                  type="edit"
                  label="编辑员工薪资"
                  permission="FinancePayroll:Calculate"
                  @click="editLine(line)"
                />
                <ArtButtonTable
                  type="delete"
                  label="删除员工薪资"
                  permission="FinancePayroll:Calculate"
                  @click="removeLine(line)"
                />
              </BusinessTableRowActions>
            </div>
            <dl v-if="canViewAmounts" class="payroll-detail__mobile-amounts">
              <div
                ><dt>应发</dt><dd>{{ formatProtectedAmount(line.grossAmount) }}</dd></div
              >
              <div
                ><dt>扣款</dt><dd>{{ formatProtectedAmount(line.deductionAmount) }}</dd></div
              >
              <div
                ><dt>企业成本</dt><dd>{{ formatProtectedAmount(line.employerCostAmount) }}</dd></div
              >
              <div
                ><dt>实发</dt><dd>{{ formatProtectedAmount(line.netAmount) }}</dd></div
              >
            </dl>
          </article>
        </div>
      </ArtSectionCard>
      <PayrollLineDialog ref="lineDialogRef" @success="reload" />
      <MasterDataDeleteGuard ref="deleteGuardRef" />
    </div>
  </ArtDrawer>
</template>
<script setup lang="ts">
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import MasterDataDeleteGuard from '@/components/business/master-data-delete-guard/index.vue'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import { useAuth } from '@/hooks/core/useAuth'
  import { useArtFeedback } from '@/hooks/core/useArtFeedback'
  import { useRecordDeleteGuard } from '@/hooks/core/useRecordDeleteGuard'
  import { useUserStore } from '@/store/modules/user'
  import {
    deletePayrollLine,
    fetchPayrollLines,
    fetchPayrollRunDetail,
    importHrCompensationLines
  } from '@fms/api'
  import { canEditField, canViewField, mergeFieldAccessMaps } from '@/utils/field-permission'
  import { formatCurrencyValue } from '@/utils/ui'
  import { formatWithDayjs } from '@/utils/time'
  import { useMediaQuery } from '@vueuse/core'
  import PayrollLineDialog from './payroll-line-dialog.vue'
  defineOptions({ name: 'FinancePayrollDetailDrawer' })
  const emit = defineEmits<{ success: [] }>()
  const { hasAuth } = useAuth()
  const isCompact = useMediaQuery('(max-width: 640px)')
  const userStore = useUserStore()
  const { confirmAction } = useArtFeedback()
  const { deleteGuardRef, inspectDeleteReferences } = useRecordDeleteGuard(
    'fms_payroll_line',
    '薪资明细'
  )
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
    if (
      await inspectDeleteReferences([{ id: row.id, label: row.employeeNameSnapshot || '员工薪资' }])
    )
      return
    try {
      await confirmAction(
        `确定删除 ${row.employeeNameSnapshot || '该员工'} 的薪资明细吗？`,
        '删除薪资明细',
        {
          type: 'warning'
        }
      )
    } catch {
      return
    }
    try {
      await deletePayrollLine(row.id)
      await reload()
    } catch {
      await inspectDeleteReferences([{ id: row.id, label: row.employeeNameSnapshot || '员工薪资' }])
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
    await userStore.ensureDictLoaded('fmsPayrollRunStatus')
    run.value = row
    lines.value = []
    await drawerRef.value?.handleOpen(undefined, {
      title: `薪资批次详情 · ${row.runNo}`,
      size: 'xl',
      contentHeight: 'calc(100vh - 132px)',
      loading: true,
      loadingText: '正在加载薪资明细…',
      onOpen: async (_data, api) => {
        try {
          run.value = (await fetchPayrollRunDetail(row.id)).data ?? row
          await reload()
        } finally {
          api.setLoading(false)
        }
      },
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: true }
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

  .payroll-detail__summary {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
  }

  .payroll-detail__summary > div {
    display: grid;
    gap: 4px;
  }

  .payroll-detail__toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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

  .payroll-detail__mobile-list {
    display: grid;
    gap: 10px;
  }

  .payroll-detail__mobile-item {
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
  }

  .payroll-detail__mobile-heading {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .payroll-detail__employee {
    display: grid;
    gap: 2px;
    min-width: 0;

    strong,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .payroll-detail__mobile-amounts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 16px;
    padding-top: 12px;
    margin: 12px 0 0;
    border-top: 1px solid var(--el-border-color-lighter);

    div {
      display: grid;
      gap: 3px;
    }

    dt {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    dd {
      margin: 0;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  }
</style>
