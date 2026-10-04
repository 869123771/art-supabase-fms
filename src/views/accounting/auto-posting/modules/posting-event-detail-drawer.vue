<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <ArtAsyncState
      :loading="loading"
      loading-mode="skeleton"
      :error="loadError?.message"
      :empty="!detail"
      empty-text="暂无自动入账事件详情"
      empty-description="请返回事件列表重新选择记录，或刷新后重试。"
      @retry="retryLoad"
    >
      <template #empty-action>
        <ElButton type="primary" plain @click="retryLoad">重新加载</ElButton>
      </template>
      <div v-if="detail" class="posting-event-detail">
        <section class="posting-event-detail__hero art-card-xs">
          <span class="posting-event-detail__hero-icon" aria-hidden="true">
            <ArtSvgIcon icon="ri:git-branch-line" />
          </span>
          <div class="posting-event-detail__hero-copy">
            <div class="posting-event-detail__title-row">
              <h2>{{ eventHeading }}</h2>
              <ElTag :type="statusType(detail.status)" effect="light">
                {{ statusLabel(detail.status) }}
              </ElTag>
            </div>
            <p>{{ detail.accountSet?.accountSetName || '待匹配账套' }}</p>
            <ArtDictDisplay
              v-if="canViewSourceReferences && detail.sourceType === 'commercial_bill'"
              dict-code="fmsPostingSourceEvent"
              :value="detail.sourceEvent"
              display="text"
            />
            <span v-else-if="canViewSourceReferences">{{ detail.summary || '暂无事件摘要' }}</span>
            <span v-else>业务来源信息受字段权限保护</span>
          </div>
        </section>

        <ArtSectionCard title="处理信息" preserve-content-structure>
          <ArtDescriptions
            :data="detail"
            :items="descriptionItems"
            :columns="2"
            label-width="104px"
          />
        </ArtSectionCard>

        <ArtSectionCard
          v-if="canViewDiagnostics && detail.lastError"
          class="posting-event-detail__section"
          title="异常信息"
          preserve-content-structure
        >
          <ElAlert type="error" :closable="false" show-icon :title="friendlyProcessingError" />
        </ArtSectionCard>

        <ArtSectionCard
          v-if="canViewPayload"
          class="posting-event-detail__section"
          title="业务数据"
          :empty="!payloadRows.length"
          empty-title="暂无业务载荷"
          empty-description="业务事件生成载荷后，可在此核对字段。"
          :empty-visual-size="64"
          :min-height="148"
          preserve-content-structure
        >
          <ArtTable
            class="posting-event-detail__payload-table"
            :border="false"
            :data="payloadRows"
            :columns="payloadColumns"
            :pagination="false"
            table-layout="fixed"
            empty-text="暂无业务载荷"
          />
          <dl class="posting-event-detail__payload-list">
            <div v-for="row in payloadRows" :key="row.key">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
        </ArtSectionCard>

        <section v-if="canOpenVoucher" class="posting-event-detail__voucher art-card-xs">
          <div>
            <strong>{{ detail.voucher?.voucherNo || '已生成会计凭证' }}</strong>
            <span>凭证状态与后续审核、过账仍由凭证中心统一控制。</span>
          </div>
          <ElButton type="primary" plain @click="viewVoucher"> 查看凭证 </ElButton>
        </section>
      </div>
    </ArtAsyncState>
  </ArtDrawer>
</template>

<script setup lang="tsx">
  import { ElButton, ElTag } from 'element-plus'
  import { storeToRefs } from 'pinia'
  import { useUserStore } from '@/store/modules/user'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtAsyncState from '@/components/core/feedback/art-async-state/index.vue'
  import ArtDescriptions from '@/components/core/base/art-descriptions/index.vue'
  import type { ArtDescriptionItem } from '@/components/core/base/art-descriptions/types'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import type { ColumnOption } from '@/types'
  import { fetchPostingEventDetail } from '@fms/api'
  import { useDetailRecord } from '@/hooks/core/useDetailRecord'
  import { canViewField, formatSensitiveNumber, getFieldAccess } from '@/utils/field-permission'
  import { getFriendlySupabaseErrorMessage } from '@/utils/supabase'

  defineOptions({ name: 'FinancePostingEventDetailDrawer' })

  type Event = Api.Fms.SecurePostingEventRecord

  interface PayloadRow {
    key: string
    label: string
    value: string
  }

  const emit = defineEmits<{ 'view-voucher': [voucherId: string] }>()
  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const drawerRef = ref<ArtDrawerExpose<Event>>()
  const { detail, loading, loadError, loadDetail, openDetail, retryLoad } = useDetailRecord<Event>(
    async (id) => {
      await Promise.all([
        userStore.ensureDictLoaded('fmsBillType'),
        userStore.ensureDictLoaded('fmsBillDirection'),
        userStore.ensureDictLoaded('fmsPostingSourceEvent')
      ])
      return fetchPostingEventDetail(id, { showErrorMessage: false })
    },
    '自动入账事件详情加载失败，请重试或返回列表重新选择。'
  )

  const payloadLabelMap: Record<string, string> = {
    billId: '票据关联标识',
    billType: '票据类型',
    direction: '票据方向',
    referenceNo: '银行流水号',
    billEventId: '流转关联标识',
    fundAccountId: '资金账户关联标识',
    counterpartyName: '往来单位',
    runId: '核算批次 ID',
    periodId: '会计期间 ID',
    assetCount: '资产数量',
    grossAmount: '业务总额',
    gross_amount: '业务总额',
    net_amount: '不含税金额',
    tax_amount: '税额',
    customer_id: '客户 ID',
    carrier_id: '承运商 ID',
    applicant_user_id: '报销申请人 ID',
    waybill_id: '运单 ID',
    driver_id: '司机 ID',
    expense_item_id: '费用项目 ID',
    customer_name: '客户名称',
    carrier_name: '承运商名称',
    counterparty_name: '往来方名称',
    payee_name: '收款方',
    payment_method: '收付方式',
    invoice_no: '发票号码',
    tax_rate: '税率',
    cost_type: '费用类型',
    waybill_no: '运单号'
  }

  const canViewSourceReferences = computed(() =>
    canViewField(detail.value?.fieldAccess, 'eventSourceReferences')
  )
  const canViewDiagnostics = computed(() =>
    canViewField(detail.value?.fieldAccess, 'processingDiagnostics')
  )
  const canViewPayload = computed(
    () =>
      canViewField(detail.value?.fieldAccess, 'eventAmounts') ||
      canViewField(detail.value?.fieldAccess, 'eventPayloadDetails')
  )
  const canOpenVoucher = computed(
    () =>
      Boolean(detail.value?.voucherId) &&
      ['read', 'edit'].includes(getFieldAccess(detail.value?.fieldAccess, 'eventSourceReferences'))
  )
  const eventHeading = computed(() =>
    canViewSourceReferences.value ? detail.value?.sourceNo || '自动入账事件' : '自动入账事件'
  )
  const friendlyProcessingError = computed(() =>
    getFriendlySupabaseErrorMessage(
      detail.value?.lastError,
      '自动入账处理失败，请核对规则与业务单据后重试'
    )
  )

  const descriptionItems = computed<ArtDescriptionItem<Event>[]>(() => {
    const items: ArtDescriptionItem<Event>[] = [
      {
        key: 'sourceEvent',
        label: '业务事件',
        field: 'sourceEvent',
        dictCode: 'fmsPostingSourceEvent'
      },
      { key: 'eventDate', label: '业务日期', field: 'eventDate', format: 'date' },
      { key: 'status', label: '处理状态', field: 'status', dictCode: 'fmsPostingEventStatus' },
      { key: 'createTime', label: '捕获时间', field: 'createTime', format: 'datetime' }
    ]
    if (canViewSourceReferences.value) {
      items.push(
        {
          key: 'rule',
          label: '命中规则',
          field: 'rule',
          formatter: (_value, row) =>
            row.rule ? `${row.rule.ruleCode} · ${row.rule.ruleName}` : '未命中规则'
        },
        {
          key: 'voucher',
          label: '生成凭证',
          field: 'voucher',
          formatter: (_value, row) => row.voucher?.voucherNo || '—'
        },
        {
          key: 'sourceNo',
          label: '来源单号',
          field: 'sourceNo',
          copyable: ['read', 'edit'].includes(
            getFieldAccess(detail.value?.fieldAccess, 'eventSourceReferences')
          )
        }
      )
    }
    if (canViewDiagnostics.value) {
      items.push(
        {
          key: 'attemptCount',
          label: '处理次数',
          field: 'attemptCount',
          formatter: (value) => {
            const formatted = formatSensitiveNumber(value as number | string | null | undefined, {
              maximumFractionDigits: 0
            })
            return formatted === '***' ? formatted : `${formatted} 次`
          }
        },
        { key: 'createBy', label: '事件发起人', field: 'createBy' },
        { key: 'processedAt', label: '处理时间', field: 'processedAt', format: 'datetime' }
      )
    }
    return items
  })

  const payloadRows = computed<PayloadRow[]>(() =>
    Object.entries(detail.value?.payload ?? {}).map(([key, value]) => ({
      key,
      label: payloadLabelMap[key] ?? key,
      value:
        detail.value?.sourceType === 'commercial_bill' && key === 'billType'
          ? getDictMap.value.fmsBillType?.find((item) => item.value === value)?.label || '未登记'
          : detail.value?.sourceType === 'commercial_bill' && key === 'direction'
            ? getDictMap.value.fmsBillDirection?.find((item) => item.value === value)?.label ||
              '未登记'
            : value == null
              ? '—'
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)
    }))
  )

  const payloadColumns: ColumnOption<PayloadRow>[] = [
    { prop: 'label', label: '字段', minWidth: 150 },
    { prop: 'value', label: '业务值', minWidth: 260, showOverflowTooltip: true }
  ]

  function statusLabel(status: Api.Fms.PostingEventStatus): string {
    return {
      pending: '待处理',
      processing: '处理中',
      generated: '已生成凭证',
      pending_configuration: '待配置',
      failed: '生成失败',
      reversed: '已冲销',
      ignored: '无需处理'
    }[status]
  }

  function statusType(
    status: Api.Fms.PostingEventStatus
  ): 'success' | 'warning' | 'danger' | 'info' | 'primary' {
    return {
      pending: 'info',
      processing: 'primary',
      generated: 'success',
      pending_configuration: 'warning',
      failed: 'danger',
      reversed: 'warning',
      ignored: 'info'
    }[status] as 'success' | 'warning' | 'danger' | 'info' | 'primary'
  }

  function viewVoucher(): void {
    const voucherId = detail.value?.voucherId
    if (canOpenVoucher.value && voucherId) emit('view-voucher', voucherId)
  }

  async function handleOpen(row: Event): Promise<void> {
    openDetail(row.id)
    await drawerRef.value?.handleOpen(row, {
      title: '自动入账事件',
      subtitle: `${
        ['read', 'edit'].includes(getFieldAccess(row.fieldAccess, 'eventSourceReferences'))
          ? row.sourceNo || '业务事件'
          : row.eventDate
      } · 查看规则命中、凭证生成与错误原因。`,
      size: 'xl',
      onOpen: () => loadDetail(row.id),
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: true }
    })
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .posting-event-detail {
    display: grid;
    gap: var(--art-space-4);
    min-width: 0;

    &__hero {
      display: flex;
      gap: 14px;
      align-items: center;
      min-width: 0;
      padding: 18px;
    }

    &__hero-icon {
      display: grid;
      flex: 0 0 44px;
      place-items: center;
      width: 44px;
      height: 44px;
      font-size: 22px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-radius: var(--el-border-radius-base);
    }

    &__hero-copy {
      display: grid;
      gap: 4px;
      min-width: 0;

      h2,
      p {
        margin: 0;
        overflow-wrap: anywhere;
      }

      h2 {
        font-size: 18px;
        line-height: 26px;
      }

      p,
      > span {
        color: var(--el-text-color-secondary);
        overflow-wrap: anywhere;
      }
    }

    &__title-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    &__section {
      min-width: 0;
    }

    &__payload-list {
      display: none;
    }

    &__voucher {
      display: flex;
      gap: var(--art-space-4);
      align-items: center;
      justify-content: space-between;
      padding: var(--art-space-4);
      border: 1px solid var(--el-border-color-lighter);

      div {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      span {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }

    @media (width <= 640px) {
      &__payload-table {
        display: none;
      }

      &__payload-list {
        display: grid;
        gap: var(--art-space-3);
        margin: 0;

        > div {
          display: grid;
          gap: 4px;
          padding-bottom: var(--art-space-3);
          border-bottom: 1px solid var(--el-border-color-lighter);
        }

        dt {
          color: var(--el-text-color-secondary);
        }

        dd {
          margin: 0;
          color: var(--el-text-color-primary);
          overflow-wrap: anywhere;
        }
      }

      &__voucher {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  }
</style>
