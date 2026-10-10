import type { ApiFeedbackOptions } from '@/types/api/request'
import { buildSupabaseRpcRange } from '@/utils/supabase'
import { useSupabase } from '@/hooks/core/useSupabase'

const { supabase, responseHandle } = useSupabase()

interface PeriodCloseRunListPayload {
  records: Api.Fms.PeriodCloseRunRecord[]
  total: number
  fieldAccess: Api.Fms.PeriodCloseFieldAccessMap
}

interface PeriodCloseCheckListPayload {
  records: Api.Fms.PeriodCloseCheckRecord[]
  fieldAccess: Api.Fms.PeriodCloseFieldAccessMap
  isRecordOwner: boolean
}

export async function fetchPeriodCloseRuns(params: Api.Fms.PeriodCloseSearchParams = {}) {
  const { accountSetId, from = 0, status, to = 19 } = params
  const result = await responseHandle<PeriodCloseRunListPayload>(
    () =>
      supabase.rpc('fms_list_period_close_runs_secure', {
        ...buildSupabaseRpcRange(from, to),
        p_account_set_id: accountSetId || null,
        p_status: status || null,
        p_tenant_id: null
      }),
    { showErrorMessage: true }
  )
  return {
    data: result.data?.records ?? [],
    total: result.data?.total ?? 0,
    error: result.error,
    fieldAccess: result.data?.fieldAccess ?? {}
  }
}

export async function fetchPeriodCloseRunDetail(id: string, options: ApiFeedbackOptions = {}) {
  return await responseHandle<Api.Fms.PeriodCloseRunRecord>(
    () => supabase.rpc('fms_get_period_close_run_secure', { p_run_id: id }),
    { showErrorMessage: options.showErrorMessage ?? true }
  )
}

export async function fetchPeriodCloseChecks(runId: string, options: ApiFeedbackOptions = {}) {
  const result = await responseHandle<PeriodCloseCheckListPayload>(
    () => supabase.rpc('fms_list_period_close_checks_secure', { p_run_id: runId }),
    { showErrorMessage: options.showErrorMessage ?? true }
  )
  return {
    data: result.data?.records ?? [],
    error: result.error,
    fieldAccess: result.data?.fieldAccess ?? {},
    isRecordOwner: result.data?.isRecordOwner ?? false
  }
}

export async function fetchPeriodCloseSummary(accountSetId?: string) {
  return await responseHandle<Api.Fms.PeriodCloseSummary>(
    () =>
      supabase.rpc('fms_period_close_summary_secure', {
        p_account_set_id: accountSetId || null,
        p_tenant_id: null
      }),
    { showErrorMessage: true }
  )
}

export async function runPeriodCloseChecks(periodId: string) {
  return await responseHandle<Api.Fms.PeriodCloseRunRecord>(
    () =>
      supabase.rpc('run_fms_period_close_checks_secure', {
        p_accounting_period_id: periodId
      }),
    { breakReturn: true, showMessage: true, message: '关账检查已完成' }
  )
}

export async function generateProfitLossCarryforward(periodId: string) {
  return await responseHandle<Api.Fms.VoucherRecord>(
    () =>
      supabase.rpc('generate_fms_profit_loss_carryforward_secure', {
        p_accounting_period_id: periodId
      }),
    {
      breakReturn: true,
      showMessage: true,
      message: '损益结转凭证已生成，请完成审核与记账'
    }
  )
}

export async function actPeriodCloseRun(
  id: string,
  action: Api.Fms.PeriodCloseAction,
  reason?: string
) {
  return await responseHandle<Api.Fms.PeriodCloseRunRecord>(
    () =>
      supabase.rpc('act_fms_period_close_run_secure', {
        p_run_id: id,
        p_action: action,
        p_reason: reason || null
      }),
    { breakReturn: true, showMessage: true, message: '会计期间状态已更新' }
  )
}
