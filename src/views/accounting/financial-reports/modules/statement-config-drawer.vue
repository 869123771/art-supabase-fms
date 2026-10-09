<template>
  <ArtDrawer
    :loading="loading"
    ref="drawerRef"
    header-icon="ri:bar-chart-box-line"
    size="xl"
    :show-footer="false"
  >
    <div class="statement-config-drawer">
      <ArtSectionCard title="报表配置概览" preserve-content-structure>
        <ArtDescriptions :data="{}" :items="summaryItems" :columns="2" label-width="104px" />
      </ArtSectionCard>

      <ArtSectionCard
        title="账套报表项目"
        subtitle="项目结构决定报表展示，科目映射与公式关系决定可审计取数口径。"
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
                <dd>{{
                  statementOptionLabel(
                    'fmsStatementCalculationMethod',
                    item.calculationMethod,
                    getDictMap.fmsStatementCalculationMethod
                  )
                }}</dd>
              </div>
              <div>
                <dt>行样式</dt>
                <dd>{{
                  statementOptionLabel(
                    'fmsStatementDisplayStyle',
                    item.displayStyle,
                    getDictMap.fmsStatementDisplayStyle
                  )
                }}</dd>
              </div>
              <div v-if="statementType === 'cash_flow_statement'">
                <dt>流量方向</dt>
                <dd>{{
                  statementOptionLabel(
                    'fmsCashFlowDirection',
                    item.cashFlowDirection,
                    getDictMap.fmsCashFlowDirection
                  ) || '--'
                }}</dd>
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
          :columns="columns"
          :pagination="false"
          height="auto"
          :show-table-header="false"
          row-key="id"
          table-layout="fixed"
          max-height="calc(100vh - 320px)"
        />
      </ArtSectionCard>
    </div>

    <StatementItemDialog ref="itemDialogRef" @success="handleConfigurationSaved" />
    <StatementRuleDialog ref="ruleDialogRef" @success="handleConfigurationSaved" />
  </ArtDrawer>
</template>

<script setup lang="tsx">
  import { ElTag } from 'element-plus'
  import type { ColumnOption } from '@/types'
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
  import {
    isReadableFieldAccess,
    canEditField,
    getFieldAccess,
    mergeFieldAccessMaps
  } from '@/utils/field-permission'
  import { statementOptionLabel } from '../../../modules/financial-statement-options'

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
    statementOptionLabel(
      'fmsFinancialStatementType',
      statementType.value,
      getDictMap.value.fmsFinancialStatementType
    )
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

  const columns = computed<ColumnOption<Item>[]>(() => {
    const definitions: ColumnOption<Item>[] = [
      {
        prop: 'itemName',
        label: '项目',
        minWidth: 170,
        formatter: (row) => (
          <div
            class="flex min-w-0 flex-col gap-[3px]"
            style={{ paddingLeft: `${Math.max(row.itemLevel - 1, 0) * 14}px` }}
          >
            <strong class="truncate text-[var(--art-text-gray-900)]">{row.itemName}</strong>
            <small class="truncate text-[11px] text-[var(--art-text-gray-600)]" translate="no">
              {row.itemCode} · 行次 {row.lineNo}
            </small>
          </div>
        )
      },
      {
        prop: 'calculationMethod',
        label: '计算方式',
        width: 92,
        showOverflowTooltip: true,
        formatter: (row) => (
          <ElTag type={calculationTag(row.calculationMethod)} effect="plain">
            {statementOptionLabel(
              'fmsStatementCalculationMethod',
              row.calculationMethod,
              getDictMap.value.fmsStatementCalculationMethod
            )}
          </ElTag>
        )
      },
      {
        prop: 'displayStyle',
        label: '行样式',
        width: 76,
        showOverflowTooltip: true,
        formatter: (row) =>
          statementOptionLabel(
            'fmsStatementDisplayStyle',
            row.displayStyle,
            getDictMap.value.fmsStatementDisplayStyle
          )
      },
      {
        prop: 'cashFlowDirection',
        label: '流量方向',
        width: 90,
        showOverflowTooltip: true,
        formatter: (row) =>
          statementOptionLabel(
            'fmsCashFlowDirection',
            row.cashFlowDirection,
            getDictMap.value.fmsCashFlowDirection
          ) || '--'
      },
      {
        prop: 'ruleCount',
        label: '规则数',
        width: 76,
        align: 'right',
        formatter: (row) => (row.calculationMethod === 'label' ? '--' : (row.ruleCount ?? '--'))
      },
      {
        prop: 'isEnabled',
        label: '状态',
        width: 66,
        align: 'center',
        formatter: (row) => (
          <ElTag type={row.isEnabled ? 'success' : 'info'} effect="plain">
            {row.isEnabled ? '启用' : '停用'}
          </ElTag>
        )
      },
      {
        prop: 'operation',
        label: '操作',
        width: 108,
        align: 'center',
        formatter: (row) => (
          <>
            {canEditRowRules(row) && (
              <ArtButtonTable
                type="edit"
                label="编辑报表项目"
                permission="FinanceFinancialReports:EditConfig"
                onClick={() => openItemDialog(row)}
              />
            )}
            {canConfigureRule(row) && canReadRowRules(row) && (
              <ArtButtonTable
                type={canEditRowRules(row) ? 'edit' : 'view'}
                icon={canEditRowRules(row) ? 'ri:function-line' : undefined}
                label={ruleActionLabel(row)}
                permission={
                  canEditRowRules(row)
                    ? 'FinanceFinancialReports:EditConfig'
                    : 'FinanceFinancialReports:ViewConfig'
                }
                onClick={() => openRuleDialog(row)}
              />
            )}
          </>
        )
      }
    ]
    return definitions.filter((column) => {
      if (column.prop === 'cashFlowDirection') return statementType.value === 'cash_flow_statement'
      if (column.prop === 'ruleCount' || column.prop === 'operation') return canViewRules.value
      return true
    })
  })

  function calculationTag(method: Api.Fms.FinancialStatementCalculationMethod) {
    if (method === 'formula') return 'success'
    if (method === 'label') return 'info'
    return 'primary'
  }

  function canConfigureRule(item: Item): boolean {
    if (item.calculationMethod === 'formula') return true
    return item.calculationMethod === 'mapping' && item.statementType !== 'cash_flow_statement'
  }

  function canReadRowRules(item: Item): boolean {
    return isReadableFieldAccess(getFieldAccess(item.fieldAccess, 'reportRules'))
  }

  function canEditRowRules(item: Item): boolean {
    return canEditConfigButton.value && canEditField(item.fieldAccess, 'reportRules')
  }

  function ruleActionLabel(item: Item): string {
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

  function openItemDialog(item?: Item): void {
    if (!(item ? canEditRowRules(item) : canEditBaseRules.value)) return
    void itemDialogRef.value?.handleOpen(accountSetId.value, statementType.value, items.value, item)
  }

  function openRuleDialog(item: Item): void {
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
