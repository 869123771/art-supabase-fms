import { buildSupabaseRpcRange } from '@/utils/supabase'
import { normalizeNullableText } from '@/utils/form/normalize'
import { useSupabase } from '@/hooks'
import type { ApiFeedbackOptions } from '@/types/api/request'
import { actWorkflowByBusiness, startWorkflow } from '@/api/workflow'

type CustomerStatement = Api.Fms.CustomerStatementRecord
type CustomerStatementSearchParams = Api.Fms.CustomerStatementSearchParams
type EligibleWaybill = Api.Fms.CustomerStatementEligibleWaybill
type EligibleWaybillSearchParams = Api.Fms.CustomerStatementEligibleWaybillSearchParams
type CreateCustomerStatementPayload = Api.Fms.CreateCustomerStatementPayload
type CustomerStatementStatusPayload = Api.Fms.CustomerStatementStatusPayload

interface SecureListPayload<TRecord, TAccess extends Record<string, string> = never> {
  records: TRecord[]
  total: number
  fieldAccess?: TAccess
}

const { supabase, responseHandle } = useSupabase()

const toListRpcParams = (
  params: CustomerStatementSearchParams & { ids?: string[]; maxRows?: number },
  purpose: 'list' | 'export'
) => {
  const from = purpose === 'export' ? 0 : Math.max(params.from ?? 0, 0)
  const requestedTo = purpose === 'export' ? Math.max((params.maxRows ?? 10000) - 1, 0) : params.to
  return {
    ...buildSupabaseRpcRange(from, requestedTo ?? 9),
    p_customer_id: params.customerId || null,
    p_record_id: params.recordId || null,
    p_status: params.status || null,
    p_keyword: normalizeNullableText(String(params.keyword ?? '')),
    p_period_start: params.periodRange?.[0] || null,
    p_period_end: params.periodRange?.[1] || null,
    p_ids: params.ids?.length ? params.ids : null,
    p_purpose: purpose
  }
}

export async function fetchCustomerStatementList(
  params: CustomerStatementSearchParams,
  options?: ApiFeedbackOptions
) {
  const result = await responseHandle<
    SecureListPayload<CustomerStatement, Api.Fms.CustomerStatementFieldAccessMap>
  >(() => supabase.rpc('tms_list_customer_statements_secure', toListRpcParams(params, 'list')), {
    showErrorMessage: options?.showErrorMessage ?? true
  })
  return {
    data: result.data?.records ?? [],
    total: result.data?.total ?? 0,
    error: result.error,
    fieldAccess: result.data?.fieldAccess ?? {}
  }
}

export async function exportCustomerStatementList(
  params: CustomerStatementSearchParams & { ids?: string[]; maxRows?: number }
) {
  const result = await responseHandle<
    SecureListPayload<CustomerStatement, Api.Fms.CustomerStatementFieldAccessMap>
  >(() => supabase.rpc('tms_list_customer_statements_secure', toListRpcParams(params, 'export')), {
    showErrorMessage: true
  })
  return {
    data: result.data?.records ?? [],
    total: result.data?.total ?? 0,
    error: result.error,
    fieldAccess: result.data?.fieldAccess ?? {}
  }
}

export async function fetchCustomerStatementEligibleWaybills(params: EligibleWaybillSearchParams) {
  const result = await responseHandle<
    SecureListPayload<EligibleWaybill, Api.Fms.CustomerStatementFieldAccessMap>
  >(
    () =>
      supabase.rpc('tms_list_customer_statement_eligible_waybills_secure', {
        p_customer_id: params.customerId,
        p_period_start: params.periodStart,
        p_period_end: params.periodEnd,
        p_keyword: normalizeNullableText(String(params.keyword ?? '')),
        ...buildSupabaseRpcRange(params.from ?? 0, params.to ?? 9)
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

export async function fetchCustomerStatementDetail(id: string) {
  return await responseHandle<CustomerStatement | null>(
    () => supabase.rpc('tms_get_customer_statement_secure', { p_id: id }),
    { showErrorMessage: false }
  )
}

export async function createCustomerStatement(params: CreateCustomerStatementPayload) {
  return await responseHandle<string>(
    () =>
      supabase.rpc('tms_create_customer_statement_by_orders_secure', {
        p_customer_id: params.customerId,
        p_period_start: params.periodStart,
        p_period_end: params.periodEnd,
        p_order_ids: params.orderIds,
        p_remark: params.remark || null,
        p_statement_no: params.statementNo || null
      }),
    { showMessage: true, breakReturn: true }
  )
}

export async function updateCustomerStatementStatus(params: CustomerStatementStatusPayload) {
  if (params.status === 'pending_review') {
    return await startWorkflow({
      businessType: 'tms_customer_statement',
      businessId: params.id,
      businessTitle: params.businessTitle || `客户对账单 ${params.id}`
    })
  }
  if (params.status === 'confirmed' || params.status === 'draft') {
    return await actWorkflowByBusiness({
      businessType: 'tms_customer_statement',
      businessId: params.id,
      action: params.status === 'confirmed' ? 'approve' : 'reject',
      comment: params.reviewRemark || null
    })
  }
  if (params.status === 'voided') {
    return await responseHandle<boolean>(
      () =>
        supabase.rpc('tms_void_customer_statement_secure', {
          p_id: params.id,
          p_reason: params.voidReason || null
        }),
      { showMessage: true, breakReturn: true }
    )
  }
  throw new Error(`不支持直接变更客户对账单状态：${params.status}`)
}

export async function deleteCustomerStatement(id: string) {
  return await responseHandle<boolean>(
    () => supabase.rpc('tms_delete_customer_statement_secure', { p_id: id }),
    { showMessage: true, breakReturn: true }
  )
}
