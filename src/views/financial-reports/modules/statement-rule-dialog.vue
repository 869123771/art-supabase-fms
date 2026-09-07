<template>
  <ArtDialog ref="dialogRef" size="xl">
    <template #subtitle>
      {{ subtitle }}
    </template>

    <div class="statement-rule-dialog">
      <div class="statement-rule-dialog__toolbar">
        <div>
          <strong>{{ currentItem?.itemCode }} {{ currentItem?.itemName }}</strong>
          <small>{{ ruleHint }}</small>
        </div>
        <ElButton v-if="editable" type="primary" plain @click="addRule">
          <ArtSvgIcon icon="ri:add-line" />
          添加规则
        </ElButton>
      </div>

      <ElAlert
        v-if="currentItem?.statementType === 'cash_flow_statement'"
        type="info"
        :closable="false"
        show-icon
        title="现金流量表明细由凭证现金分录归集，不使用科目余额映射。"
      />

      <ArtTable
        v-if="rows.length"
        ref="ruleTableRef"
        :data="rows"
        :columns="ruleColumns"
        row-key="rowKey"
        :pagination="false"
        border
        table-layout="fixed"
        max-height="56vh"
      />

      <ArtEmptyState
        v-else
        :title="isFormula ? '尚未配置计算来源' : '尚未配置科目映射'"
        :visual-size="96"
      >
        <ElButton v-if="editable" type="primary" plain @click="addRule"> 添加第一条规则 </ElButton>
      </ArtEmptyState>
    </div>
  </ArtDialog>
</template>

<script setup lang="tsx">
  import { ElButton, ElInput, ElInputNumber, ElMessage, ElOption, ElSelect } from 'element-plus'
  import { storeToRefs } from 'pinia'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import ArtEmptyState from '@/components/core/feedback/art-empty-state/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import ArtTable, { type ArtTableExpose } from '@/components/core/tables/art-table/index.vue'
  import type { ColumnOption } from '@/types'
  import {
    fetchFinancialStatementFormulas,
    saveFinancialStatementFormulas,
    saveFinancialStatementMappings
  } from '@fms/api'
  import { useUserStore } from '@/store/modules/user'

  defineOptions({ name: 'FinanceStatementRuleDialog' })

  type Item = Api.Fms.FinancialStatementItemRecord

  interface RuleRow {
    rowKey: string
    sourceId: string
    mappingDirection: Api.Fms.FinancialStatementMappingDirection
    factor: number
    remark: string
  }

  const emit = defineEmits<{ success: [] }>()
  const { getDictMap } = storeToRefs(useUserStore())
  const dialogRef = ref<ArtDialogExpose>()
  const currentItem = ref<Item>()
  const items = ref<Item[]>([])
  const subjects = ref<Api.Fms.SubjectRecord[]>([])
  const rows = ref<RuleRow[]>([])
  const ruleTableRef = ref<ArtTableExpose>()
  const editable = ref(false)

  const isFormula = computed(() => currentItem.value?.calculationMethod === 'formula')
  const directionOptions = computed(() => getDictMap.value.fmsStatementMappingDirection ?? [])
  const sourceOptions = computed(() =>
    isFormula.value
      ? items.value
          .filter((item) => item.calculationMethod === 'mapping' && item.isEnabled)
          .map((item) => ({ label: `${item.itemCode} ${item.itemName}`, value: item.id }))
      : subjects.value
          .filter((subject) => subject.isEnabled)
          .map((subject) => ({
            label: `${subject.subjectCode} ${subject.subjectName}`,
            value: subject.id
          }))
  )
  const subtitle = computed(() =>
    isFormula.value
      ? '公式行从当前报表的直接取数行组合计算，正数相加、负数相减。'
      : '科目映射决定报表明细行的会计取数口径，同一科目和方向不可重复。'
  )
  const ruleHint = computed(() =>
    isFormula.value
      ? '仅允许引用同一报表内的科目取数行，避免循环公式。'
      : '资产负债表取期初/期末余额，利润表取本期/本年累计发生额。'
  )

  function createRow(): RuleRow {
    return {
      rowKey: crypto.randomUUID(),
      sourceId: '',
      mappingDirection: 'net_debit',
      factor: 1,
      remark: ''
    }
  }

  function addRule(): void {
    rows.value.push(createRow())
  }

  function removeRule(index: number): void {
    rows.value.splice(index, 1)
  }

  const ruleColumns = computed<ColumnOption<RuleRow>[]>(() => [
    { type: 'globalIndex', label: '#', width: 54, align: 'center' },
    {
      prop: 'sourceId',
      label: isFormula.value ? '来源项目' : '会计科目',
      minWidth: 260,
      required: true,
      requiredMessage: ({ rowIndex }) =>
        `第 ${rowIndex + 1} 行未选择${isFormula.value ? '来源项目' : '会计科目'}`,
      formatter: (row) => (
        <ElSelect
          v-model={row.sourceId}
          filterable
          disabled={!editable.value}
          class="w-full!"
          placeholder={isFormula.value ? '请选择来源项目' : '请选择会计科目'}
        >
          {sourceOptions.value.map((option) => (
            <ElOption key={option.value} label={option.label} value={option.value} />
          ))}
        </ElSelect>
      )
    },
    ...(!isFormula.value
      ? [
          {
            prop: 'mappingDirection',
            label: '取数方向',
            width: 170,
            required: true,
            formatter: (row: RuleRow) => (
              <ElSelect v-model={row.mappingDirection} class="w-full!" disabled={!editable.value}>
                {directionOptions.value.map((option) => (
                  <ElOption key={String(option.value)} label={option.label} value={option.value} />
                ))}
              </ElSelect>
            )
          }
        ]
      : []),
    {
      prop: 'factor',
      label: '系数',
      width: 150,
      required: true,
      requiredMessage: ({ rowIndex }) => `第 ${rowIndex + 1} 行取数系数不能为 0`,
      rules: [
        {
          validator: ({ value }) => Number.isFinite(Number(value)) && Number(value) !== 0,
          message: ({ rowIndex }) => `第 ${rowIndex + 1} 行取数系数不能为 0`
        }
      ],
      formatter: (row) => (
        <ElInputNumber
          v-model={row.factor}
          min={-1000}
          max={1000}
          precision={4}
          step={1}
          controlsPosition="right"
          class="w-full!"
          disabled={!editable.value}
        />
      )
    },
    ...(!isFormula.value
      ? [
          {
            prop: 'remark',
            label: '备注',
            minWidth: 190,
            formatter: (row: RuleRow) => (
              <ElInput
                v-model={row.remark}
                maxlength={200}
                placeholder="可选"
                disabled={!editable.value}
              />
            )
          }
        ]
      : []),
    ...(editable.value
      ? [
          {
            prop: 'operation',
            label: '操作',
            width: 80,
            fixed: 'right' as const,
            align: 'center' as const,
            formatter: (row: RuleRow) => (
              <ElButton type="danger" link onClick={() => removeRule(rows.value.indexOf(row))}>
                删除
              </ElButton>
            )
          }
        ]
      : [])
  ])

  async function validateRows(): Promise<boolean> {
    const tableValidation = await ruleTableRef.value?.validate()
    if (tableValidation && !tableValidation.valid) {
      ElMessage.warning(tableValidation.firstError?.message || '请完整填写取数规则')
      return false
    }
    const keys = rows.value.map((row) =>
      isFormula.value ? row.sourceId : `${row.sourceId}:${row.mappingDirection}`
    )
    if (new Set(keys).size !== keys.length) {
      ElMessage.warning(isFormula.value ? '来源项目不可重复' : '同一科目和取数方向不可重复')
      return false
    }
    return true
  }

  async function handleSubmit(): Promise<boolean> {
    if (!editable.value || !currentItem.value || !(await validateRows())) return false
    try {
      if (isFormula.value) {
        await saveFinancialStatementFormulas(
          currentItem.value.id,
          rows.value.map((row) => ({ sourceItemId: row.sourceId, factor: row.factor }))
        )
      } else {
        await saveFinancialStatementMappings(
          currentItem.value.id,
          rows.value.map((row) => ({
            subjectId: row.sourceId,
            mappingDirection: row.mappingDirection,
            factor: row.factor,
            remark: row.remark.trim() || null
          }))
        )
      }
      emit('success')
      return true
    } catch {
      return false
    }
  }

  async function handleOpen(
    item: Item,
    statementItems: Item[],
    subjectList: Api.Fms.SubjectRecord[],
    canEdit: boolean
  ): Promise<void> {
    currentItem.value = item
    items.value = statementItems
    subjects.value = subjectList
    rows.value = []
    ruleTableRef.value?.clearValidate()
    editable.value = canEdit

    if (item.calculationMethod === 'formula') {
      const { data } = await fetchFinancialStatementFormulas(item.id)
      rows.value = (data ?? []).map((formula) => ({
        ...createRow(),
        sourceId: formula.sourceItemId,
        factor: Number(formula.factor)
      }))
    } else {
      rows.value = (item.mappings ?? []).map((mapping) => ({
        ...createRow(),
        sourceId: mapping.subjectId,
        mappingDirection: mapping.mappingDirection,
        factor: Number(mapping.factor),
        remark: mapping.remark ?? ''
      }))
    }

    await dialogRef.value?.handleOpen(undefined, {
      title: `${editable.value ? '配置' : '查看'}${isFormula.value ? '报表公式' : '科目取数'}`,
      confirmText: '保存取数规则',
      showFooter: editable.value,
      contentMaxHeight: '72vh',
      onConfirm: editable.value ? handleSubmit : undefined,
      dialogProps: { appendToBody: true, closeOnClickModal: false }
    })
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .statement-rule-dialog {
    display: grid;
    gap: var(--art-space-4);

    &__toolbar {
      display: flex;
      gap: var(--art-space-4);
      align-items: center;
      justify-content: space-between;

      > div {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      strong {
        font-size: 15px;
        color: var(--art-text-gray-900);
      }

      small {
        line-height: 1.5;
        color: var(--art-text-gray-600);
      }
    }

    :deep(.el-empty) {
      min-height: 280px;
      border: 1px dashed var(--el-border-color);
      border-radius: var(--el-border-radius-base);
    }
  }

  @media (width <= 640px) {
    .statement-rule-dialog__toolbar {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
