import TreeUtils from '@/utils/tree'

type Organization = Api.SystemManage.OrganizationScopeFilterItem

const organizationTreeUtils = new TreeUtils({
  idKey: 'id',
  parentKey: 'parentId',
  childrenKey: 'children'
})

export function findExpenseCompany(
  organizations: Organization[],
  organizationId: string | null | undefined
): Organization | null {
  if (!organizationId) return null
  const path = organizationTreeUtils.getPathToNode(organizations, organizationId) ?? []
  for (const id of path.reverse()) {
    const organization = organizationTreeUtils.findNode(organizations, id)
    if (organization?.organizationType === 'company') return organization
  }
  return null
}
