import type { Ref } from 'vue'
import { fetchTravelAssignmentOptions } from '@fms/api'
import { notifyFriendlyError } from '@/hooks/core/useArtFeedback'

interface AssignmentForm {
  tenantId: string
  applicantEmployeeId: string
  assignmentId: string | null
}

export function usePrimaryAssignment<T extends AssignmentForm>(model: Ref<T>) {
  let latestRequest = 0

  async function selectPrimaryAssignment(): Promise<void> {
    const request = ++latestRequest
    const { tenantId, applicantEmployeeId, assignmentId } = model.value
    if (!tenantId || !applicantEmployeeId || assignmentId) return
    try {
      const result = await fetchTravelAssignmentOptions(tenantId, applicantEmployeeId)
      if (
        request !== latestRequest ||
        model.value.tenantId !== tenantId ||
        model.value.applicantEmployeeId !== applicantEmployeeId ||
        model.value.assignmentId
      )
        return
      model.value.assignmentId =
        result.data.find((assignment) => assignment.primaryAssignment)?.id ?? null
    } catch (error) {
      notifyFriendlyError(error, '默认职位加载失败，请手工选择或重试')
    }
  }

  return { selectPrimaryAssignment }
}
