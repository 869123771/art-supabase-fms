<template>
  <div class="art-full-height flex min-w-0 flex-col gap-4">
    <BusinessWorkspaceHeader
      density="compact"
      :eyebrow="area"
      :title="title"
      :description="description"
      :icon="icon"
    />
    <ArtSectionCard
      class="min-w-0 flex-1"
      title="业务工作区"
      empty
      empty-title="页面入口已就位"
      empty-description="业务流程与数据功能将在后续改造中接入。"
      :min-height="240"
    />
  </div>
</template>

<script setup lang="ts">
  import BusinessWorkspaceHeader from '@/components/business/business-workspace-header/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'

  defineProps<{
    title: string
    area: string
    description: string
    icon: string
  }>()
</script>
