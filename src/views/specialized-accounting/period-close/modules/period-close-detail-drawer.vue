<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <ArtAsyncState
      :loading="loading"
      loading-mode="skeleton"
      :error="loadError?.message"
      :empty="!run"
      empty-text="暂无关账检查详情"
      empty-description="请返回关账列表重新选择记录，或重新加载。"
      @retry="retryLoad"
    >
      <div v-if="run" class="close-detail">
        <section class="close-detail__summary">
          <div>
            <small>关账批次</small>
            <strong>{{ run.runNo }}</strong>
            <span>
              {{ run.period ? `${run.period.fiscalYear} 年第 ${run.period.periodNo} 期` : '--' }}
            </span>
          </div>
          <ArtDictDisplay dict-code="fmsPeriodCloseRunStatus" :value="run.status" display="tag" />
        </section>
        <div v-if="canViewDiagnostics" class="close-detail__counts">
          <article
            ><span>通过</span><strong>{{ formatProtectedCount(run.passedCount) }}</strong></article
          >
          <article
            ><span>提醒</span><strong>{{ formatProtectedCount(run.warningCount) }}</strong></article
          >
          <article
            ><span>阻断</span
            ><strong>{{ formatProtectedCount(run.blockingCount) }}</strong></article
          >
        </div>
        <ArtSectionCard
          title="关账检查结果"
          :empty="!checks.length"
          empty-title="暂无关账检查结果"
          empty-description="执行关账检查后，结果和阻断原因会显示在这里。"
          :empty-visual-size="72"
          :min-height="188"
          preserve-content-structure
        >
          <ArtTable
            v-if="!isNarrow"
            :pagination="false"
            :border="false"
            :show-table-header="false"
            :data="checks"
            row-key="id"
          >
            <ElTableColumn prop="checkName" label="检查项目" min-width="170" />
            <ElTableColumn v-if="canViewDiagnostics" label="结果" width="100">
              <template #default="{ row }">
                <span v-if="row.status === '***'">***</span>
                <ArtDictDisplay
                  v-else
                  dict-code="fmsPeriodCloseCheckStatus"
                  :value="row.status"
                  display="tag"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn v-if="canViewDiagnostics" label="问题数" width="90" align="right">
              <template #default="{ row }">{{ formatProtectedCount(row.issueCount) }}</template>
            </ElTableColumn>
            <ElTableColumn
              v-if="canViewDiagnostics"
              prop="summary"
              label="检查结论"
              min-width="280"
              show-overflow-tooltip
            />
            <ElTableColumn v-if="canViewDiagnostics" label="控制级别" width="110">
              <template #default="{ row }">
                <span v-if="row.isBlocking === '***'">***</span>
                <ElTag v-else :type="row.status === 'blocked' ? 'danger' : 'info'" effect="plain">
                  {{ row.isBlocking ? '强制校验' : '提示校验' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ArtTable>
          <div v-else class="close-detail__checks">
            <article v-for="check in checks" :key="check.id" class="close-detail__check">
              <header>
                <strong>{{ check.checkName }}</strong>
                <ArtDictDisplay
                  v-if="canViewDiagnostics && check.status !== '***'"
                  dict-code="fmsPeriodCloseCheckStatus"
                  :value="check.status"
                  display="tag"
                />
                <span v-else-if="canViewDiagnostics">***</span>
              </header>
              <template v-if="canViewDiagnostics">
                <p>{{ check.summary || '暂无检查结论' }}</p>
                <footer>
                  <span>问题数 {{ formatProtectedCount(check.issueCount) }}</span>
                  <ElTag :type="check.status === 'blocked' ? 'danger' : 'info'" effect="plain">
                    {{
                      check.isBlocking === '***'
                        ? '***'
                        : check.isBlocking
                          ? '强制校验'
                          : '提示校验'
                    }}
                  </ElTag>
                </footer>
              </template>
            </article>
          </div>
        </ArtSectionCard>
      </div>
    </ArtAsyncState>
  </ArtDrawer>
</template>
<script setup lang="ts">
  import { useMediaQuery } from '@vueuse/core'
  import { useDetailRecord } from '@/hooks/core/useDetailRecord'
  import { useUserStore } from '@/store/modules/user'
  import ArtAsyncState from '@/components/core/feedback/art-async-state/index.vue'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import { fetchPeriodCloseChecks, fetchPeriodCloseRunDetail } from '@fms/api'
  import { canViewField } from '@/utils/field-permission'
  defineOptions({ name: 'FinancePeriodCloseDetailDrawer' })
  const drawerRef = ref<ArtDrawerExpose>()
  const userStore = useUserStore()
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const { detail, loading, loadError, loadDetail, openDetail, retryLoad } = useDetailRecord<{
    run: Api.Fms.PeriodCloseRunRecord
    checks: Api.Fms.PeriodCloseCheckRecord[]
  }>(async (id) => {
    const [runResult, checkResult] = await Promise.all([
      fetchPeriodCloseRunDetail(id),
      fetchPeriodCloseChecks(id),
      userStore.ensureDictLoaded('fmsPeriodCloseCheckStatus'),
      userStore.ensureDictLoaded('fmsPeriodCloseRunStatus')
    ])
    return {
      data: runResult.data ? { run: runResult.data, checks: checkResult.data ?? [] } : undefined,
      error: runResult.error ?? checkResult.error
    }
  }, '关账检查详情加载失败，请重新加载。')
  const run = computed(() => detail.value?.run)
  const checks = computed(() => detail.value?.checks ?? [])
  const canViewDiagnostics = computed(() =>
    canViewField(run.value?.fieldAccess, 'closeDiagnostics')
  )
  async function handleOpen(row: Api.Fms.PeriodCloseRunRecord) {
    openDetail(row.id)
    await drawerRef.value?.handleOpen(undefined, {
      title: `关账检查详情 · ${row.runNo}`,
      size: 'xl',
      loading: true,
      loadingText: '正在加载关账检查…',
      onOpen: async (_data, api) => {
        try {
          await loadDetail(row.id)
        } finally {
          api.setLoading(false)
        }
      },
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: true }
    })
  }
  function formatProtectedCount(value: Api.Fms.SensitiveNumber | undefined | null): string {
    if (value === null || value === undefined || value === '') return '--'
    return typeof value === 'string' ? value : value.toLocaleString('zh-CN')
  }
  defineExpose({ handleOpen })
</script>
<style scoped lang="scss">
  .close-detail {
    display: grid;
    gap: 18px;
  }

  .close-detail__summary {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
  }

  .close-detail__summary > div {
    display: grid;
    gap: 4px;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .close-detail small,
  .close-detail span {
    color: var(--el-text-color-secondary);
  }

  .close-detail__counts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .close-detail__counts article {
    display: grid;
    gap: 6px;
    padding: 14px;
    background: var(--el-fill-color-lighter);
    border-radius: var(--el-border-radius-base);
  }

  .close-detail__counts strong {
    font-size: 22px;
  }

  .close-detail__checks {
    display: grid;
    gap: var(--art-space-3);
  }

  .close-detail__check {
    padding: var(--art-space-3);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);

    header,
    footer {
      display: flex;
      gap: var(--art-space-2);
      align-items: center;
      justify-content: space-between;
    }

    header strong {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    p {
      margin: var(--art-space-3) 0;
      color: var(--el-text-color-regular);
      overflow-wrap: anywhere;
    }
  }

  @media (width <= 640px) {
    .close-detail__counts {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--art-space-2);
    }

    .close-detail__counts article {
      padding: var(--art-space-3);
    }
  }
</style>
