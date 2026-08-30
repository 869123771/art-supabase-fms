<template>
  <ArtDataSourceEmptyActions :resource-name="config.resourceName" :actions="config.actions" />
</template>

<script setup lang="ts">
  import ArtDataSourceEmptyActions, {
    type ArtDataSourceEmptyAction
  } from '@/components/business/art-data-source-empty-actions/index.vue'

  defineOptions({ name: 'FinanceDataSourceEmptyActions' })

  type FinanceDataSource =
    'carrier' | 'carrier-statement' | 'customer' | 'customer-statement' | 'waybill' | 'waybill-cost'

  interface SourceConfig {
    resourceName: string
    actions: readonly ArtDataSourceEmptyAction[]
  }

  const props = defineProps<{ source: FinanceDataSource }>()

  const sourceConfigs: Record<FinanceDataSource, SourceConfig> = {
    carrier: {
      resourceName: '承运商资料',
      actions: [
        {
          label: '去维护承运商',
          routeName: 'TmsCarrier',
          permission: 'TmsCarrier:View',
          icon: 'ri:truck-line'
        }
      ]
    },
    'carrier-statement': {
      resourceName: '承运商对账单',
      actions: [
        {
          label: '去承运商结算',
          routeName: 'FinanceCarrierSettlement',
          permission: 'FinanceCarrierSettlement:View',
          icon: 'ri:bill-line'
        }
      ]
    },
    customer: {
      resourceName: '客户资料',
      actions: [
        {
          label: '去维护客户',
          routeName: 'TmsCustomer',
          permission: 'TmsCustomer:View',
          icon: 'ri:user-star-line'
        }
      ]
    },
    'customer-statement': {
      resourceName: '客户对账单',
      actions: [
        {
          label: '去客户结算',
          routeName: 'FinanceCustomerSettlement',
          permission: 'FinanceCustomerSettlement:View',
          icon: 'ri:bill-line'
        }
      ]
    },
    waybill: {
      resourceName: '可结算运单',
      actions: [
        {
          label: '去查看运单',
          routeName: 'TmsLoadedWaybillList',
          permission: 'TmsLoadedWaybillList:View',
          icon: 'ri:route-line'
        }
      ]
    },
    'waybill-cost': {
      resourceName: '已审核运单费用',
      actions: [
        {
          label: '去运单成本',
          routeName: 'FinanceWaybillCost',
          permission: 'FinanceWaybillCost:View',
          icon: 'ri:money-cny-box-line'
        }
      ]
    }
  }

  const config = computed(() => sourceConfigs[props.source])
</script>
