<template>
  <ArtDrawer ref="drawerRef" header-icon="ri:bar-chart-box-line" size="xl" :show-footer="false">
    <div class="statement-config-drawer">
      <ArtSectionCard title="报表配置概览" preserve-content-structure>
        <ArtDescriptions :data="{}" :items="summaryItems" :columns="2" label-width="104px" />
      </ArtSectionCard>

      <ArtSectionCard
        title="账套报表项目"
        subtitle="项目结构决定报表展示，科目映射与公式关系决定可审计取数口径。"
        :loading="loading"
        :error="loadError"
        @retry="loadConfiguration"
        :empty="!items.length"
        empty-title="尚未配置报表项目"
        empty-description="初始化标准项目，或新增一条报表项目开始配置。"
        :empty-visual-size="64"
        :min-height="164"
        :show-scrollbar="false"
      >
        <template v-if="canEditBaseRules" #actions>
          <div class="statement-config-drawer__actions">
            <ElButton :loading="loading" :disabled="Boolean(loadError)" @click="initializeItems">
              <ArtSvgIcon icon="ri:magic-line" />
              初始化标准项目
            </ElButton>
            <ElButton
              type="primary"
              :disabled="loading || Boolean(loadError)"
              @click="openItemDialog()"
            >
              <ArtSvgIcon icon="ri:add-line" />
              新增项目
            </ElButton>
          </div>
        </template>

        <div
          v-if="isNarrow && !loading && items.length"
          class="statement-config-drawer__mobile-list"
        >
          <article
            v-for="item in items"
            :key="item.id"
            class="statement-config-drawer__mobile-item"
          >
            <div class="statement-config-drawer__mobile-heading">
              <div class="statement-config-drawer__item">
                <strong>{{ item.itemName }}</strong>
                <small translate="no">{{ item.itemCode }} · 行次 {{ item.lineNo }}</small>
              </div>
              <ElTag :type="item.isEnabled ? 'success' : 'info'" effect="plain" size="small">
                {{ item.isEnabled ? '启用' : '停用' }}
              </ElTag>
            </div>
            <dl class="statement-config-drawer__mobile-details">
              <div>
                <dt>计算方式</dt>
                <dd>{{ dictLabel('fmsStatementCalculationMethod', item.calculationMethod) }}</dd>
              </div>
              <div>
                <dt>行样式</dt>
                <dd>{{ dictLabel('fmsStatementDisplayStyle', item.displayStyle) }}</dd>
              </div>
              <div v-if="statementType === 'cash_flow_statement'">
                <dt>流量方向</dt>
                <dd>{{ dictLabel('fmsCashFlowDirection', item.cashFlowDirection) || '--' }}</dd>
              </div>
              <div v-if="canViewRules">
                <dt>规则数</dt>
                <dd>{{ item.calculationMethod === 'label' ? '--' : (item.ruleCount ?? '--') }}</dd>
              </div>
            </dl>
            <div v-if="canViewRules" class="statement-config-drawer__mobile-actions">
              <BusinessTableRowActions>
                <ArtButtonTable
                  v-if="canEditRowRules(item)"
                  type="edit"
                  label="编辑报表项目"
                  permission="FinanceFinancialReports:EditConfig"
                  @click="openItemDialog(item)"
                />
                <ArtButtonTable
                  v-if="canConfigureRule(item) && canReadRowRules(item)"
                  :type="canEditRowRules(item) ? 'edit' : 'view'"
                  :icon="canEditRowRules(item) ? 'ri:function-line' : undefined"
                  :label="ruleActionLabel(item)"
                  :permission="
                    canEditRowRules(item)
                      ? 'FinanceFinancialReports:EditConfig'
                      : 'FinanceFinancialReports:ViewConfig'
                  "
                  @click="openRuleDialog(item)"
                />
              </BusinessTableRowActions>
            </div>
          </article>
        </div>

        <ArtTable
          v-else-if="!isNarrow"
          :border="false"
          :data="items"
          :pagination="false"
          height="auto"
          :show-table-header="false"
          row-key="id"
          table-layout="fixed"
          max-height="calc(100vh - 320px)"
        >
          <ElTableColumn label="项目" min-width="170">
            <template #default="{ row }">
              <div
                class="statement-config-drawer__item"
                :style="{ paddingLeft: `${Math.max(row.itemLevel - 1, 0) * 14}px` }"
              >
                <strong>{{ row.itemName }}</strong>
                <small translate="no">{{ row.itemCode }} · 行次 {{ row.lineNo }}</small>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn label="计算方式" width="92">
            <template #default="{ row }">
              <ElTag :type="calculationTag(row.calculationMethod)" effect="plain">
                {{ dictLabel('fmsStatementCalculationMethod', row.calculationMethod) }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="行样式" width="76">
            <template #default="{ row }">
              {{ dictLabel('fmsStatementDisplayStyle', row.displayStyle) }}
            </template>
          </ElTableColumn>
          <ElTableColumn v-if="statementType === 'cash_flow_statement'" label="流量方向" width="90">
            <template #default="{ row }">
              {{ dictLabel('fmsCashFlowDirection', row.cashFlowDirection) || '--' }}
            </template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewRules" label="规则数" width="76" align="right">
            <template #default="{ row }">
              {{ row.calculationMethod === 'label' ? '--' : (row.ruleCount ?? '--') }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="66" align="center">
            <template #default="{ row }">
              <ElTag :type="row.isEnabled ? 'success' : 'info'" effect="plain">
                {{ row.isEnabled ? '启用' : '停用' }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn v-if="canViewRules" label="操作" width="108" align="center">
            <template #default="{ row }">
              <BusinessTableRowActions>
                <ArtButtonTable
                  v-if="canEditRowRules(row)"
                  type="edit"
                  label="编辑报表项目"
                  permission="FinanceFinancialReports:EditConfig"
                  @click="openItemDialog(row)"
                />
                <ArtButtonTable
                  v-if="canConfigureRule(row) && canReadRowRules(row)"
                  :type="canEditRowRules(row) ? 'edit' : 'view'"
                  :icon="canEditRowRules(row) ? 'ri:function-line' : undefined"
                  :label="ruleActionLabel(row)"
                  :permission="
                    canEditRowRules(row)
                      ? 'FinanceFinancialReports:EditConfig'
                      : 'FinanceFinancialReports:ViewConfig'
                  "
                  @click="openRuleDialog(row)"
                />
              </BusinessTableRowActions>
            </template>
          </ElTableColumn>
        </ArtTable>
      </ArtSectionCard>
    </div>

    <StatementItemDialog ref="itemDialogRef" @success="handleConfigurationSaved" />
    <StatementRuleDialog ref="ruleDialogRef" @success="handleConfigurationSaved" />
  </ArtDrawer>
</template>

<script setup lang="ts">
  import { useMediaQuery } from '@vueuse/core'
  import { storeToRefs } from 'pinia'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import ArtDescriptions from '@/components/core/base/art-descriptions/index.vue'
  import type { ArtDescriptionItem } from '@/components/core/base/art-descriptions/types'
  import StatementItemDialog from './statement-item-dialog.vue'
  import StatementRuleDialog from './statement-rule-dialog.vue'
  import {
    fetchFinancialStatementItems,
    fetchSubjectList,
    initializeFinancialStatementItems
  } from '@fms/api'
  import { useUserStore } from '@/store/modules/user'
  import { useAuth } from '@/hooks/core/useAuth'
  import { useArtFeedback } from '@/hooks/core/useArtFeedback'
  import { canEditField, getFieldAccess, mergeFieldAccessMaps } from '@/utils/field-permission'
  import {
    statementOptionLabel,
    type FinancialStatementOptionCode
  } from '../../../modules/financial-statement-options'

  defineOptions({ name: 'FinanceStatementConfigDrawer' })

  type Item = Api.Fms.FinancialStatementItemRecord

  const emit = defineEmits<{ success: [] }>()
  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const { hasAuth } = useAuth()
  const { confirmAction } = useArtFeedback()
  const canEditConfigButton = computed(() => hasAuth('FinanceFinancialReports:EditConfig'))
  const drawerRef = ref<ArtDrawerExpose>()
  const itemDialogRef = ref<InstanceType<typeof StatementItemDialog>>()
  const ruleDialogRef = ref<InstanceType<typeof StatementRuleDialog>>()
  const accountSetId = ref('')
  const statementType = ref<Api.Fms.FinancialStatementType>('balance_sheet')
  const items = ref<Item[]>([])
  const subjects = ref<Api.Fms.SubjectRecord[]>([])
  const listFieldAccess = ref<Api.Fms.FinancialReportFieldAccessMap>({})
  const loading = ref(false)
  const loadError = ref('')
  const isNarrow = useMediaQuery('(max-width: 640px)')

  const statementTypeLabel = computed(() =>
    dictLabel('fmsFinancialStatementType', statementType.value)
  )
  const mappingItemCount = computed(
    () => items.value.filter((item) => item.calculationMethod === 'mapping').length
  )
  const formulaItemCount = computed(
    () => items.value.filter((item) => item.calculationMethod === 'formula').length
  )
  const labelItemCount = computed(
    () => items.value.filter((item) => item.calculationMethod === 'label').length
  )
  const summaryItems = computed<ArtDescriptionItem[]>(() => {
    const unavailable = loading.value || Boolean(loadError.value)
    return [
      { key: 'statementType', label: '报表类型', value: statementTypeLabel.value },
      { key: 'itemCount', label: '项目总数', value: unavailable ? '--' : items.value.length },
      {
        key: 'mappingCount',
        label: '直接取数行',
        value: unavailable ? '--' : mappingItemCount.value
      },
      {
        key: 'formulaCount',
        label: '公式 / 标题',
        value: unavailable ? '--' : `${formulaItemCount.value} / ${labelItemCount.value}`
      }
    ]
  })
  const effectiveFieldAccess = computed(() =>
    mergeFieldAccessMaps(listFieldAccess.value, ...items.value.map((item) => item.fieldAccess))
  )
  const canViewRules = computed(
    () => getFieldAccess(effectiveFieldAccess.value, 'reportRules') !== 'hidden'
  )
  const canEditBaseRules = computed(
    () => canEditConfigButton.value && canEditField(listFieldAccess.value, 'reportRules')
  )

  function dictLabel(code: FinancialStatementOptionCode, value: unknown): string {
    return statementOptionLabel(code, value, getDictMap.value[code])
  }

  function calculationTag(method: Api.Fms.FinancialStatementCalculationMethod) {
    if (method === 'formula') return 'success'
    if (method === 'label') return 'info'
    return 'primary'
  }

  function canConfigureRule(row: unknown): boolean {
    const item = row as Item
    if (item.calculationMethod === 'formula') return true
    return item.calculationMethod === 'mapping' && item.statementType !== 'cash_flow_statement'
  }

  function canReadRowRules(row: unknown): boolean {
    const item = row as Item
    return ['read', 'edit'].includes(getFieldAccess(item.fieldAccess, 'reportRules'))
  }

  function canEditRowRules(row: unknown): boolean {
    const item = row as Item
    return canEditConfigButton.value && canEditField(item.fieldAccess, 'reportRules')
  }

  function ruleActionLabel(row: unknown): string {
    const item = row as Item
    const action = item.calculationMethod === 'formula' ? '公式' : '科目映射'
    return `${canEditRowRules(item) ? '配置' : '查看'}${action}`
  }

  async function loadConfiguration(): Promise<void> {
    if (!accountSetId.value) return
    loading.value = true
    loadError.value = ''
    try {
      const [itemResult, subjectResult] = await Promise.all([
        fetchFinancialStatementItems(accountSetId.value, statementType.value),
        fetchSubjectList(accountSetId.value)
      ])
      if (itemResult.error) throw itemResult.error
      if (subjectResult.error) throw subjectResult.error
      items.value = itemResult.data ?? []
      listFieldAccess.value = itemResult.fieldAccess
      subjects.value = subjectResult.data ?? []
    } catch {
      items.value = []
      subjects.value = []
      loadError.value = '报表配置加载失败，请重试后再维护。'
    } finally {
      loading.value = false
    }
  }

  async function initializeItems(): Promise<void> {
    if (!canEditBaseRules.value || !accountSetId.value) return
    await confirmAction(
      '系统将补齐企业会计准则通用报表项目、合计公式和现金流方向；已有同编码项目不会重复创建。',
      '初始化标准财务报表',
      { type: 'warning', confirmButtonText: '确认初始化', cancelButtonText: '取消' }
    )
    await initializeFinancialStatementItems(accountSetId.value)
    await handleConfigurationSaved()
  }

  function openItemDialog(row?: unknown): void {
    const item = row as Item | undefined
    if (!(item ? canEditRowRules(item) : canEditBaseRules.value)) return
    void itemDialogRef.value?.handleOpen(accountSetId.value, statementType.value, items.value, item)
  }

  function openRuleDialog(row: unknown): void {
    const item = row as Item
    if (!canReadRowRules(item)) return
    void ruleDialogRef.value?.handleOpen(item, items.value, subjects.value, canEditRowRules(item))
  }

  async function handleConfigurationSaved(): Promise<void> {
    await loadConfiguration()
    emit('success')
  }

  async function handleOpen(
    targetAccountSetId: string,
    targetStatementType: Api.Fms.FinancialStatementType
  ): Promise<void> {
    await Promise.all([
      userStore.ensureDictLoaded('fmsFinancialStatementType'),
      userStore.ensureDictLoaded('fmsStatementCalculationMethod'),
      userStore.ensureDictLoaded('fmsStatementDisplayStyle'),
      userStore.ensureDictLoaded('fmsCashFlowDirection')
    ])
    accountSetId.value = targetAccountSetId
    statementType.value = targetStatementType
    await drawerRef.value?.handleOpen(undefined, {
      title: '财务报表取数口径',
      subtitle: `${statementTypeLabel.value} · 账套级配置`,
      onOpen: loadConfiguration,
      drawerProps: { appendToBody: true, closeOnClickModal: true }
    })
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .statement-config-drawer {
    display: grid;
    gap: var(--art-space-4);

    &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-2);
      align-items: center;
    }

    &__item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;

      strong,
      small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      strong {
        color: var(--art-text-gray-900);
      }

      small {
        color: var(--art-text-gray-600);
      }
    }
  }

  @media (width <= 640px) {
    .statement-config-drawer {
      &__mobile-list {
        display: grid;
        gap: var(--art-space-2);
      }

      &__mobile-item {
        min-width: 0;
        padding: var(--art-space-3);
        border: 1px solid var(--el-border-color-lighter);
        border-radius: var(--el-border-radius-base);
      }

      &__mobile-heading {
        display: flex;
        gap: var(--art-space-2);
        align-items: flex-start;
        justify-content: space-between;
        min-width: 0;

        .statement-config-drawer__item {
          flex: 1;
        }
      }

      &__mobile-details {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--art-space-2);
        margin: var(--art-space-3) 0 0;

        > div {
          min-width: 0;
        }

        dt {
          font-size: 11px;
          color: var(--art-text-gray-600);
        }

        dd {
          margin: 2px 0 0;
          font-size: 12px;
          color: var(--art-text-gray-900);
          overflow-wrap: anywhere;
        }
      }

      &__mobile-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: var(--art-space-2);
        margin-top: var(--art-space-3);
        border-top: 1px solid var(--el-border-color-lighter);
      }
    }
  }
</style>
