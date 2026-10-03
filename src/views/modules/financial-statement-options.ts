/** Fixed report enums remain usable when a tenant has not configured their display dictionaries. */
export const financialStatementOptions = {
  fmsFinancialStatementType: [
    { value: 'balance_sheet', label: '资产负债表' },
    { value: 'income_statement', label: '利润表' },
    { value: 'cash_flow_statement', label: '现金流量表' }
  ],
  fmsStatementDisplayStyle: [
    { value: 'normal', label: '明细行' },
    { value: 'subtotal', label: '小计行' },
    { value: 'total', label: '合计行' }
  ],
  fmsStatementCalculationMethod: [
    { value: 'mapping', label: '科目取数' },
    { value: 'formula', label: '公式计算' },
    { value: 'label', label: '标题行' }
  ],
  fmsCashFlowDirection: [
    { value: 'receipt', label: '流入' },
    { value: 'payment', label: '流出' }
  ],
  fmsStatementMappingDirection: [
    { value: 'debit', label: '借方' },
    { value: 'credit', label: '贷方' },
    { value: 'net_debit', label: '借方净额' },
    { value: 'net_credit', label: '贷方净额' }
  ]
} as const

export type FinancialStatementOptionCode = keyof typeof financialStatementOptions

export function statementOptionsWithFallback(
  code: FinancialStatementOptionCode,
  configured?: Api.DataCenter.DictListItem[]
): { value: string; label: string }[] {
  return configured?.length
    ? configured.map((item) => ({ value: item.value, label: item.label || item.name }))
    : [...financialStatementOptions[code]]
}

export function statementOptionLabel(
  code: FinancialStatementOptionCode,
  value: unknown,
  configured?: Api.DataCenter.DictListItem[]
): string {
  if (value === null || value === undefined || value === '') return ''
  return (
    statementOptionsWithFallback(code, configured).find((item) => item.value === String(value))
      ?.label ?? String(value)
  )
}
