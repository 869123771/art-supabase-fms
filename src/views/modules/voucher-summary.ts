interface CostTypeOption {
  value: string | number
  label?: string
  name?: string
}

const voucherSourceLabels: Record<Api.Fms.VoucherSourceType, string> = {
  manual: '手工录入',
  customer_statement: '客户对账',
  carrier_statement: '承运商对账',
  customer_receipt: '客户收款',
  carrier_payment: '承运商付款',
  invoice: '发票',
  expense_reimbursement: '费用报销',
  waybill_cost: '运单费用',
  system: '系统生成',
  commercial_bill: '商业票据',
  fixed_asset: '固定资产',
  asset_depreciation: '资产折旧',
  payroll: '薪资核算',
  tax: '税务核算',
  period_close: '月末结账',
  reversal: '冲销凭证'
}

export function voucherSourceOptions(configured: CostTypeOption[] = []) {
  return Object.entries(voucherSourceLabels).map(([value, fallbackLabel]) => {
    const option = configured.find((item) => item.value === value)
    return { value, label: option?.label || option?.name || fallbackLabel }
  })
}

export function voucherSourceLabel(value: unknown, configured: CostTypeOption[] = []): string {
  return voucherSourceOptions(configured).find((item) => item.value === value)?.label ?? '--'
}

export function formatVoucherSummary(
  summary: string | null | undefined,
  costTypes: CostTypeOption[] = [],
  context?: { sourceType: Api.Fms.VoucherSourceType; billEvents?: CostTypeOption[] }
): string {
  const text = summary ?? ''
  const segments = text.split(' · ')
  const lastSegment = segments.at(-1)
  const options = context?.sourceType === 'commercial_bill' ? (context.billEvents ?? []) : costTypes
  const costType = options.find((item) => String(item.value) === lastSegment)
  const label = costType?.label ?? costType?.name
  return label ? [...segments.slice(0, -1), label].join(' · ') : text
}
