interface CostTypeOption {
  value: string | number
  label?: string
  name?: string
}

export function formatVoucherSummary(
  summary: string | null | undefined,
  costTypes: CostTypeOption[] = []
): string {
  const text = summary ?? ''
  const segments = text.split(' · ')
  const lastSegment = segments.at(-1)
  const costType = costTypes.find((item) => String(item.value) === lastSegment)
  const label = costType?.label ?? costType?.name
  return label ? [...segments.slice(0, -1), label].join(' · ') : text
}
