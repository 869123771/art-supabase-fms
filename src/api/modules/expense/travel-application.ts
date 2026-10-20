import { useSupabase } from '@/hooks/core/useSupabase'
import { buildOrIlikeFilter } from '@/utils/supabase/search'
import { normalizeNullableText } from '@/utils/form/normalize'

export interface TravelItinerary {
  id: string
  tenantId: string
  applicationId: string
  lineNo: number
  departureRegionPath: string[]
  departurePlace: string
  destinationRegionPath: string[]
  destinationPlace: string
  startDate: string
  endDate: string
  transportModes: string[]
  travelerEmployeeIds: string[]
  expenseItemId: string
  projectId: string | null
  requestedAmount: number
  remark: string | null
}

export interface TravelApplication {
  id: string
  tenantId: string
  applicationNo: string
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
  travelType: 'general' | 'project'
  multipleTravelers: boolean
  reason: string
  requestedAmount: number
  estimatedDays: number
  loanAmount: number
  approvedAmount: number | null
  pendingCollectionAmount: number | null
  repaidAmount: number | null
  remainingBalance: number | null
  usedAmount: number | null
  paidAmount: number | null
  currentHandler: string | null
  rejectionOpinion: string | null
  status: string
  remark: string | null
  attachmentUrls: string[]
  createTime: string
  itineraries?: TravelItinerary[]
}

export interface TravelApplicationInput {
  id?: string
  tenantId: string
  applicantEmployeeId: string
  assignmentId: string | null
  applicationDate: string
  expenseDepartmentId: string | null
  travelType: 'general' | 'project'
  multipleTravelers: boolean
  reason: string
  remark: string | null
  attachmentUrls: string[]
}

export type TravelItineraryInput = Pick<
  TravelItinerary,
  | 'departureRegionPath'
  | 'departurePlace'
  | 'destinationRegionPath'
  | 'destinationPlace'
  | 'startDate'
  | 'endDate'
  | 'transportModes'
  | 'travelerEmployeeIds'
  | 'expenseItemId'
  | 'projectId'
  | 'requestedAmount'
  | 'remark'
> & { id?: string }

export interface TravelApplicationSearch {
  applicationDateRange?: [string, string] | []
  applicantEmployeeId?: string
  status?: string
  keyword?: string
  tenantId?: string | null
  from?: number
  to?: number
}

export interface TravelLineRecord extends TravelItinerary {
  application: TravelApplication
  expenseItem?: { itemName: string } | null
  project?: { projectName: string } | null
}

export interface TravelProjectOption {
  id: string
  projectCode: string
  projectName: string
}

export interface TravelAssignmentOption {
  id: string
  businessTitle: string | null
  primaryAssignment: boolean
}

const { supabase, keysToSnakeDeep, responseHandle } = useSupabase()

export async function fetchTravelApplicationList(params: TravelApplicationSearch = {}) {
  let query = supabase
    .from('fms_travel_application')
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
    query = query.or(
      buildOrIlikeFilter(['application_no', 'applicant_name', 'reason'], params.keyword)
    )
  return await responseHandle<TravelApplication[]>(() => query, {
    showErrorMessage: false,
    errorMessage: '出差申请加载失败，请检查网络后重试'
  })
}

export async function fetchTravelItineraryList(params: TravelApplicationSearch = {}) {
  let query = supabase
    .from('fms_travel_itinerary')
    .select(
      '*,application:fms_travel_application!inner(*),expenseItem:tms_expense_item(item_name),project:mdm_project(project_name)',
      { count: 'exact' }
    )
    .order('create_time', { ascending: false })
    .order('line_no', { ascending: true })
    .range(params.from ?? 0, params.to ?? 9)
  if (params.tenantId) query = query.eq('tenant_id', params.tenantId)
  if (params.applicationDateRange?.[0])
    query = query.gte('application.application_date', params.applicationDateRange[0])
  if (params.applicationDateRange?.[1])
    query = query.lte('application.application_date', params.applicationDateRange[1])
  if (params.applicantEmployeeId)
    query = query.eq('application.applicant_employee_id', params.applicantEmployeeId)
  if (params.status) query = query.eq('application.status', params.status)
  if (params.keyword?.trim())
    query = query.or(
      buildOrIlikeFilter(['application_no', 'applicant_name', 'reason'], params.keyword),
      { referencedTable: 'application' }
    )
  return await responseHandle<TravelLineRecord[]>(() => query, {
    showErrorMessage: false,
    errorMessage: '行程明细加载失败，请检查网络后重试'
  })
}

export async function fetchTravelApplicationDetail(id: string) {
  return await responseHandle<TravelApplication>(
    () =>
      supabase
        .from('fms_travel_application')
        .select('*,itineraries:fms_travel_itinerary(*)')
        .eq('id', id)
        .single(),
    { breakReturn: true, showErrorMessage: false, errorMessage: '出差申请详情加载失败，请重试' }
  )
}

export async function saveTravelApplicationDraft(
  input: TravelApplicationInput,
  itineraries: TravelItineraryInput[]
) {
  const payload = keysToSnakeDeep({
    ...input,
    reason: input.reason.trim(),
    remark: normalizeNullableText(input.remark)
  })
  return await responseHandle<{
    id: string
    applicationNo: string
    status: string
    requestedAmount: number
    estimatedDays: number
  }>(
    () =>
      supabase.rpc('save_fms_travel_application_draft_secure', {
        p_payload: payload,
        p_lines: keysToSnakeDeep(itineraries)
      }),
    {
      breakReturn: true,
      showErrorMessage: false,
      errorMessage: '出差申请保存失败，请核对行程后重试'
    }
  )
}

export async function fetchExpenseProjectOptions(tenantId: string) {
  return await responseHandle<TravelProjectOption[]>(
    () => supabase.rpc('fms_list_expense_project_options_secure', { p_tenant_id: tenantId }),
    { breakReturn: true, showErrorMessage: false, errorMessage: '项目选项加载失败，请重试' }
  )
}

export async function fetchTravelAssignmentOptions(tenantId: string, employeeId: string) {
  return await responseHandle<TravelAssignmentOption[]>(
    () =>
      supabase
        .from('mdm_employee_assignment')
        .select('id,business_title,primary_assignment')
        .eq('tenant_id', tenantId)
        .eq('employee_id', employeeId)
        .order('primary_assignment', { ascending: false }),
    { breakReturn: true, showErrorMessage: false, errorMessage: '任职职位加载失败，请重试' }
  )
}
