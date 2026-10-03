import type { TagProps } from 'element-plus'

type StatementStatus = Api.Fms.CustomerStatementStatus

const settlementStatusPresentation: Record<
  StatementStatus,
  { label: string; type: TagProps['type'] }
> = {
  draft: { label: '草稿', type: 'info' },
  pending_review: { label: '待审核', type: 'warning' },
  confirmed: { label: '已确认', type: 'primary' },
  partially_settled: { label: '部分结算', type: 'warning' },
  settled: { label: '已结清', type: 'success' },
  voided: { label: '已作废', type: 'danger' }
}

export const getSettlementStatusPresentation = (status: string) =>
  settlementStatusPresentation[status as StatementStatus] ?? {
    label: status || '未知状态',
    type: 'info' as const
  }
