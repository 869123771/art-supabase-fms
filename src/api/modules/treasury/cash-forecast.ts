import dayjs from 'dayjs'
import { fetchFundAccountOverview, fetchFundLedgerList } from '@fms/api/modules/treasury/treasury'
import { fetchCustomerStatementList } from '@fms/api/modules/transport/customer-settlement'
import { fetchCarrierStatementList } from '@fms/api/modules/transport/carrier-settlement'

const OPEN_STATUSES = new Set(['pending_review', 'confirmed', 'partially_settled'])

const toReadableNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || !value.trim() || value.includes('*')) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const sumReadable = (values: unknown[]): number | undefined => {
  const parsed = values.map(toReadableNumber)
  return parsed.every((value): value is number => value !== undefined)
    ? parsed.reduce((sum, value) => sum + value, 0)
    : undefined
}

export async function fetchCashForecastOverview(): Promise<Api.Fms.CashForecastOverview> {
  const startDate = dayjs().subtract(29, 'day').format('YYYY-MM-DD')
  const endDate = dayjs().format('YYYY-MM-DD')
  const [accountOverview, ledger, customerStatements, carrierStatements] = await Promise.all([
    fetchFundAccountOverview(),
    fetchFundLedgerList({
      from: 0,
      to: 999,
      status: 'posted',
      entryDateRange: [startDate, endDate]
    }),
    fetchCustomerStatementList({ from: 0, to: 999 }),
    fetchCarrierStatementList({ from: 0, to: 999 })
  ])
  const firstError = [
    accountOverview.error,
    ledger.error,
    customerStatements.error,
    carrierStatements.error
  ].find(Boolean)
  if (firstError) throw firstError

  const availableBalance = toReadableNumber(accountOverview.data?.baseCurrencyAvailableBalance)
  const receivableOutstanding = sumReadable(
    customerStatements.data
      .filter((record) => OPEN_STATUSES.has(record.status))
      .map((record) => record.outstandingAmount)
  )
  const payableOutstanding = sumReadable(
    carrierStatements.data
      .filter((record) => OPEN_STATUSES.has(record.status))
      .map((record) => record.outstandingAmount)
  )
  const ledgerAmounts = ledger.data.map((record) => toReadableNumber(record.amount))
  const historicalNetFlow30d = ledgerAmounts.every((value): value is number => value !== undefined)
    ? ledger.data.reduce((sum, record, index) => {
        const amount = ledgerAmounts[index] ?? 0
        return sum + (record.direction === 'inflow' ? amount : -amount)
      }, 0)
    : undefined
  const readable = [availableBalance, receivableOutstanding, payableOutstanding].every(
    (value) => value !== undefined
  )
  const horizons = ([7, 15, 30] as const).map((days) => {
    if (!readable) return { days }
    const ratio = days / 30
    const expectedInflow = (receivableOutstanding ?? 0) * ratio
    const expectedOutflow = (payableOutstanding ?? 0) * ratio
    return {
      days,
      expectedInflow,
      expectedOutflow,
      projectedBalance: (availableBalance ?? 0) + expectedInflow - expectedOutflow
    }
  })
  const projectedBalance30d = horizons.find((item) => item.days === 30)?.projectedBalance
  const pressureLevel: Api.Fms.CashForecastOverview['pressureLevel'] = !readable
    ? 'unavailable'
    : (projectedBalance30d ?? 0) < 0
      ? 'critical'
      : (availableBalance ?? 0) + (receivableOutstanding ?? 0) < (payableOutstanding ?? 0) * 1.2
        ? 'attention'
        : 'healthy'

  return {
    generatedAt: new Date().toISOString(),
    availableBalance,
    receivableOutstanding,
    payableOutstanding,
    historicalNetFlow30d,
    projectedBalance30d,
    pressureLevel,
    readable,
    horizons
  }
}
