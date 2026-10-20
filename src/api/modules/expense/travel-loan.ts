import { useSupabase } from '@/hooks/core/useSupabase'
import { buildOrIlikeFilter } from '@/utils/supabase/search'
import { normalizeNullableText } from '@/utils/form/normalize'

export interface TravelLoanItem {
  id: string
  tenantId: string
  loanId: string
  lineNo: number
  expenseItemId: string
  projectId: string | null
  borrowerEmployeeId: string
  amount: number
  purpose: string
  expenseItem?: { itemName: string } | null
  project?: { projectName: string } | null
}

export interface TravelLoanPayee {
  id: string
  tenantId: string
  loanId: string
  lineNo: number
  settlementMethod: string
  payeeType: 'person'
  payeeInformationId: string
  payeeName: string
  bankAccount: string
  accountName: string | null
  bankName: string
  amount: number
  remark: string | null
}

export interface TravelLoan {
  id: string
  tenantId: string
  loanNo: string
  applicantEmployeeId: string
  applicantName: string
  applicantEmployeeNo: string
  applicantAvatarUrl: string | null
  applicantOrganizationId: string
  applicantOrganizationName: string
  applicantCompanyId: string
  applicantCompanyName: string
  assignmentId: string | null
  positionName: string | null
  applicationDate: string
  expenseDepartmentId: string
  expenseDepartmentName: string
  expenseCompanyId: string
  expenseCompanyName: string
  repaymentDate: string
  multipleTravelers: boolean
  reason: string
  loanAmount: number
  paymentAmount: number
  approvedAmount: number | null
  reimbursedAmount: number | null
  pendingCollectionAmount: number | null
  repaidAmount: number | null
  remainingBalance: number | null
  usedAmount: number | null
  paidAmount: number | null
  currentHandler: string | null
  paymentDate: string | null
  rejectionOpinion: string | null
  status: string
  remark: string | null
  attachmentUrls: string[]
  createTime: string
  items?: TravelLoanItem[]
  payees?: TravelLoanPayee[]
}

export interface TravelLoanInput {
  id?: string
  tenantId: string
  applicantEmployeeId: string
  assignmentId: string | null
  applicationDate: string
  expenseDepartmentId: string | null
  repaymentDate: string
  multipleTravelers: boolean
  reason: string
  remark: string | null
  attachmentUrls: string[]
}

export type TravelLoanItemInput = Pick<
  TravelLoanItem,
  'expenseItemId' | 'projectId' | 'borrowerEmployeeId' | 'amount' | 'purpose'
> & { id?: string }

export type TravelLoanPayeeInput = Pick<
  TravelLoanPayee,
  | 'settlementMethod'
  | 'payeeType'
  | 'payeeInformationId'
  | 'bankAccount'
  | 'accountName'
  | 'bankName'
  | 'amount'
  | 'remark'
> & { id?: string; payeeName?: string }

export interface TravelLoanSearch {
  applicationDateRange?: [string, string] | []
  applicantEmployeeId?: string
  status?: string
  keyword?: string
  tenantId?: string | null
  from?: number
  to?: number
}

export interface TravelLoanItemRecord extends TravelLoanItem {
  loan: TravelLoan
}

export interface LoanPayeeOption {
  id: string
  payeeName: string
  accountName: string | null
  bankName: string
  bankAccount: string
  employeeId: string | null
  isDefault: boolean
}

const { supabase, keysToSnakeDeep, responseHandle } = useSupabase()

export async function fetchTravelLoanList(params: TravelLoanSearch = {}) {
  let query = supabase
    .from('fms_travel_loan')
    .select('*', { count: 'exact' })
    .order('application_date', { ascending: false })
    .order('create_time', { ascending: false })
    .range(params.from ?? 0, params.to ?? 9)
  if (params.tenantId) query = query.eq('tenant_id', params.tenantId)
  if (params.applicationDateRange?.[0])
    query = query.gte('application_date', params.applicationDateRange[0])
  if (params.applicationDateRange?.[1])
    query = query.lte('application_date', params.applicationDateRange[1])
  if (params.applicantEmployeeId)
    query = query.eq('applicant_employee_id', params.applicantEmployeeId)
  if (params.status) query = query.eq('status', params.status)
  if (params.keyword?.trim())
    query = query.or(buildOrIlikeFilter(['loan_no', 'applicant_name', 'reason'], params.keyword))
  return await responseHandle<TravelLoan[]>(() => query, {
    showErrorMessage: false,
    errorMessage: '借款单加载失败，请检查网络后重试'
  })
}

export async function fetchTravelLoanItemList(params: TravelLoanSearch = {}) {
  let query = supabase
    .from('fms_travel_loan_item')
    .select('*,loan:fms_travel_loan!inner(*),expenseItem:tms_expense_item(item_name)', {
      count: 'exact'
    })
    .order('create_time', { ascending: false })
    .order('line_no', { ascending: true })
    .range(params.from ?? 0, params.to ?? 9)
  if (params.tenantId) query = query.eq('tenant_id', params.tenantId)
  if (params.applicationDateRange?.[0])
    query = query.gte('loan.application_date', params.applicationDateRange[0])
  if (params.applicationDateRange?.[1])
    query = query.lte('loan.application_date', params.applicationDateRange[1])
  if (params.applicantEmployeeId)
    query = query.eq('loan.applicant_employee_id', params.applicantEmployeeId)
  if (params.status) query = query.eq('loan.status', params.status)
  if (params.keyword?.trim())
    query = query.or(buildOrIlikeFilter(['loan_no', 'applicant_name', 'reason'], params.keyword), {
      referencedTable: 'loan'
    })
  return await responseHandle<TravelLoanItemRecord[]>(() => query, {
    showErrorMessage: false,
    errorMessage: '借款明细加载失败，请检查网络后重试'
  })
}

export async function fetchTravelLoanDetail(id: string) {
  return await responseHandle<TravelLoan>(
    () =>
      supabase
        .from('fms_travel_loan')
        .select('*,items:fms_travel_loan_item(*),payees:fms_travel_loan_payee(*)')
        .eq('id', id)
        .single(),
    { breakReturn: true, showErrorMessage: false, errorMessage: '借款单详情加载失败，请重试' }
  )
}

export async function saveTravelLoanDraft(
  input: TravelLoanInput,
  items: TravelLoanItemInput[],
  payees: TravelLoanPayeeInput[]
) {
  const payload = keysToSnakeDeep({
    ...input,
    reason: input.reason.trim(),
    remark: normalizeNullableText(input.remark)
  })
  return await responseHandle<{
    id: string
    loanNo: string
    status: string
    loanAmount: number
    paymentAmount: number
  }>(
    () =>
      supabase.rpc('save_fms_travel_loan_draft_secure', {
        p_payload: payload,
        p_items: keysToSnakeDeep(items),
        p_payees: keysToSnakeDeep(payees)
      }),
    { breakReturn: true, showErrorMessage: false, errorMessage: '借款单保存失败，请核对明细后重试' }
  )
}

export async function fetchLoanPayeeOptions(tenantId: string, borrowerEmployeeId: string) {
  return await responseHandle<LoanPayeeOption[]>(
    () =>
      supabase.rpc('fms_list_loan_payee_options_secure', {
        p_tenant_id: tenantId,
        p_borrower_employee_id: borrowerEmployeeId,
        p_keyword: null
      }),
    { breakReturn: true, showErrorMessage: false, errorMessage: '收款账户加载失败，请重试' }
  )
}
