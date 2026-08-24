<template>
  <FinanceAccountingWorkspaceShell v-auth="'FinanceCashForecast:View'" class="cash-forecast-page">
    <BusinessWorkspaceHeader
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

    <ElAlert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage">
      <template #default>
        <ElButton type="primary" link @click="loadForecast">重新加载</ElButton>
      </template>
    </ElAlert>

    <ElSkeleton v-else-if="loading && !forecast" :rows="7" animated />

    <template v-else-if="forecast">
      <ElAlert
        :type="pressureMeta[forecast.pressureLevel].type"
        show-icon
        :closable="false"
        :title="pressureMeta[forecast.pressureLevel].title"
        :description="pressureMeta[forecast.pressureLevel].description"
      />

      <ArtSectionCard class="cash-forecast-page__workspace" preserve-content-structure>
        <template #header
          ><header class="cash-forecast-page__section-header">
            <div>
              <ArtSectionTitle :show-line="false">滚动资金曲线</ArtSectionTitle>
              <p>更新时间 {{ generatedAt }}，按当前未结应收应付在 30 天内线性兑现测算。</p>
            </div>
            <ElTag :type="pressureMeta[forecast.pressureLevel].tagType" effect="light" round>
              {{ pressureMeta[forecast.pressureLevel].label }}
            </ElTag>
          </header></template
        >

        <div class="cash-forecast-page__horizons">
          <article v-for="item in forecast.horizons" :key="item.days">
            <div class="cash-forecast-page__horizon-title">
              <span>{{ item.days }} 天</span>
              <ArtSvgIcon icon="ri:calendar-schedule-line" />
            </div>
            <strong>{{ formatMoney(item.projectedBalance) }}</strong>
            <dl>
              <div>
                <dt>预计流入</dt>
                <dd class="is-inflow">+{{ formatMoney(item.expectedInflow) }}</dd>
              </div>
              <div>
                <dt>预计流出</dt>
                <dd class="is-outflow">-{{ formatMoney(item.expectedOutflow) }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </ArtSectionCard>

      <ArtSectionCard
        class="cash-forecast-page__explain"
        preserve-content-structure
        title="预测口径与行动建议"
      >
        <div class="cash-forecast-page__explain-grid">
          <div>
            <span><ArtSvgIcon icon="ri:arrow-left-down-line" />收入侧</span>
            <strong>{{ formatMoney(forecast.receivableOutstanding) }}</strong>
            <p>来自待复核、已确认和部分核销客户对账单的未结金额。</p>
          </div>
          <div>
            <span><ArtSvgIcon icon="ri:arrow-right-up-line" />支出侧</span>
            <strong>{{ formatMoney(forecast.payableOutstanding) }}</strong>
            <p>来自待复核、已确认和部分结算承运商对账单的未结金额。</p>
          </div>
          <div>
            <span><ArtSvgIcon icon="ri:line-chart-line" />趋势侧</span>
            <strong>{{ formatSignedMoney(forecast.historicalNetFlow30d) }}</strong>
            <p>近 30 日已入账资金流水净额，用于判断预测与近期真实趋势是否背离。</p>
          </div>
        </div>
      </ArtSectionCard>
    </template>
  </FinanceAccountingWorkspaceShell>
</template>

<script setup lang="ts">
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import { ElMessage } from 'element-plus'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import ArtSectionTitle from '@/components/core/surfaces/art-section-title/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import { formatCurrencyValue } from '@/utils/ui'
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
  const formatMoney = (value?: number) => (value === undefined ? '--' : formatCurrencyValue(value))
  const formatSignedMoney = (value?: number) => {
    if (value === undefined) return '--'
    const prefix = value > 0 ? '+' : ''
    return `${prefix}${formatCurrencyValue(value)}`
  }
  const metrics = computed<BusinessWorkspaceMetric[]>(() => [
    {
      key: 'available',
      label: '可用资金',
      value: formatMoney(forecast.value?.availableBalance),
      description: '本位币可用余额',
      icon: 'ri:bank-card-line',
      tone: 'primary',
      loading: loading.value
    },
    {
      key: 'receivable',
      label: '预计流入',
      value: formatMoney(forecast.value?.receivableOutstanding),
      description: '未结客户应收',
      icon: 'ri:arrow-left-down-line',
      tone: 'success',
      loading: loading.value
    },
    {
      key: 'payable',
      label: '预计流出',
      value: formatMoney(forecast.value?.payableOutstanding),
      description: '未结承运商应付',
      icon: 'ri:arrow-right-up-line',
      tone: 'warning',
      loading: loading.value
    },
    {
      key: 'projected',
      label: '30 天预测余额',
      value: formatMoney(forecast.value?.projectedBalance30d),
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
    loading.value = true
    errorMessage.value = ''
    try {
      forecast.value = await fetchCashForecastOverview()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '资金预测加载失败'
      ElMessage.error(errorMessage.value)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => void loadForecast())
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
      gap: 18px;
      min-width: 0;
      padding: 18px;
    }

    &__section-header {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      justify-content: space-between;

      p {
        margin: 5px 0 0;
        font-size: 12px;
        color: var(--art-gray-500);
      }
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
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: calc(var(--el-border-radius-base) + 5px);
    }

    &__horizon-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--art-gray-500);
    }

    &__horizons article > strong,
    &__explain-grid strong {
      display: block;
      margin-top: 12px;
      font-size: clamp(20px, 2vw, 28px);
      color: var(--art-text-gray-900);
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
        color: var(--art-gray-500);
      }

      .is-inflow {
        color: var(--el-color-success);
      }

      .is-outflow {
        color: var(--el-color-warning);
      }
    }

    &__explain-grid {
      span {
        display: flex;
        gap: 6px;
        align-items: center;
        font-size: 13px;
        color: var(--art-gray-500);
      }

      p {
        margin: 9px 0 0;
        font-size: 12px;
        line-height: 1.65;
        color: var(--art-gray-500);
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
