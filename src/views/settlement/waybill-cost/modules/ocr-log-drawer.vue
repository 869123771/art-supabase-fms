<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <template #header>
      <div class="ocr-log-drawer__title">
        <span aria-hidden="true"><ArtSvgIcon icon="ri:file-search-line" /></span>
        <div>
          <strong>OCR 识别记录</strong>
          <small>查询票据识别结果、失败事项与错误详情</small>
        </div>
      </div>
    </template>

    <div class="ocr-log-drawer">
      <ArtTableQuery
        ref="tableQueryRef"
        v-model="search.data"
        :search-items="search.items"
        :api-fn="fetchTableData"
        :columns-factory="columnsFactory"
        :search-bar-props="{
          span: 8,
          labelWidth: 78,
          defaultExpanded: true,
          showExpand: false
        }"
        :table-props="{
          rowKey: 'id',
          border: false,
          tableLayout: 'fixed',
          emptyHeight: '248px',
          emptyText: '暂无 OCR 识别记录',
          emptyDescription: '完成票据识别后，成功与失败记录将在这里展示。'
        }"
      />
    </div>
  </ArtDrawer>
</template>

<script setup lang="tsx">
  import type { ComputedRef } from 'vue'
  import { useMediaQuery } from '@vueuse/core'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import BusinessTableIdentityCell from '@/components/business/business-table-identity-cell/index.vue'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type { ArtTableQueryExpose } from '@/components/core/tables/art-table-query/index.vue'
  import type { ColumnOption } from '@/types'
  import { fetchWaybillExpenseOcrRunList } from '@fms/api'
  import { buildSupabasePageRange } from '@/utils/supabase/pagination'
  import { formatWithDayjs } from '@/utils/time'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'FinanceWaybillExpenseOcrLogDrawer' })

  type OcrRun = Api.Fms.WaybillExpenseOcrRunRecord
  type SearchParams = Api.Fms.WaybillExpenseOcrRunSearchParams
  type TableParams = SearchParams & Pick<Api.Common.PaginationParams, 'current' | 'size'>

  interface SearchGroup {
    data: SearchParams
    items: ComputedRef<SearchFormItem[]>
  }

  const userStore = useUserStore()
  const isNarrowScreen = useMediaQuery('(max-width: 860px)')

  const { getDictMap } = storeToRefs(userStore)
  const drawerRef = ref<ArtDrawerExpose<Record<string, never>>>()
  const tableQueryRef = ref<ArtTableQueryExpose>()
  const search = reactive<SearchGroup>({
    data: { keyword: '', status: '', createTimeRange: [] },
    items: computed<SearchFormItem[]>(() => [
      {
        label: '运行状态',
        key: 'status',
        type: 'select',
        span: isNarrowScreen.value ? 24 : 8,
        props: { options: getDictMap.value.aiRunStatus ?? [], clearable: true }
      },
      {
        label: '识别时间',
        key: 'createTimeRange',
        type: 'date',
        span: isNarrowScreen.value ? 24 : 16,
        props: {
          type: 'daterange',
          valueFormat: 'YYYY-MM-DD',
          startPlaceholder: '开始日期',
          endPlaceholder: '结束日期',
          style: { width: '100%' }
        }
      },
      {
        label: '关键词',
        key: 'keyword',
        type: 'input',
        span: isNarrowScreen.value ? 24 : 16,
        props: { clearable: true, placeholder: '模型、错误码、错误详情或发起人' }
      }
    ])
  })

  const columnsFactory = (): ColumnOption<OcrRun>[] => [
    { type: 'globalIndex', label: '序号', width: 72 },
    {
      prop: 'status',
      label: '识别结果',
      width: 110,
      dict: { code: 'aiRunStatus', display: 'tag' }
    },
    {
      prop: 'model',
      label: '模型 / 发起人',
      minWidth: 200,
      formatter: (row) => <BusinessTableIdentityCell primary={row.model} secondary={row.createBy} />
    },
    {
      prop: 'startedAt',
      label: '时间 / 耗时',
      width: 170,
      formatter: (row) => (
        <BusinessTableIdentityCell
          primary={formatWithDayjs(row.startedAt, 'YYYY-MM-DD HH:mm:ss')}
          secondary={
            row.latencyMs === null || row.latencyMs === undefined
              ? '耗时未记录'
              : `耗时 ${row.latencyMs} ms`
          }
        />
      )
    },
    {
      prop: 'errorMessage',
      label: '处理说明',
      minWidth: 230,
      formatter: (row) => (
        <BusinessTableIdentityCell
          primary={row.errorCode || (row.status === 'succeeded' ? '识别完成' : '—')}
          secondary={row.errorMessage || (row.status === 'succeeded' ? '未记录错误' : '—')}
        />
      )
    }
  ]

  function fetchTableData(params: TableParams) {
    const { from, to } = buildSupabasePageRange({ current: params.current, size: params.size })
    return fetchWaybillExpenseOcrRunList({ ...params, from, to })
  }

  async function handleOpen(): Promise<void> {
    await userStore.ensureDictLoaded('aiRunStatus')
    await drawerRef.value?.handleOpen(
      {},
      {
        title: 'OCR 识别记录',
        size: 'xl',
        showFooter: false,
        onOpen: async () => {
          await nextTick()
          await tableQueryRef.value?.getData()
        },
        drawerProps: {
          appendToBody: true,
          bodyClass: 'ocr-log-drawer__body',
          closeOnClickModal: true,
          resizable: true
        }
      }
    )
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .ocr-log-drawer {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;

    &__title {
      display: flex;
      gap: var(--art-space-3);
      align-items: center;
      min-width: 0;

      > span {
        display: grid;
        flex: 0 0 40px;
        place-items: center;
        width: 40px;
        height: 40px;
        font-size: 20px;
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
        border-radius: var(--el-border-radius-base);
      }

      > div {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      strong,
      small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      strong {
        font-size: 16px;
        color: var(--el-text-color-primary);
      }

      small {
        font-size: 12px;
        font-weight: 400;
        color: var(--el-text-color-secondary);
      }
    }
  }

  :global(.ocr-log-drawer__body .art-drawer__scrollbar),
  :global(.ocr-log-drawer__body .el-scrollbar__wrap),
  :global(.ocr-log-drawer__body .el-scrollbar__view),
  :global(.ocr-log-drawer__body .art-drawer__content) {
    height: 100%;
    min-height: 0;
  }

  :global(.ocr-log-drawer__body .art-drawer__content) {
    display: flex;
    flex-direction: column;
  }
</style>
