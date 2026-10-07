<template>
  <div
    class="business-workspace-page art-full-height fms-accounting-page accounting-workspace-shell"
  >
    <MasterDeleteProcessingNotice
      v-if="!hideMasterDeleteNotice"
      :location-ready="locationReady"
      action-hint="请在当前页面核对关联记录，处理完成后返回原页面继续删除。"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
  import MasterDeleteProcessingNotice from '@/components/business/master-delete-processing-notice/index.vue'

  defineOptions({ name: 'FinanceAccountingWorkspaceShell' })
  defineProps<{ hideMasterDeleteNotice?: boolean; locationReady?: boolean }>()
</script>

<style scoped lang="scss">
  @use '@fms/views/modules/accounting-workspace.scss' as accounting;

  .accounting-workspace-shell {
    @include accounting.accounting-workspace-layout;
  }
</style>
