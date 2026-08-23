import { groupBy } from 'lodash-es'
import { useSupabase } from '@/hooks'

const { supabase, responseHandle } = useSupabase()

interface ReceivableAgingSource {
  generatedAt?: string
  totalRecords?: number
  returnedRecords?: number
  truncated?: boolean
  records?: Array<{
    id: string
    statementNo: string
    customerId: string
    customerName: string
    periodEnd: string
    outstandingAmount?: number | string | null
    agingDays: number
  }>
}

const toReadableNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || !value.trim() || value.includes('*')) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const bucketFor = (days: number): Api.Fms.ReceivableAgingBucketKey => {
  if (days <= 0) return 'current'
  if (days <= 30) return 'days1To30'
  if (days <= 60) return 'days31To60'
  if (days <= 90) return 'days61To90'
  return 'daysOver90'
}

export async function fetchReceivableAgingOverview(): Promise<Api.Fms.ReceivableAgingOverview> {
  const result = await responseHandle<ReceivableAgingSource>(
    () => supabase.rpc('fms_get_receivable_aging_secure'),
    { showErrorMessage: true }
  )
  if (result.error) throw result.error

  const sourceRecords = result.data?.records ?? []
  const readable = sourceRecords.every(
    (record) => toReadableNumber(record.outstandingAmount) !== undefined
  )
  const records: Api.Fms.ReceivableAgingRecord[] = sourceRecords.map((record) => ({
    ...record,
    bucket: bucketFor(Number(record.agingDays ?? 0)),
    amount: toReadableNumber(record.outstandingAmount)
  }))
  const bucketGroups = groupBy(records, 'bucket')
  const bucketKeys: Api.Fms.ReceivableAgingBucketKey[] = [
    'current',
    'days1To30',
    'days31To60',
    'days61To90',
    'daysOver90'
  ]
  const buckets = bucketKeys.map((key) => ({
    key,
    statementCount: bucketGroups[key]?.length ?? 0,
    amount: readable
      ? (bucketGroups[key] ?? []).reduce((sum, record) => sum + (record.amount ?? 0), 0)
      : undefined
  }))
  const customerGroups = groupBy(records, 'customerId')
  const customers = Object.values(customerGroups)
    .map((items) => ({
      customerId: items[0]?.customerId ?? '',
      customerName: items[0]?.customerName ?? '未命名客户',
      statementCount: items.length,
      oldestAgingDays: Math.max(...items.map((item) => item.agingDays)),
      amount: readable ? items.reduce((sum, item) => sum + (item.amount ?? 0), 0) : undefined
    }))
    .sort((left, right) =>
      readable
        ? (right.amount ?? 0) - (left.amount ?? 0)
        : right.oldestAgingDays - left.oldestAgingDays
    )

  return {
    generatedAt: result.data?.generatedAt ?? new Date().toISOString(),
    totalRecords: result.data?.totalRecords ?? records.length,
    returnedRecords: result.data?.returnedRecords ?? records.length,
    truncated: result.data?.truncated === true,
    readable,
    statementCount: records.length,
    overdueStatementCount: records.filter((record) => record.agingDays > 0).length,
    over90StatementCount: records.filter((record) => record.agingDays > 90).length,
    totalOutstanding: readable
      ? records.reduce((sum, record) => sum + (record.amount ?? 0), 0)
      : undefined,
    buckets,
    customers,
    records
  }
}
