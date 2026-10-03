import { ref, type Ref } from 'vue'
import { fetchAccountingPeriodList } from '@fms/api'

/** 账套期间联动：编辑保留当前期间，创建仅选择允许的期间。 */
export function useAccountingPeriodOptions(
  accountSetId: Ref<string>,
  selectedPeriodId: Ref<string>,
  editing: Ref<boolean>,
  allowedStatuses: Api.Fms.AccountingPeriodStatus[] = ['open']
) {
  const periodOptions = ref<Array<{ label: string; value: string }>>([])
  const periodsLoading = ref(false)
  const periodLoadFailed = ref(false)
  let requestId = 0

  function resetPeriods(): void {
    ++requestId
    periodOptions.value = []
    periodsLoading.value = false
    periodLoadFailed.value = false
  }

  async function loadPeriods(): Promise<void> {
    const currentRequest = ++requestId
    const accountId = accountSetId.value
    periodOptions.value = []
    if (!editing.value) selectedPeriodId.value = ''
    periodLoadFailed.value = false
    periodsLoading.value = Boolean(accountId)
    if (!accountId) return
    try {
      const { data, error } = await fetchAccountingPeriodList(accountId, {
        showErrorMessage: false
      })
      if (currentRequest !== requestId || accountId !== accountSetId.value) return
      if (error) {
        periodLoadFailed.value = true
        return
      }
      periodOptions.value = (data ?? [])
        .filter(
          (period) =>
            allowedStatuses.includes(period.status) ||
            (editing.value && period.id === selectedPeriodId.value)
        )
        .map((period) => ({
          label: `${period.fiscalYear} 年第 ${period.periodNo} 期 · ${period.startDate} 至 ${period.endDate}`,
          value: period.id
        }))
      if (!editing.value) selectedPeriodId.value = periodOptions.value[0]?.value ?? ''
    } catch {
      if (currentRequest === requestId) periodLoadFailed.value = true
    } finally {
      if (currentRequest === requestId) periodsLoading.value = false
    }
  }

  return { periodOptions, periodsLoading, periodLoadFailed, loadPeriods, resetPeriods }
}
