import { useSupabase } from '@/hooks'

const { supabase, responseHandle } = useSupabase()

type FinancialExceptionSource = Partial<Api.Fms.FinancialExceptionOverview>

export async function fetchFinancialExceptionOverview(): Promise<Api.Fms.FinancialExceptionOverview> {
  const result = await responseHandle<FinancialExceptionSource>(
    () => supabase.rpc('fms_get_financial_exception_center_secure'),
    { showErrorMessage: true }
  )
  if (result.error) throw result.error

  const source = result.data
  return {
    generatedAt: source?.generatedAt ?? new Date().toISOString(),
    totalIssues: source?.totalIssues ?? 0,
    returnedIssues: source?.returnedIssues ?? 0,
    truncated: source?.truncated === true,
    postingFailedCount: source?.postingFailedCount ?? 0,
    postingPendingCount: source?.postingPendingCount ?? 0,
    bankUnmatchedCount: source?.bankUnmatchedCount ?? 0,
    costPendingReviewCount: source?.costPendingReviewCount ?? 0,
    overdueReceivableCount: source?.overdueReceivableCount ?? 0,
    closeBlockingCount: source?.closeBlockingCount ?? 0,
    issues: source?.issues ?? []
  }
}
