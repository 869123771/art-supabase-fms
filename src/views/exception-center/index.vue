<template>
  <FinanceAccountingWorkspaceShell
    v-auth="'FinanceExceptionCenter:View'"
    class="financial-exception-page"
  >
    <BusinessWorkspaceHeader
      eyebrow="FINANCIAL EXCEPTION CONTROL"
      title="财务异常中心"
      description="统一汇总自动入账、银行对账、费用审核、逾期应收和月结阻断，按风险优先级组织处理顺序。"
      icon="ri:alarm-warning-line"
      :tags="[
        { label: '跨流程汇总', type: 'primary' },
        { label: '不展示敏感金额', type: 'info' },
        { label: '风险优先', type: 'warning' }
      ]"
      :metrics="metrics"
      refreshable
      refresh-label="刷新财务异常"
      :refresh-loading="loading"
      @refresh="loadOverview"
    />

    <ElAlert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage">
      <template #default
        ><ElButton type="primary" link @click="loadOverview">重新加载</ElButton></template
      >
    </ElAlert>
    <ElSkeleton v-else-if="loading && !overview" :rows="8" animated />
    <template v-else-if="overview">
      <ElAlert
        :type="health.type"
        show-icon
        :closable="false"
        :title="health.title"
        :description="health.description"
      />

      <section class="financial-exception-page__workspace art-card-xs">
        <header>
          <div>
            <ArtSectionTitle :show-line="false">异常处置队列</ArtSectionTitle>
            <p>相同业务的操作权限仍由目标页面独立校验，更新时间 {{ generatedAt }}</p>
          </div>
          <ElRadioGroup v-model="activeCategory" size="small" aria-label="财务异常类别">
            <ElRadioButton value="all">全部 {{ overview.totalIssues }}</ElRadioButton>
            <ElRadioButton
              v-for="category in categoryOptions"
              :key="category.value"
              :value="category.value"
            >
              {{ category.label }} {{ categoryCount(category.value) }}
            </ElRadioButton>
          </ElRadioGroup>
        </header>

        <ElAlert
          v-if="overview.truncated"
          type="warning"
          show-icon
          :closable="false"
          :title="`异常数量较多，当前展示 ${overview.returnedIssues} / ${overview.totalIssues} 条`"
          description="队列已优先返回严重和较新的异常。"
        />
        <ElEmpty v-if="!filteredIssues.length" description="当前分类没有待处理异常" />
        <ol v-else class="financial-exception-page__issues">
          <li v-for="issue in filteredIssues" :key="issue.id" :class="`is-${issue.severity}`">
            <span class="financial-exception-page__signal" aria-hidden="true"></span>
            <div class="financial-exception-page__issue-main">
              <div>
                <ElTag :type="categoryMeta[issue.category].type" effect="light" size="small">
                  {{ categoryMeta[issue.category].label }}
                </ElTag>
                <ElTag :type="severityType(issue.severity)" effect="plain" size="small">
                  {{ severityLabel[issue.severity] }}
                </ElTag>
              </div>
              <strong>{{ issue.title }}</strong>
              <p v-if="issue.category === 'cost' && costDescription(issue).costType">
                <span>{{ costDescription(issue).context }}</span>
                <span aria-hidden="true"> · </span>
                <ArtDictDisplay
                  dict-code="fmsPostingWaybillCostType"
                  :value="costDescription(issue).costType"
                  display="text"
                />
              </p>
              <p v-else>{{ issue.description || '请进入对应业务页面核对异常上下文。' }}</p>
            </div>
            <div class="financial-exception-page__evidence">
              <span>业务编号</span>
              <BusinessRecordLink
                v-if="issue.sourceNo"
                :label="issue.sourceNo"
                :to="issueDetailPath(issue)"
                compact
              />
              <strong v-else>--</strong>
              <small>{{ issue.occurredAt ? formatWithDayjs(issue.occurredAt) : '--' }}</small>
            </div>
            <RouterLink
              v-if="hasAuth(requiredPermission[issue.category])"
              class="financial-exception-page__route"
              :to="issue.routePath"
            >
              {{ issue.routeLabel }}
              <ArtSvgIcon icon="ri:arrow-right-line" />
            </RouterLink>
            <span v-else class="financial-exception-page__limited">需目标页面权限</span>
          </li>
        </ol>
      </section>
    </template>
  </FinanceAccountingWorkspaceShell>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import BusinessWorkspaceHeader, {
    type BusinessWorkspaceMetric
  } from '@/components/business/business-workspace-header/index.vue'
  import BusinessRecordLink from '@/components/business/business-record-link/index.vue'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtSectionTitle from '@/components/core/forms/art-section-title/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import { useAuth } from '@/hooks/core/useAuth'
  import { getWaybillCostDetailPath } from '@/router/business-paths'
  import { formatWithDayjs } from '@/utils/time'
  import FinanceAccountingWorkspaceShell from '@fms/views/modules/finance-accounting-workspace-shell/index.vue'
  import { fetchFinancialExceptionOverview } from '@fms/api'

  defineOptions({ name: 'FinanceExceptionCenter' })

  type Category = Api.Fms.FinancialExceptionCategory
  type Severity = Api.Fms.FinancialExceptionSeverity
  type CategoryScope = Category | 'all'

  const { hasAuth } = useAuth()
  const loading = ref(false)
  const errorMessage = ref('')
  const activeCategory = ref<CategoryScope>('all')
  const overview = ref<Api.Fms.FinancialExceptionOverview | null>(null)

  const categoryOptions: Array<{ label: string; value: Category }> = [
    { label: '入账', value: 'posting' },
    { label: '银行', value: 'bank' },
    { label: '费用', value: 'cost' },
    { label: '应收', value: 'receivable' },
    { label: '月结', value: 'close' }
  ]
  const categoryMeta: Record<
    Category,
    { label: string; type: 'primary' | 'success' | 'warning' | 'danger' | 'info' }
  > = {
    posting: { label: '自动入账', type: 'primary' },
    bank: { label: '银行对账', type: 'info' },
    cost: { label: '费用审核', type: 'warning' },
    receivable: { label: '应收管理', type: 'danger' },
    close: { label: '月末结账', type: 'danger' }
  }
  const severityLabel: Record<Severity, string> = {
    critical: '严重',
    warning: '需处理',
    attention: '需关注'
  }
  const requiredPermission: Record<Category, string> = {
    posting: 'FinanceAutoPosting:View',
    bank: 'FinanceBankReconciliation:View',
    cost: 'FinanceWaybillCost:View',
    receivable: 'FinanceReceivableAging:View',
    close: 'FinancePeriodClose:View'
  }

  const generatedAt = computed(() =>
    overview.value ? formatWithDayjs(overview.value.generatedAt) : '--'
  )
  const filteredIssues = computed(() =>
    activeCategory.value === 'all'
      ? (overview.value?.issues ?? [])
      : (overview.value?.issues ?? []).filter((issue) => issue.category === activeCategory.value)
  )
  const criticalCount = computed(
    () => (overview.value?.issues ?? []).filter((issue) => issue.severity === 'critical').length
  )
  const metrics = computed<BusinessWorkspaceMetric[]>(() => [
    {
      key: 'total',
      label: '待处理异常',
      value: overview.value?.totalIssues ?? 0,
      description: `${overview.value?.returnedIssues ?? 0} 条进入当前队列`,
      icon: 'ri:inbox-archive-line',
      tone: 'primary',
      loading: loading.value
    },
    {
      key: 'critical',
      label: '严重异常',
      value: criticalCount.value,
      description: '入账失败与月结阻断',
      icon: 'ri:alarm-warning-line',
      tone: criticalCount.value ? 'danger' : 'info',
      loading: loading.value
    },
    {
      key: 'cost',
      label: '费用待审核',
      value: overview.value?.costPendingReviewCount ?? 0,
      description: '运单费用审核队列',
      icon: 'ri:bill-line',
      tone: overview.value?.costPendingReviewCount ? 'warning' : 'info',
      loading: loading.value
    },
    {
      key: 'reconcile',
      label: '对账 / 应收',
      value:
        (overview.value?.bankUnmatchedCount ?? 0) + (overview.value?.overdueReceivableCount ?? 0),
      description: '未匹配流水与逾期应收',
      icon: 'ri:exchange-funds-line',
      tone: 'info',
      loading: loading.value
    }
  ])
  const health = computed(() => {
    if (criticalCount.value) {
      return {
        type: 'error' as const,
        title: `存在 ${criticalCount.value} 条严重财务异常`,
        description: '建议先处理自动入账失败和月结阻断，再处理费用审核与对账积压。'
      }
    }
    if ((overview.value?.totalIssues ?? 0) > 0) {
      return {
        type: 'warning' as const,
        title: '财务流程存在待清理队列',
        description: '当前没有严重异常，可按发生时间和业务类别逐项处理。'
      }
    }
    return {
      type: 'success' as const,
      title: '当前财务流程运行平稳',
      description: '自动入账、对账、费用审核、应收和月结暂未发现待处理异常。'
    }
  })

  function categoryCount(category: Category): number {
    return (overview.value?.issues ?? []).filter((issue) => issue.category === category).length
  }
  function severityType(severity: Severity): 'danger' | 'warning' | 'info' {
    if (severity === 'critical') return 'danger'
    if (severity === 'warning') return 'warning'
    return 'info'
  }
  function costDescription(issue: Api.Fms.FinancialExceptionIssue): {
    context: string
    costType: string
  } {
    const parts = issue.description
      .split(' · ')
      .map((item) => item.trim())
      .filter(Boolean)
    return {
      context: parts.slice(0, -1).join(' · ') || '运单费用',
      costType: parts.length > 1 ? (parts.at(-1) ?? '') : ''
    }
  }
  function issueDetailPath(issue: Api.Fms.FinancialExceptionIssue): string | undefined {
    if (!hasAuth(requiredPermission[issue.category])) return undefined
    if (issue.category !== 'cost') return issue.routePath
    const [, sourceId] = issue.id.split(':', 2)
    return sourceId ? getWaybillCostDetailPath(sourceId) : issue.routePath
  }
  async function loadOverview(): Promise<void> {
    loading.value = true
    errorMessage.value = ''
    try {
      overview.value = await fetchFinancialExceptionOverview()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '财务异常数据加载失败，请稍后重试'
      ElMessage.error(errorMessage.value)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => void loadOverview())
</script>

<style scoped lang="scss">
  .financial-exception-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;

    &__workspace {
      min-width: 0;
      padding: 18px;

      > header {
        display: flex;
        gap: 16px;
        align-items: flex-end;
        justify-content: space-between;
        margin-bottom: 16px;

        p {
          margin: 5px 0 0;
          font-size: 12px;
          color: var(--art-gray-500);
        }
      }
    }

    &__issues {
      display: grid;
      gap: 8px;
      padding: 0;
      margin: 16px 0 0;
      list-style: none;

      li {
        display: grid;
        grid-template-columns: 4px minmax(260px, 1.5fr) minmax(170px, 0.7fr) auto;
        gap: 16px;
        align-items: center;
        min-width: 0;
        padding: 14px;
        background: var(--art-main-bg-color);
        border: 1px solid var(--art-border-color);
        border-radius: var(--el-border-radius-base);

        &.is-critical {
          border-color: var(--el-color-danger-light-7);
        }

        &.is-warning {
          border-color: var(--el-color-warning-light-7);
        }
      }
    }

    &__signal {
      align-self: stretch;
      background: var(--el-color-info);
      border-radius: 999px;
    }

    .is-critical &__signal {
      background: var(--el-color-danger);
    }

    .is-warning &__signal {
      background: var(--el-color-warning);
    }

    &__issue-main {
      min-width: 0;

      > div {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }

      > strong,
      > p {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      > p {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        margin: 5px 0 0;
        font-size: 12px;
        color: var(--art-gray-600);
      }
    }

    &__evidence {
      min-width: 0;

      span,
      strong,
      small {
        display: block;
      }

      span,
      small {
        font-size: 12px;
        color: var(--art-gray-500);
      }

      strong {
        margin: 4px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .business-record-link {
        margin: 4px 0;
      }
    }

    &__route {
      display: inline-flex;
      gap: 5px;
      align-items: center;
      min-height: 28px;
      color: var(--theme-color);
      text-decoration: none;

      &:focus-visible {
        outline: 2px solid var(--theme-color);
        outline-offset: 3px;
      }
    }

    &__limited {
      font-size: 12px;
      color: var(--art-gray-500);
    }
  }

  @media only screen and (width <= 1100px) {
    .financial-exception-page {
      &__workspace > header {
        flex-direction: column;
        align-items: stretch;
      }

      &__workspace :deep(.el-radio-group) {
        display: flex;
        flex-wrap: wrap;
      }

      &__issues li {
        grid-template-columns: 4px minmax(0, 1fr) auto;
      }

      &__evidence {
        grid-column: 2;
      }

      &__route,
      &__limited {
        grid-row: 1;
        grid-column: 3;
      }
    }
  }

  @media only screen and (width <= 640px) {
    .financial-exception-page {
      &__issues li {
        grid-template-columns: 4px minmax(0, 1fr);
      }

      &__route,
      &__limited {
        grid-row: auto;
        grid-column: 2;
        justify-self: start;
      }
    }
  }
</style>
