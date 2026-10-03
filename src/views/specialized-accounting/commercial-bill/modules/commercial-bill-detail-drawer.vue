<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <ArtAsyncState
      :loading="loading"
      loading-mode="skeleton"
      :error="loadError?.message"
      :empty="!bill"
      empty-text="暂无票据详情"
      empty-description="请返回票据列表重新选择记录，或刷新后重试。"
      @retry="retryLoad"
    >
      <template #empty-action>
        <ElButton type="primary" plain @click="retryLoad">重新加载</ElButton>
      </template>
      <template v-if="bill">
        <div class="commercial-bill-detail">
          <section class="commercial-bill-detail__summary art-card-xs">
            <span class="commercial-bill-detail__summary-icon" aria-hidden="true">
              <ArtSvgIcon icon="ri:bank-card-line" />
            </span>
            <div class="commercial-bill-detail__summary-copy">
              <div class="commercial-bill-detail__title-row">
                <h2 translate="no">{{ bill.billNo }}</h2>
                <ElTag :type="dictTagType('fmsBillStatus', bill.status)" effect="light">
                  {{ dictLabel('fmsBillStatus', bill.status) }}
                </ElTag>
              </div>
              <p>票据编号 · {{ referenceSummary }}</p>
            </div>
          </section>

          <ArtSectionCard title="票据信息" preserve-content-structure>
            <ArtDescriptions :data="bill" :items="detailItems" :columns="2" label-width="104px" />
          </ArtSectionCard>

          <ArtSectionCard
            class="commercial-bill-detail__events"
            title="流转记录"
            subtitle="保留每次状态变化的操作时间、金额与业务依据"
            :empty="!events.length"
            empty-title="草稿尚未产生流转记录"
            empty-description="票据提交或状态变化后，操作记录会显示在这里。"
            :empty-visual-size="64"
            :min-height="148"
            preserve-content-structure
          >
            <ElTimeline>
              <ElTimelineItem
                v-for="event in events"
                :key="event.id"
                :timestamp="formatWithDayjs(event.createTime, 'YYYY-MM-DD HH:mm') || '--'"
                placement="top"
                :type="event.eventType === 'cancelled' ? 'danger' : 'primary'"
              >
                <div class="commercial-bill-detail__event-card">
                  <strong>{{ dictLabel('fmsBillEventType', event.eventType) }}</strong>
                  <span>{{ formatProtectedAmount(event.amount) }}</span>
                  <small>{{
                    event.counterpartyName || event.referenceNo || event.remark || '系统登记'
                  }}</small>
                </div>
              </ElTimelineItem>
            </ElTimeline>
          </ArtSectionCard>
        </div>
      </template>
    </ArtAsyncState>
  </ArtDrawer>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { ElButton, type TagProps } from 'element-plus'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtAsyncState from '@/components/core/feedback/art-async-state/index.vue'
  import ArtDescriptions from '@/components/core/base/art-descriptions/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import type { ArtDescriptionItem } from '@/components/core/base/art-descriptions/types'
  import { fetchCommercialBillDetail, fetchCommercialBillEvents } from '@fms/api'
  import { useDetailRecord } from '@/hooks/core/useDetailRecord'
  import { canViewField } from '@/utils/field-permission'
  import { formatCurrencyValue } from '@/utils/ui'
  import { formatWithDayjs } from '@/utils/time'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'FinanceCommercialBillDetailDrawer' })

  type Bill = Api.Fms.CommercialBillRecord
  type Event = Api.Fms.CommercialBillEventRecord
  interface BillDetail {
    record: Bill
    events: Event[]
  }

  const userStore = useUserStore()

  const { getDictMap } = storeToRefs(userStore)
  const drawerRef = ref<ArtDrawerExpose<Bill>>()
  const {
    detail: loadedDetail,
    loading,
    loadError,
    loadDetail,
    openDetail,
    retryLoad
  } = useDetailRecord<BillDetail>(async (id) => {
    const [recordResult, eventResult] = await Promise.all([
      fetchCommercialBillDetail(id, { showErrorMessage: false }),
      fetchCommercialBillEvents(id, { showErrorMessage: false })
    ])
    return {
      data: recordResult.data
        ? { record: recordResult.data, events: eventResult.data ?? [] }
        : undefined,
      error: recordResult.error ?? eventResult.error
    }
  }, '票据详情加载失败，请重试或返回列表重新选择。')
  const bill = computed(() => loadedDetail.value?.record)
  const events = computed(() => loadedDetail.value?.events ?? [])

  const canView = (field: Api.Fms.CommercialBillFieldKey): boolean =>
    canViewField(bill.value?.fieldAccess, field)
  const referenceSummary = computed(() =>
    canView('billReferences') ? bill.value?.externalBillNo || '未登记票面号码' : '票面号码已保护'
  )

  function dictLabel(code: keyof typeof getDictMap.value, value: string): string {
    return getDictMap.value[code]?.find((item) => item.value === value)?.label ?? value
  }

  function dictTagType(code: keyof typeof getDictMap.value, value: string): TagProps['type'] {
    return (getDictMap.value[code]?.find((item) => item.value === value)?.tagType ||
      'info') as TagProps['type']
  }

  const detailItems = computed<ArtDescriptionItem<Bill>[]>(() => {
    if (!bill.value) return []
    const items: ArtDescriptionItem<Bill>[] = [
      { key: 'direction', label: '票据方向', field: 'direction', dictCode: 'fmsBillDirection' },
      { key: 'billType', label: '票据类型', field: 'billType', dictCode: 'fmsBillType' },
      { key: 'issueDate', label: '出票日期', field: 'issueDate', format: 'date' },
      { key: 'dueDate', label: '到期日期', field: 'dueDate', format: 'date' },
      {
        key: 'transferable',
        label: '允许背书',
        field: 'transferable',
        formatter: (_value, row) => (row.transferable ? '允许' : '禁止')
      }
    ]
    if (canView('billParties')) {
      items.splice(
        2,
        0,
        { key: 'drawerName', label: '出票人', field: 'drawerName' },
        { key: 'payeeName', label: '收款人', field: 'payeeName' },
        { key: 'acceptorName', label: '承兑人', field: 'acceptorName' },
        { key: 'counterpartyName', label: '往来单位', field: 'counterpartyName' }
      )
    }
    if (canView('billAmounts')) {
      items.push(
        {
          key: 'faceAmount',
          label: '票面金额',
          field: 'faceAmount',
          formatter: (_value, row) => formatProtectedAmount(row.faceAmount)
        },
        {
          key: 'settledAmount',
          label: '已结金额',
          field: 'settledAmount',
          formatter: (_value, row) => formatProtectedAmount(row.settledAmount)
        }
      )
    }
    if (canView('billReferences')) {
      items.push({ key: 'sourceNo', label: '来源单号', field: 'sourceNo', copyable: true })
    }
    items.push({ key: 'remark', label: '备注', field: 'remark', span: 2 })
    return items
  })

  function formatProtectedAmount(value: Api.Fms.SensitiveNumber | undefined): string {
    if (value === null || value === undefined || value === '') return '--'
    return formatCurrencyValue(value, bill.value?.currencyCode)
  }

  async function handleOpen(row: Bill): Promise<void> {
    await Promise.all([
      userStore.ensureDictLoaded('fmsBillStatus'),
      userStore.ensureDictLoaded('fmsBillEventType')
    ])
    openDetail(row.id)
    await drawerRef.value?.handleOpen(row, {
      title: '票据详情',
      size: 'xl',
      onOpen: () => loadDetail(row.id),
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: true }
    })
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .commercial-bill-detail {
    display: grid;
    gap: var(--art-space-4);
    min-width: 0;

    &__summary {
      display: flex;
      gap: 14px;
      align-items: center;
      min-width: 0;
      padding: 18px;
    }

    &__summary-icon {
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

    &__summary-copy {
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

      p {
        color: var(--el-text-color-secondary);
      }
    }

    &__title-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    &__events {
      min-width: 0;
    }

    &__event-card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 16px;
      padding: 12px 14px;
      background: var(--el-fill-color-lighter);
      border-radius: var(--el-border-radius-base);

      small {
        grid-column: 1 / -1;
        color: var(--el-text-color-secondary);
      }
    }
  }
</style>
