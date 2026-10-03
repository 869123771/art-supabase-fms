<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <div v-if="period" class="tax-detail">
      <section class="tax-detail__summary">
        <div>
          <small>税务期间</small>
          <strong><ArtDictDisplay dict-code="fmsTaxType" :value="period.taxType" /></strong>
          <span>
            {{
              period.period ? `${period.period.fiscalYear} 年第 ${period.period.periodNo} 期` : '--'
            }}
          </span>
        </div>
        <ArtDictDisplay dict-code="fmsTaxPeriodStatus" :value="period.status" display="tag" />
      </section>

      <ArtSectionCard
        title="税务台账明细"
        subtitle="销项、进项与调整项目"
        :empty="!lines.length"
        empty-title="暂无税务台账明细"
        empty-description="新增明细后可在此核对计税金额、税率与税额。"
        :empty-visual-size="72"
        :min-height="188"
        preserve-content-structure
      >
        <template v-if="editable" #actions>
          <ElButton
            v-auth="'FinanceTaxManagement:Calculate'"
            type="primary"
            @click="dialogRef?.handleOpen(period)"
          >
            新增明细
          </ElButton>
        </template>
        <ArtTable
          v-if="!isCompact"
          :pagination="false"
          :border="false"
          :show-table-header="false"
          :data="lines"
          row-key="id"
        >
          <ElTableColumn prop="occurredOn" label="日期" width="112" />
          <ElTableColumn v-if="canViewSources" label="来源 / 单号" min-width="190">
            <template #default="{ row }">
              <div class="tax-detail__source">
                <strong :title="row.sourceNo || '--'">{{ row.sourceNo || '--' }}</strong>
                <small>{{ sourceTypeLabel(row.sourceType) }}</small>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="方向" width="86">
            <template #default="{ row }">
              <ArtDictDisplay
                dict-code="fmsTaxLedgerDirection"
                :value="row.direction"
                display="tag"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewAmounts" label="计税金额" min-width="108" align="right">
            <template #default="{ row }">{{ formatProtectedAmount(row.taxableAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewAmounts" label="税率" width="82" align="right">
            <template #default="{ row }">{{ formatProtectedRate(row.taxRate) }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewAmounts" label="税额" min-width="108" align="right">
            <template #default="{ row }">{{ formatProtectedAmount(row.taxAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn v-if="editable" label="操作" width="104" fixed="right">
            <template #default="{ row }">
              <BusinessTableRowActions>
                <ArtButtonTable
                  type="edit"
                  label="编辑税务明细"
                  permission="FinanceTaxManagement:Calculate"
                  @click="editLine(row)"
                />
                <ArtButtonTable
                  type="delete"
                  label="删除税务明细"
                  permission="FinanceTaxManagement:Calculate"
                  @click="remove(row)"
                />
              </BusinessTableRowActions>
            </template>
          </ElTableColumn>
        </ArtTable>
        <div v-else-if="lines.length" class="tax-detail__mobile-list">
          <article v-for="line in lines" :key="line.id" class="tax-detail__mobile-item">
            <div class="tax-detail__mobile-heading">
              <div class="tax-detail__mobile-identity">
                <strong>{{ canViewSources ? line.sourceNo || '税务明细' : '税务明细' }}</strong>
                <small
                  >{{ line.occurredOn
                  }}<template v-if="canViewSources">
                    · {{ sourceTypeLabel(line.sourceType) }}</template
                  ></small
                >
              </div>
              <BusinessTableRowActions v-if="editable">
                <ArtButtonTable
                  type="edit"
                  label="编辑税务明细"
                  permission="FinanceTaxManagement:Calculate"
                  @click="editLine(line)"
                />
                <ArtButtonTable
                  type="delete"
                  label="删除税务明细"
                  permission="FinanceTaxManagement:Calculate"
                  @click="remove(line)"
                />
              </BusinessTableRowActions>
            </div>
            <div class="tax-detail__mobile-direction">
              <ArtDictDisplay
                dict-code="fmsTaxLedgerDirection"
                :value="line.direction"
                display="tag"
              />
            </div>
            <dl v-if="canViewAmounts" class="tax-detail__mobile-amounts">
              <div
                ><dt>计税金额</dt><dd>{{ formatProtectedAmount(line.taxableAmount) }}</dd></div
              >
              <div
                ><dt>税率</dt><dd>{{ formatProtectedRate(line.taxRate) }}</dd></div
              >
              <div
                ><dt>税额</dt><dd>{{ formatProtectedAmount(line.taxAmount) }}</dd></div
              >
            </dl>
          </article>
        </div>
      </ArtSectionCard>
      <TaxLedgerDialog ref="dialogRef" @success="reload" />
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
  import { useAuth } from '@/hooks/core/useAuth'
  import { useArtFeedback } from '@/hooks/core/useArtFeedback'
  import { useRecordDeleteGuard } from '@/hooks/core/useRecordDeleteGuard'
  import { useUserStore } from '@/store/modules/user'
  import { deleteTaxLedgerLine, fetchTaxLedgerLines, fetchTaxPeriodDetail } from '@fms/api'
  import { canEditField, canViewField } from '@/utils/field-permission'
  import { formatCurrencyValue } from '@/utils/ui'
  import TaxLedgerDialog from './tax-ledger-dialog.vue'
  import { useMediaQuery } from '@vueuse/core'
  defineOptions({ name: 'FinanceTaxDetailDrawer' })
  const emit = defineEmits<{ success: [] }>()
  const { hasAuth } = useAuth()
  const userStore = useUserStore()
  const isCompact = useMediaQuery('(max-width: 640px)')
  const { confirmAction } = useArtFeedback()
  const { deleteGuardRef, inspectDeleteReferences } = useRecordDeleteGuard(
    'fms_tax_ledger_line',
    '税务明细'
  )
  const drawerRef = ref<ArtDrawerExpose>()
  const dialogRef = ref<{
    handleOpen: (
      period: Api.Fms.TaxPeriodRecord,
      line?: Api.Fms.TaxLedgerLineRecord
    ) => Promise<void>
  }>()
  const period = ref<Api.Fms.TaxPeriodRecord>()
  const lines = ref<Api.Fms.TaxLedgerLineRecord[]>([])
  const canViewSources = computed(() => canViewField(period.value?.fieldAccess, 'taxSources'))
  const canViewAmounts = computed(() => canViewField(period.value?.fieldAccess, 'taxAmounts'))
  const editable = computed(
    () =>
      hasAuth('FinanceTaxManagement:Calculate') &&
      Boolean(period.value && ['draft', 'calculated'].includes(period.value.status)) &&
      canEditField(period.value?.fieldAccess, 'taxSources') &&
      canEditField(period.value?.fieldAccess, 'taxAmounts')
  )
  async function reload() {
    if (!period.value) return
    const { data } = await fetchTaxLedgerLines(period.value.id)
    lines.value = data ?? []
    emit('success')
  }
  function editLine(rawRow: object): void {
    if (!period.value) return
    void dialogRef.value?.handleOpen(period.value, rawRow as Api.Fms.TaxLedgerLineRecord)
  }

  async function remove(rawRow: object) {
    const row = rawRow as Api.Fms.TaxLedgerLineRecord
    if (await inspectDeleteReferences([{ id: row.id, label: row.sourceNo || '税务明细' }])) return
    try {
      await confirmAction('确定删除该税务台账明细吗？', '删除税务明细', { type: 'warning' })
    } catch {
      return
    }
    try {
      await deleteTaxLedgerLine(row.id)
      await reload()
    } catch {
      await inspectDeleteReferences([{ id: row.id, label: row.sourceNo || '税务明细' }])
    }
  }
  async function handleOpen(row: Api.Fms.TaxPeriodRecord) {
    await userStore.ensureDictLoaded('fmsTaxLedgerDirection')
    period.value = row
    lines.value = []
    await drawerRef.value?.handleOpen(undefined, {
      title: '税务期间详情',
      size: 'xl',
      contentHeight: 'calc(100vh - 132px)',
      loading: true,
      loadingText: '正在加载税务明细…',
      onOpen: async (_data, api) => {
        try {
          period.value = (await fetchTaxPeriodDetail(row.id)).data ?? row
          await reload()
        } finally {
          api.setLoading(false)
        }
      },
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: true }
    })
  }
  function formatProtectedAmount(value: Api.Fms.SensitiveNumber | undefined | null): string {
    if (value === null || value === undefined || value === '') return '--'
    return formatCurrencyValue(value)
  }
  function formatProtectedRate(value: Api.Fms.SensitiveNumber | undefined | null): string {
    if (value === null || value === undefined || value === '') return '--'
    if (typeof value === 'string') return value
    return `${(value * 100).toFixed(4)}%`
  }
  function sourceTypeLabel(value: string | null | undefined): string {
    if (value === 'manual') return '手工录入'
    if (value === 'invoice') return '发票'
    return value?.trim() || '--'
  }
  defineExpose({ handleOpen })
</script>
<style scoped lang="scss">
  .tax-detail {
    display: grid;
    gap: 18px;
  }

  .tax-detail__summary {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
  }

  .tax-detail__summary > div {
    display: grid;
    gap: 4px;
  }

  .tax-detail small,
  .tax-detail span {
    color: var(--el-text-color-secondary);
  }

  .tax-detail__source {
    display: grid;
    gap: 2px;
    min-width: 0;

    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
      white-space: nowrap;
    }

    small {
      font-size: 12px;
    }
  }

  .tax-detail__mobile-list {
    display: grid;
    gap: 10px;
  }

  .tax-detail__mobile-item {
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
  }

  .tax-detail__mobile-heading {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .tax-detail__mobile-identity {
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

  .tax-detail__mobile-direction {
    margin-top: 10px;
  }

  .tax-detail__mobile-amounts {
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
