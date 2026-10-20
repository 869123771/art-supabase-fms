import type {
  EmployeeSelectorContractParams,
  EmployeeSelectorContractResult,
  EmployeeIntegrationItem
} from '@/api/integration/employees'
import { useSupabase } from '@/hooks/core/useSupabase'
import { buildSupabaseRpcRange } from '@/utils/supabase/pagination'
import { normalizeNullableText } from '@/utils/form/normalize'

type ExpenseApplicantKind = 'travel_application' | 'travel_loan' | 'expense_reimbursement'

interface ApplicantPayload {
  records: EmployeeIntegrationItem[]
  total: number
  fieldAccess: Record<string, Api.Common.FieldAccessLevel>
}

const { supabase, responseHandle } = useSupabase()

async function fetchExpenseApplicantSelector(
  kind: ExpenseApplicantKind,
  params: EmployeeSelectorContractParams = {}
): Promise<EmployeeSelectorContractResult> {
  if (!params.tenantId) return { data: [], total: 0, error: null, fieldAccess: {} }
  const range = buildSupabaseRpcRange(params.from ?? 0, params.to ?? 9)
  const result = await responseHandle<ApplicantPayload>(
    () =>
      supabase.rpc('fms_list_expense_applicants_secure', {
        p_kind: kind,
        p_tenant_id: params.tenantId,
        p_keyword: normalizeNullableText(params.keyword),
        ...range
      }),
    { showErrorMessage: false, errorMessage: '可选申请人加载失败，请重试' }
  )
  return {
    data: result.data?.records ?? [],
    total: result.data?.total ?? 0,
    error: result.error,
    fieldAccess: result.data?.fieldAccess ?? {}
  }
}

export const fetchTravelApplicantSelector = (params?: EmployeeSelectorContractParams) =>
  fetchExpenseApplicantSelector('travel_application', params)

export const fetchLoanApplicantSelector = (params?: EmployeeSelectorContractParams) =>
  fetchExpenseApplicantSelector('travel_loan', params)

export const fetchReimbursementApplicantSelector = (params?: EmployeeSelectorContractParams) =>
  fetchExpenseApplicantSelector('expense_reimbursement', params)
