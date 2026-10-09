<template>
  <ArtPermissionGuard permission="FinanceCashForecast:View">
    <FinanceAccountingWorkspaceShell class="cash-forecast-page">
      <BusinessWorkspaceHeader
        density="compact"
        eyebrow="CASH FORECAST"
        title="资金预测"
        description="结合可用资金、未结应收、未结应付与近 30 日真实流水，形成 7/15/30 天资金压力前瞻。"
        icon="ri:funds-line"
        :tags="[
          { label: '滚动 30 天', type: 'primary' },
          { label: '收付联动', type: 'success' },
          { label: '敏感金额保护', type: 'info' }
        ]"
        :metrics="metrics"
        refreshable
        refresh-label="刷新资金预测"
        :refresh-loading="loading"
        @refresh="loadForecast"
      />

      <ElAlert
        v-if="errorMessage && forecast"
        type="error"
        show-icon
        :closable="false"
        :title="errorMessage"
      >
        <template #default>
          <ElButton type="primary" plain @click="loadForecast">重新加载</ElButton>
        </template>
      </ElAlert>

      <ElAlert
        v-if="forecast"
        :type="pressureMeta[forecast.pressureLevel].type"
        show-icon
        :closable="false"
        :title="pressureMeta[forecast.pressureLevel].title"
        :description="pressureMeta[forecast.pressureLevel].description"
      />

      <ArtSectionCard
        class="cash-forecast-page__workspace"
        title="滚动资金预测"
        :subtitle="`更新时间 ${generatedAt}，按当前未结应收应付在 30 天内线性兑现测算。`"
        preserve-content-structure
        :loading="loading && !forecast"
        :error="!forecast ? errorMessage : ''"
        :min-height="220"
        @retry="loadForecast"
      >
        <template #actions>
          <ElTag
            v-if="forecast"
            :type="pressureMeta[forecast.pressureLevel].tagType"
            effect="light"
            round
          >
            {{ pressureMeta[forecast.pressureLevel].label }}
          </ElTag>
        </template>
        <template #loading>
          <ElSkeleton animated aria-hidden="true">
            <template #template>
              <div class="cash-forecast-page__horizons cash-forecast-page__horizons--loading">
                <article v-for="days in [7, 15, 30]" :key="days">
                  <div class="cash-forecast-page__horizon-title">
                    <span>{{ days }} 天</span>
                    <ElSkeletonItem variant="circle" />
                  </div>
                  <ElSkeletonItem variant="text" />
                  <ElSkeletonItem variant="text" />
                  <ElSkeletonItem variant="text" />
                </article>
              </div>
            </template>
          </ElSkeleton>
        </template>

        <div v-if="forecast" class="cash-forecast-page__horizons">
          <article v-for="item in forecast.horizons" :key="item.days">
            <div class="cash-forecast-page__horizon-title">
              <span>未来 {{ item.days }} 天</span>
              <ArtSvgIcon icon="ri:calendar-schedule-line" />
            </div>
            <strong>{{ formatSensitiveCurrencyValue(item.projectedBalance) }}</strong>
            <p class="mt-1 mb-0 text-xs text-g-600">预计可用余额</p>
            <dl>
              <div>
                <dt>预计流入</dt>
                <dd class="is-inflow">{{ formatFlowMoney(item.expectedInflow, '+') }}</dd>
              </div>
              <div>
                <dt>预计流出</dt>
                <dd class="is-outflow">{{ formatFlowMoney(item.expectedOutflow, '-') }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </ArtSectionCard>

      <ArtSectionCard
        v-if="forecast || loading"
        class="cash-forecast-page__explain"
        preserve-content-structure
        title="预测口径与行动建议"
        :loading="loading && !forecast"
        :min-height="150"
      >
        <template #loading>
          <ElSkeleton animated aria-hidden="true">
            <template #template>
              <div
                class="cash-forecast-page__explain-grid cash-forecast-page__explain-grid--loading"
              >
                <div v-for="index in 3" :key="index">
                  <ElSkeletonItem variant="text" />
                  <ElSkeletonItem variant="text" />
                  <ElSkeletonItem variant="text" />
                </div>
              </div>
            </template>
          </ElSkeleton>
        </template>
        <div v-if="forecast" class="cash-forecast-page__explain-grid">
          <div>
            <span><ArtSvgIcon icon="ri:arrow-left-down-line" />收入侧</span>
            <strong>{{ formatSensitiveCurrencyValue(forecast.receivableOutstanding) }}</strong>
            <p>来自待复核、已确认和部分核销客户对账单的未结金额。</p>
          </div>
          <div>
            <span><ArtSvgIcon icon="ri:arrow-right-up-line" />支出侧</span>
            <strong>{{ formatSensitiveCurrencyValue(forecast.payableOutstanding) }}</strong>
            <p>来自待复核、已确认和部分结算承运商对账单的未结金额。</p>
          </div>
          <div>
            <span><ArtSvgIcon icon="ri:line-chart-line" />趋势侧</span>
            <strong>{{ formatSignedMoney(forecast.historicalNetFlow30d) }}</strong>
            <p>近 30 日已入账资金流水净额，用于判断预测与近期真实趋势是否背离。</p>
          </div>
        </div>
      </ArtSectionCard>
    </FinanceAccountingWorkspaceShell>
  </ArtPermissionGuard>
</template>

<script setup lang="ts">
  import { getFriendlySupabaseErrorMessage } from '@/utils/supabase'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import { formatSensitiveCurrencyValue, formatCurrencyValue } from '@/utils/ui'
  import { formatWithDayjs } from '@/utils/time'
  import { fetchCashForecastOverview } from '@fms/api'
  import FinanceAccountingWorkspaceShell from '@fms/views/modules/finance-accounting-workspace-shell/index.vue'

  defineOptions({ name: 'FinanceCashForecast' })

  type PressureLevel = Api.Fms.CashForecastOverview['pressureLevel']

  const forecast = ref<Api.Fms.CashForecastOverview | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')
  const pressureMeta: Record<
    PressureLevel,
    {
      label: string
      title: string
      description: string
      type: 'success' | 'warning' | 'error' | 'info'
      tagType: 'success' | 'warning' | 'danger' | 'info'
    }
  > = {
    healthy: {
      label: '资金健康',
      title: '未来 30 天资金覆盖保持健康',
      description: '当前可用资金与预计回款能够覆盖未结应付，可继续关注回款兑现节奏。',
      type: 'success',
      tagType: 'success'
    },
    attention: {
      label: '需要关注',
      title: '未来 30 天资金安全垫偏薄',
      description: '建议提前推进客户回款，并复核大额付款计划，避免集中支付形成短期压力。',
      type: 'warning',
      tagType: 'warning'
    },
    critical: {
      label: '资金预警',
      title: '未来 30 天预计出现资金缺口',
      description: '建议立即安排催收、调整付款节奏或筹措资金，并逐笔核实大额未结应付。',
      type: 'error',
      tagType: 'danger'
    },
    unavailable: {
      label: '金额受限',
      title: '当前账号无权查看完整资金预测',
      description: '敏感金额已按字段权限隐藏；页面不会通过聚合计算绕过金额访问限制。',
      type: 'info',
      tagType: 'info'
    }
  }

  const generatedAt = computed(() =>
    forecast.value ? formatWithDayjs(forecast.value.generatedAt) : '--'
  )

  const formatFlowMoney = (value: number | undefined, prefix: '+' | '-') =>
    value === undefined ? '--' : `${prefix}${formatSensitiveCurrencyValue(value)}`
  const formatSignedMoney = (value?: number) => {
    if (value === undefined) return '--'
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${formatCurrencyValue(value)}`
  }
  const metrics = computed<BusinessWorkspaceMetric[]>(() => [
    {
      key: 'available',
      label: '可用资金',
      value: formatSensitiveCurrencyValue(forecast.value?.availableBalance),
      description: '本位币可用余额',
      icon: 'ri:bank-card-line',
      tone: 'primary',
      loading: loading.value
    },
    {
      key: 'receivable',
      label: '预计流入',
      value: formatSensitiveCurrencyValue(forecast.value?.receivableOutstanding),
      description: '未结客户应收',
      icon: 'ri:arrow-left-down-line',
      tone: 'success',
      loading: loading.value
    },
    {
      key: 'payable',
      label: '预计流出',
      value: formatSensitiveCurrencyValue(forecast.value?.payableOutstanding),
      description: '未结承运商应付',
      icon: 'ri:arrow-right-up-line',
      tone: 'warning',
      loading: loading.value
    },
    {
      key: 'projected',
      label: '30 天预测余额',
      value: formatSensitiveCurrencyValue(forecast.value?.projectedBalance30d),
      description: pressureMeta[forecast.value?.pressureLevel ?? 'unavailable'].label,
      icon: 'ri:funds-line',
      tone:
        forecast.value?.pressureLevel === 'critical'
          ? 'danger'
          : forecast.value?.pressureLevel === 'attention'
            ? 'warning'
            : 'info',
      loading: loading.value
    }
  ])

  async function loadForecast(): Promise<void> {
    if (loading.value) return
    loading.value = true
    errorMessage.value = ''
    try {
      forecast.value = await fetchCashForecastOverview()
    } catch (error) {
      errorMessage.value = getFriendlySupabaseErrorMessage(error, '资金预测加载失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(() => void loadForecast())

  let refreshOnReturn = false
  onDeactivated(() => {
    refreshOnReturn = true
  })
  onActivated(() => {
    if (!refreshOnReturn) return
    refreshOnReturn = false
    void loadForecast()
  })
</script>

<style scoped lang="scss">
  .cash-forecast-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;

    &__workspace,
    &__explain {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__horizons,
    &__explain-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    &__horizons article,
    &__explain-grid > div {
      min-width: 0;
      padding: 16px;
      background: var(--art-gray-100);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: var(--el-border-radius-base);
    }

    &__horizon-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--el-text-color-regular);
    }

    &__horizons article > strong,
    &__explain-grid strong {
      display: block;
      margin-top: 12px;
      font-size: clamp(20px, 2vw, 28px);
      font-variant-numeric: tabular-nums;
      color: var(--art-gray-900);
    }

    &__horizons dl {
      display: grid;
      gap: 7px;
      margin: 14px 0 0;

      div {
        display: flex;
        gap: 10px;
        justify-content: space-between;
      }

      dt,
      dd {
        margin: 0;
        font-size: 12px;
      }

      dt {
        color: var(--el-text-color-regular);
      }

      .is-inflow {
        color: var(--el-color-success);
      }

      .is-outflow {
        color: var(--el-color-warning);
      }
    }

    &__horizons--loading {
      article > :deep(.el-skeleton__item) {
        display: block;
        width: 68%;
        height: 14px;
        margin-top: 12px;
      }

      article > :deep(.el-skeleton__item:nth-of-type(2)) {
        width: 84%;
        height: 26px;
      }

      .cash-forecast-page__horizon-title :deep(.el-skeleton__circle) {
        width: 18px;
        height: 18px;
      }
    }

    &__explain-grid--loading {
      > div :deep(.el-skeleton__item) {
        display: block;
        width: 85%;
        height: 14px;
        margin: 9px 0;

        &:nth-child(2) {
          width: 60%;
          height: 24px;
        }
      }
    }

    &__explain-grid {
      span {
        display: flex;
        gap: 6px;
        align-items: center;
        font-size: 13px;
        color: var(--el-text-color-regular);
      }

      p {
        margin: 9px 0 0;
        font-size: 12px;
        line-height: 1.65;
        color: var(--el-text-color-regular);
      }
    }
  }

  @media only screen and (width <= 900px) {
    .cash-forecast-page {
      &__horizons,
      &__explain-grid {
        grid-template-columns: 1fr;
      }
    }
  }
</style>
