import React from 'react';
import { 
  UserPlus, 
  Mail, 
  Crown, 
  Trash2, 
  LogOut, 
  AlertTriangle, 
  ArrowRightLeft, 
  Shield, 
  Users as UsersIcon, 
  Globe 
} from 'lucide-react';

interface TeamTabProps {
  canManageMembers: boolean;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: 'admin' | 'member' | 'viewer';
  setInviteRole: (v: 'admin' | 'member' | 'viewer') => void;
  isInviting: boolean;
  handleInviteMember: (e: React.FormEvent) => void;
  memberships: any[];
  profile: any;
  handleUpdateRole: (userId: string, role: string) => void;
  handleRemoveMember: (userId: string) => void;
  isOwner: boolean;
  newOwnerId: string;
  setNewOwnerId: (v: string) => void;
  transferringOwnership: boolean;
  handleTransferOwnership: () => void;
  currentOrganization: any;
}

export function TeamTab({
  canManageMembers,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  isInviting,
  handleInviteMember,
  memberships,
  profile,
  handleUpdateRole,
  handleRemoveMember,
  isOwner,
  newOwnerId,
  setNewOwnerId,
  transferringOwnership,
  handleTransferOwnership,
  currentOrganization,
}: TeamTabProps) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6 text-left">
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
          Team
          {canManageMembers && (
            <div className="flex items-center gap-1 text-[9px] text-[#C8FF00] font-semibold tracking-wider font-mono">
              <Shield size={10} /> ADMIN CLEARANCE
            </div>
          )}
        </h3>

        {/* Invite Section (Owner/Admin) */}
        {canManageMembers && (
          <form onSubmit={handleInviteMember} className="p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
            <p className="text-xs font-semibold text-[#EEEEEE] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <UserPlus size={13} className="text-[#C8FF00]" /> Invite Team Member
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                <input 
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="operator@email.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-xs outline-none text-[#EEEEEE] focus:border-[#444444]"
                />
              </div>
              <select 
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-xs outline-none cursor-pointer"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button 
                disabled={isInviting}
                type="submit"
                className="px-4 py-2.5 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all shadow-md disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isInviting ? 'Sending...' : 'Invite user'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4">
          {/* Organization Members */}
          <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#C8FF00]">
                  <UsersIcon size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-[#888888] tracking-wider leading-none mb-1">Organization Users</p>
                  <p className="text-sm font-semibold text-[#EEEEEE]">{memberships.length} active members</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {memberships.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-[#080808]/40 rounded-lg transition-all border border-transparent hover:border-[#222222]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#080808] border border-[#222222] text-[#888888] rounded-md flex items-center justify-center text-[10px] font-bold italic relative">
                      {m.role === 'owner' ? <Crown size={12} className="text-amber-400" /> : m.role[0].toUpperCase()}
                      {m.user_id === profile?.id && (
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#10B981] rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">
                        {m.user_id === profile?.id ? 'You' : 'Member'}
                      </p>
                      <p className="text-[9px] text-[#888888] font-mono uppercase">{m.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canManageMembers && m.user_id !== profile?.id && m.role !== 'owner' && (
                      <select 
                        defaultValue={m.role}
                        onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                        className="bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-[10px] px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}

                    {canManageMembers && m.user_id !== profile?.id && m.role !== 'owner' && (
                      <button 
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="p-1 text-[#888888] hover:text-[#EF4444] transition-colors cursor-pointer"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {m.user_id === profile?.id && m.role !== 'owner' && (
                      <button 
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#EF444415] text-[#EF4444] hover:bg-[#EF444425] rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                        type="button"
                      >
                        <LogOut size={10} /> Leave
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Managed Accounts (Agency Only) */}
          {currentOrganization?.type === 'agency' && (
            <div className="p-4 bg-[#161616] border border-[#222222] border-dashed rounded-xl text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#888888]">
                    <Globe size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#888888] tracking-wider leading-none mb-1 font-mono">Agency Mode</p>
                    <p className="text-xs font-semibold text-[#EEEEEE]">Segregated Client Workspaces</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#888888] leading-relaxed italic">
                This organization operates under agency rules. Segmented client recovery flows are active under custom permissions.
              </p>
            </div>
          )}
        </div>

        {/* Danger Zone: Ownership Transfer (Owner Only) */}
        {isOwner && memberships.length > 1 && (
          <div className="p-4 bg-[#EF444410] border border-[#EF444430] rounded-xl text-left mt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#EF444415] rounded-lg flex items-center justify-center text-[#EF4444]">
                <AlertTriangle size={14} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[#EF4444] tracking-wider leading-none mb-1 font-mono font-bold">Danger Zone</p>
                <p className="text-xs font-semibold text-[#EEEEEE]">Transfer Ownership</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-[11px] text-[#888888] italic">
                Transfer full ownership of this organization to another member.
              </p>
              <div className="flex gap-2">
                <select 
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-xs outline-none cursor-pointer"
                >
                  <option value="">Select recipient...</option>
                  {memberships
                    .filter(m => m.user_id !== profile?.id)
                    .map(m => (
                      <option key={m.user_id} value={m.user_id}>Member ({m.user_id.slice(0, 8)})</option>
                    ))
                  }
                </select>
                <button 
                  onClick={handleTransferOwnership}
                  disabled={!newOwnerId || transferringOwnership}
                  className="px-3 py-1.5 bg-[#EF4444] hover:bg-[#ef4444eb] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                  type="button"
                >
                  <ArrowRightLeft size={12} /> Transfer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
