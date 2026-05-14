import { useOrganization } from '../contexts/OrganizationContext';
import { MembershipRole } from '../types';

export function useUserRole() {
  const { memberships, currentOrganization, loading: orgLoading } = useOrganization();
  
  const currentMembership = memberships.find(
    (m) => m.organization_id === currentOrganization?.id
  );
  
  const role = currentMembership?.role as MembershipRole | undefined;
  
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isMember = role === 'member';
  const isViewer = role === 'viewer';
  
  // Logical groupings
  const isAdminOrOwner = isOwner || isAdmin;
  const isMemberPlus = isOwner || isAdmin || isMember;
  
  const capabilities = {
    canEdit: !!isMemberPlus,
    canDelete: !!isAdminOrOwner,
    canManageMembers: !!isAdminOrOwner,
    canManageBilling: !!isOwner,
    canDeleteOrg: !!isOwner,
    canManageInvoices: !!isMemberPlus,
    canManageRecovery: !!isMemberPlus,
  };

  const isLoading = orgLoading || (currentOrganization && !role);

  if (isLoading || !role || !currentMembership) {
    return {
      role: null,
      isOwner: false,
      isAdmin: false,
      isMember: false,
      isViewer: false,
      isAdminOrOwner: false,
      isMemberPlus: false,
      capabilities: {
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        canManageBilling: false,
        canDeleteOrg: false,
        canManageInvoices: false,
        canManageRecovery: false,
      },
      isLoading: true
    };
  }

  return {
    role,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    isAdminOrOwner,
    isMemberPlus,
    capabilities,
    isLoading: false
  };
}
