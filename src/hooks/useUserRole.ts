import { useOrganization } from '../contexts/OrganizationContext';
import { MembershipRole } from '../types';

export function useUserRole() {
  const { memberships, currentOrganization } = useOrganization();
  
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
  
  // Permission flags
  const canEdit = isMemberPlus;
  const canDelete = isAdminOrOwner;
  const canManageMembers = isAdminOrOwner;
  const canManageBilling = isOwner;
  const canDeleteOrg = isOwner;

  return {
    role,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    isAdminOrOwner,
    isMemberPlus,
    canEdit,
    canDelete,
    canManageMembers,
    canManageBilling,
    canDeleteOrg
  };
}
