<template>
  <ArtDrawer ref="drawerRef" :show-footer="false">
    <ArtAsyncState
      :loading="loading"
      loading-mode="skeleton"
      :error="loadError?.message"
      :empty="!detail"
      empty-text="暂无付款申请详情"
      empty-description="请返回申请列表重新选择记录，或刷新后重试。"
      @retry="retryLoad"
    >
      <template #empty-action>
        <ElButton type="primary" plain @click="retryLoad">重新加载</ElButton>
      </template>
      <div v-if="detail" class="payment-application-detail">
        <ArtSectionCard title="申请信息" preserve-content-structure>
          <ArtDescriptions
            :data="detail"
            :items="descriptionItems"
            :columns="2"
            label-width="104px"
          />
        </ArtSectionCard>

        <ArtSectionCard
          class="payment-application-detail__section"
          title="付款明细"
          :empty="!detail.items?.length"
          empty-title="暂无付款明细"
          empty-description="添加付款项目后可在此核对金额与收款对象。"
          :empty-visual-size="64"
          :min-height="148"
          preserve-content-structure
        >
          <ArtTable
            :border="false"
            :data="detail.items ?? []"
            :columns="itemColumns"
            :pagination="false"
            :show-table-header="false"
            table-layout="fixed"
            empty-height="180px"
            max-height="320px"
            empty-text="暂无付款明细"
          />
        </ArtSectionCard>

        <ArtSectionCard
          v-if="canViewField(detail.fieldAccess, 'basisEvidence')"
          class="payment-application-detail__section"
          title="付款依据"
          :empty="!detail.basisUrls?.length"
          :empty-title="
            getFieldAccess(detail.fieldAccess, 'basisEvidence') === 'masked'
              ? '付款依据已脱敏'
              : '暂无付款依据'
          "
          :empty-description="
            getFieldAccess(detail.fieldAccess, 'basisEvidence') === 'masked'
              ? '当前权限无法查看付款依据。'
              : '上传付款依据后可在此查看附件。'
          "
          :empty-visual-size="64"
          :min-height="148"
          preserve-content-structure
        >
          <div class="payment-application-detail__evidence">
            <ElImage
              v-for="url in detail.basisUrls"
              :key="url"
              :src="url"
              :preview-src-list="detail.basisUrls"
              fit="cover"
              class="payment-application-detail__evidence-image"
              preview-teleported
            />
          </div>
        </ArtSectionCard>

        <ArtSectionCard
          class="payment-application-detail__section"
          title="审批记录"
          preserve-content-structure
        >
          <WorkflowBusinessHistory
            business-type="tms_carrier_payment_application"
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
  import { fetchCarrierPaymentApplicationDetail } from '@fms/api'
  import { useDetailRecord } from '@/hooks/core/useDetailRecord'
  import {
    canViewField,
    getFieldAccess,
    formatSensitiveNumberWithAffix
  } from '@/utils/field-permission'

  defineOptions({ name: 'FinancePaymentApplicationDetailDrawer' })

  type Application = Api.Fms.CarrierPaymentApplicationRecord
  type ApplicationItem = Api.Fms.CarrierPaymentApplicationItem

  const drawerRef = ref<ArtDrawerExpose<Application>>()
  const { detail, loading, loadError, loadDetail, openDetail, retryLoad } =
    useDetailRecord<Application>(
      (id) => fetchCarrierPaymentApplicationDetail(id, { showErrorMessage: false }),
      '付款申请详情加载失败，请重试或返回列表重新选择。'
    )

  const descriptionItems = computed<ArtDescriptionItem<Application>[]>(() => [
    { key: 'applicationNo', label: '付款申请单号', field: 'applicationNo', copyable: true },
    {
      key: 'status',
      label: '申请状态',
      field: 'status',
      dictCode: 'tmsCarrierPaymentApplicationStatus'
    },
    { key: 'carrierName', label: '承运商', field: 'carrierName' },
    ...(canViewField(detail.value?.fieldAccess, 'applicationAmounts')
      ? [
          {
            key: 'amount',
            label: '申请金额',
            field: 'amount' as const,
            formatter: (value: unknown) => formatMoney(value as Api.Fms.SensitiveNumber)
          }
        ]
      : []),
    {
      key: 'plannedPaymentDate',
      label: '计划付款日期',
      field: 'plannedPaymentDate',
      format: 'date'
    },
    {
      key: 'paymentMethod',
      label: '付款方式',
      field: 'paymentMethod',
      dictCode: 'tmsCashPaymentMethod'
    },
    {
      key: 'statementCount',
      label: '对账单数',
      field: 'statementCount',
      formatter: (value) => `${Number(value ?? 0)} 份`
    },
    {
      key: 'paidTransactionNo',
      label: '付款流水号',
      field: 'paidTransactionNo',
      copyable: true
    },
    { key: 'remark', label: '申请说明', field: 'remark', span: 2 },
    { key: 'reviewRemark', label: '审批意见', field: 'reviewRemark', span: 2 },
    { key: 'cancelReason', label: '取消原因', field: 'cancelReason', span: 2 }
  ])

  const itemColumns = computed<ColumnOption<ApplicationItem>[]>(() => [
    { prop: 'statementNoSnapshot', label: '对账单号', minWidth: 190 },
    ...(canViewField(detail.value?.fieldAccess, 'applicationAmounts')
      ? [
          {
            prop: 'statementAmountSnapshot' as const,
            label: '对账金额',
            width: 135,
            align: 'right' as const,
            formatter: (row: ApplicationItem) => formatMoney(row.statementAmountSnapshot)
          },
          {
            prop: 'outstandingAmountSnapshot' as const,
            label: '申请时未付',
            width: 135,
            align: 'right' as const,
            formatter: (row: ApplicationItem) => formatMoney(row.outstandingAmountSnapshot)
          },
          {
            prop: 'appliedAmount' as const,
            label: '本次付款',
            width: 135,
            align: 'right' as const,
            formatter: (row: ApplicationItem) => formatMoney(row.appliedAmount)
          }
        ]
      : [])
  ])

  function formatMoney(value?: Api.Fms.SensitiveNumber): string {
    return formatSensitiveNumberWithAffix(value, { prefix: '¥' })
  }

  async function handleOpen(row: Application): Promise<void> {
    openDetail(row.id)
    await drawerRef.value?.handleOpen(row, {
      title: `付款申请详情 · ${row.applicationNo}`,
      size: 'xl',
      onOpen: () => loadDetail(row.id),
      drawerProps: { appendToBody: true, resizable: true, closeOnClickModal: true }
    })
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .payment-application-detail {
    min-width: 0;

    &__section {
      margin-top: var(--art-space-6);
    }

    &__evidence {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-3);
    }

    &__evidence-image {
      width: 96px;
      height: 96px;
      border: 1px solid var(--el-border-color-light);
      border-radius: var(--el-border-radius-base);
    }
  }
</style>
