<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <ArtAsyncState
      :loading="loading"
      loading-mode="skeleton"
      :error="loadError?.message"
      :empty="!detail"
      empty-text="暂无发票详情"
      empty-description="请返回发票列表重新选择记录，或刷新后重试。"
      @retry="retryLoad"
    >
      <template #empty-action>
        <ElButton type="primary" plain @click="retryLoad">重新加载</ElButton>
      </template>
      <div v-if="detail" class="invoice-detail">
        <ArtSectionCard title="发票信息" preserve-content-structure>
          <ArtDescriptions
            :data="detail"
            :items="descriptionItems"
            :columns="2"
            label-width="128px"
          />
        </ArtSectionCard>

        <ArtSectionCard
          v-if="canViewField(detail.fieldAccess, 'invoiceAttachments')"
          class="invoice-detail__section"
          title="发票附件"
          :empty="!attachmentUrls.length"
          :empty-title="
            getFieldAccess(detail.fieldAccess, 'invoiceAttachments') === 'masked'
              ? '附件内容已脱敏'
              : '暂无发票附件'
          "
          :empty-description="
            getFieldAccess(detail.fieldAccess, 'invoiceAttachments') === 'masked'
              ? '当前权限无法查看发票附件。'
              : '上传附件后可在此查看原始发票。'
          "
          :empty-visual-size="64"
          :min-height="148"
          preserve-content-structure
        >
          <div class="invoice-detail__attachments">
            <ElImage
              v-for="(url, index) in attachmentUrls"
              :key="url"
              :src="url"
              :preview-src-list="attachmentUrls"
              :initial-index="index"
              preview-teleported
              fit="cover"
              class="invoice-detail__attachment"
            />
          </div>
        </ArtSectionCard>

        <ArtSectionCard
          class="invoice-detail__section"
          title="关联对账单"
          :empty="!detail.statementLinks?.length"
          empty-title="暂未关联对账单"
          empty-description="发票匹配对账单后，关联关系会显示在这里。"
          :empty-visual-size="64"
          :min-height="148"
          preserve-content-structure
        >
          <ArtTable
            :border="false"
            :data="detail.statementLinks ?? []"
            :columns="statementLinkColumns"
            :pagination="false"
            height="auto"
            :show-table-header="false"
            table-layout="fixed"
            empty-height="180px"
            max-height="360px"
            empty-text="暂未关联对账单"
          />
        </ArtSectionCard>

        <ArtSectionCard class="invoice-detail__section" title="审批记录" preserve-content-structure>
          <WorkflowBusinessHistory
            business-type="tms_invoice"
            :business-id="detail.id"
            :min-height="180"
          />
        </ArtSectionCard>
      </div>
    </ArtAsyncState>
  </ArtDrawer>
</template>

<script setup lang="ts">
  import { ElButton } from 'element-plus'
  import type { ColumnOption } from '@/types'
  import ArtDescriptions from '@/components/core/base/art-descriptions/index.vue'
  import type { ArtDescriptionItem } from '@/components/core/base/art-descriptions/types'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import WorkflowBusinessHistory from '@/components/business/workflow-business-history/index.vue'
  import { fetchInvoiceDetail } from '@fms/api'
  import { useDetailRecord } from '@/hooks/core/useDetailRecord'
  import {
    canViewField,
    getFieldAccess,
    formatSensitiveNumberWithAffix
  } from '@/utils/field-permission'

  defineOptions({ name: 'FinanceInvoiceDetailDrawer' })

  type Invoice = Api.Fms.InvoiceRecord
  type StatementLink = NonNullable<Invoice['statementLinks']>[number]

  const drawerRef = ref<ArtDrawerExpose<Invoice>>()
  const { detail, loading, loadError, loadDetail, openDetail, retryLoad } =
    useDetailRecord<Invoice>(
      (id) => fetchInvoiceDetail(id, { showErrorMessage: false }),
      '发票详情加载失败，请重试或返回列表重新选择。'
    )
  const attachmentUrls = computed(() =>
    (detail.value?.attachments ?? [])
      .map((item) => (typeof item.url === 'string' ? item.url : ''))
      .filter(Boolean)
  )

  const descriptionItems = computed<ArtDescriptionItem<Invoice>[]>(() => [
    { key: 'invoiceRecordNo', label: '登记单号', field: 'invoiceRecordNo', copyable: true },
    { key: 'status', label: '发票状态', field: 'status', dictCode: 'tmsInvoiceStatus' },
    { key: 'direction', label: '发票方向', field: 'direction', dictCode: 'tmsInvoiceDirection' },
    { key: 'invoiceType', label: '发票类型', field: 'invoiceType', dictCode: 'tmsInvoiceType' },
    { key: 'counterparty', label: '往来单位', field: 'counterpartyNameSnapshot' },
    { key: 'issueDate', label: '开票日期', field: 'issueDate', format: 'date' },
    { key: 'invoiceCode', label: '发票代码', field: 'invoiceCode', copyable: true },
    { key: 'invoiceNo', label: '发票号码', field: 'invoiceNo', copyable: true },
    { key: 'invoiceTitle', label: '发票抬头', field: 'invoiceTitle' },
    ...(canViewField(detail.value?.fieldAccess, 'taxIdentity')
      ? [
          {
            key: 'taxNumber',
            label: '纳税人识别号',
            field: 'taxNumber' as const,
            copyable: detail.value?.taxNumber !== '***'
          }
        ]
      : []),
    ...(canViewField(detail.value?.fieldAccess, 'invoiceAmounts')
      ? [
          {
            key: 'amountExcludingTax',
            label: '不含税金额',
            field: 'amountExcludingTax' as const,
            formatter: (value: unknown) => formatMoney(value as Api.Fms.SensitiveNumber)
          },
          {
            key: 'taxRate',
            label: '税率',
            field: 'taxRate' as const,
            formatter: (value: unknown) => formatPercent(value)
          },
          {
            key: 'taxAmount',
            label: '税额',
            field: 'taxAmount' as const,
            formatter: (value: unknown) => formatMoney(value as Api.Fms.SensitiveNumber)
          },
          {
            key: 'totalAmount',
            label: '价税合计',
            field: 'totalAmount' as const,
            formatter: (value: unknown) => formatMoney(value as Api.Fms.SensitiveNumber)
          },
          {
            key: 'linkedAmount',
            label: '已关联金额',
            field: 'linkedAmount' as const,
            formatter: (value: unknown) => formatMoney(value as Api.Fms.SensitiveNumber)
          },
          {
            key: 'unlinkedAmount',
            label: '未关联金额',
            field: 'unlinkedAmount' as const,
            formatter: (value: unknown) => formatMoney(value as Api.Fms.SensitiveNumber)
          }
        ]
      : []),
    { key: 'remark', label: '备注', field: 'remark', span: 2 }
  ])

  const statementLinkColumns = computed<ColumnOption<StatementLink>[]>(() => {
    const columns: ColumnOption<StatementLink>[] = [
      { prop: 'statementNo', label: '对账单号', minWidth: 180 },
      {
        prop: 'counterpartyName',
        label: '往来单位',
        minWidth: 180,
        showOverflowTooltip: true
      },
      {
        prop: 'periodLabel',
        label: '账期',
        width: 205,
        formatter: (row) => `${row.periodStart} 至 ${row.periodEnd}`
      }
    ]
    if ((detail.value?.statementLinks ?? []).some((row) => row.statementAmount !== undefined)) {
      columns.push({
        prop: 'statementAmount',
        label: '对账金额',
        width: 135,
        align: 'right',
        formatter: (row) => formatStatementMoney(row.statementAmount)
      })
    }
    if (canViewField(detail.value?.fieldAccess, 'invoiceAmounts')) {
      columns.push({
        prop: 'linkedAmount',
        label: '关联金额',
        width: 135,
        align: 'right',
        formatter: (row) => formatMoney(row.linkedAmount)
      })
    }
    return columns
  })

  function formatMoney(value?: Api.Fms.SensitiveNumber): string {
    return formatSensitiveNumberWithAffix(value, { prefix: '¥' })
  }

  function formatPercent(value: unknown): string {
    return formatSensitiveNumberWithAffix(value as Api.Fms.SensitiveNumber, { suffix: '%' })
  }

  function formatStatementMoney(value?: Api.Fms.SensitiveNumber): string {
    return formatSensitiveNumberWithAffix(value, { prefix: '¥' })
  }

  async function handleOpen(row: Invoice): Promise<void> {
    openDetail(row.id)
    await drawerRef.value?.handleOpen(row, {
      title: `发票详情 · ${row.invoiceNo || row.invoiceRecordNo}`,
      size: 'xl',
      onOpen: () => loadDetail(row.id),
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: true }
    })
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .invoice-detail {
    &__section {
      margin-top: var(--art-space-6);
    }

    &__attachments {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-3);
    }

    &__attachment {
      width: 112px;
      height: 112px;
      border-radius: var(--el-border-radius-base);
    }
  }
</style>
