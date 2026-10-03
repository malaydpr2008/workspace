'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  X,
  Mail,
  Building,
  Lock,
  Check,
  Info,
} from 'lucide-react';
import { WorkspaceRole, WorkspaceMembership } from '@/types/workspace';
import { useWorkspaceStore, getRoleCapabilities } from '@/store/workspaceStore';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName?: string;
}

export const ROLE_CONFIG: Record<
  WorkspaceRole,
  {
    label: string;
    icon: string;
    badgeBg: string;
    color: string;
    border: string;
    description: string;
  }
> = {
  OWNER: {
    label: 'Studio Executive / Owner',
    icon: '👑',
    badgeBg: 'bg-amber-500/15',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    description: 'Full studio authority: manage members, freeze scenes, approve budgets.',
  },
  PRODUCER: {
    label: 'Producer',
    icon: '💼',
    badgeBg: 'bg-indigo-500/15',
    color: 'text-indigo-400',
    border: 'border-indigo-500/40',
    description: 'Executive management: edit budgets, approve stripboard schedules, lock scenes.',
  },
  DIRECTOR: {
    label: 'Director',
    icon: '🎬',
    badgeBg: 'bg-sky-500/15',
    color: 'text-sky-400',
    border: 'border-sky-500/40',
    description: 'Creative authority: edit script blocks, lock scenes, review takes & storyboards.',
  },
  WRITER: {
    label: 'Writer',
    icon: '✍️',
    badgeBg: 'bg-emerald-500/15',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    description: 'Story developer: edit dialogue & action scenes. Restricted from financial ledger.',
  },
  DEPT_HEAD: {
    label: 'Head of Department',
    icon: '🛠️',
    badgeBg: 'bg-violet-500/15',
    color: 'text-violet-400',
    border: 'border-violet-500/40',
    description: 'Department specialist: tag breakdown elements, cue audio & sound FX.',
  },
  ACTOR: {
    label: 'Actor',
    icon: '🎭',
    badgeBg: 'bg-rose-500/15',
    color: 'text-rose-400',
    border: 'border-rose-500/40',
    description: 'Cast talent: restricted to actor sides, character dialogue, and call sheets.',
  },
};

const ALL_ROLES: WorkspaceRole[] = [
  'OWNER',
  'PRODUCER',
  'DIRECTOR',
  'WRITER',
  'DEPT_HEAD',
  'ACTOR',
];

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
}) => {
  const {
    memberships,
    loadMemberships,
    createMemberItem,
    updateMemberItem,
    deleteMemberItem,
    currentCapabilities,
  } = useWorkspaceStore();

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<WorkspaceRole>('WRITER');
  const [newDepartment, setNewDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'matrix'>('members');

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadMemberships(workspaceId);
    }
  }, [isOpen, workspaceId, loadMemberships]);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newEmail.trim() || !newName.trim()) {
      setFormError('Please enter both name and email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createMemberItem({
        workspace: workspaceId,
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        department: newDepartment.trim().toUpperCase(),
      });

      if (created) {
        setNewName('');
        setNewEmail('');
        setNewDepartment('');
        setNewRole('WRITER');
      } else {
        setFormError('Could not invite collaborator. Email might already exist in this workspace.');
      }
    } catch {
      setFormError('Failed to invite member. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: WorkspaceRole) => {
    await updateMemberItem(memberId, { role });
  };

  const handleDeleteMember = async (member: WorkspaceMembership) => {
    if (confirm(`Remove ${member.name} (${member.email}) from workspace?`)) {
      await deleteMemberItem(member.id);
    }
  };

  const canManage = currentCapabilities.canManageMembers;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Team Members & Access Control
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  RBAC
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {workspaceName ? `Workspace: ${workspaceName}` : 'Manage production collaborator roles and permissions'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('members')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'members'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Members ({memberships.length})
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'matrix'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Permission Matrix
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Permission Notice if user cannot manage */}
        {!canManage && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center space-x-2 text-xs font-mono text-amber-300">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              View-only mode: Only Studio Owners and Producers have authority to invite collaborators or modify role assignments.
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'members' ? (
            <>
              {/* Invite Collaborator Form (Only visible if canManage) */}
              {canManage && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Invite Production Collaborator</span>
                  </div>

                  {formError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
                    <div className="md:col-span-1">
                      <label className="block text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Greta Gerwig"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-slate-400 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="greta@studio.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-slate-400 mb-1">Production Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as WorkspaceRole)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-slate-400 mb-1">Department (Optional)</label>
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="e.g. DIRECTING"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-center space-x-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Inviting...' : 'Add Member'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Members Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-left">
                      <th className="py-3 px-4">Member & Email</th>
                      <th className="py-3 px-4">Production Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Permission Capabilities</th>
                      {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {memberships.length === 0 ? (
                      <tr>
                        <td colSpan={canManage ? 5 : 4} className="py-8 text-center text-slate-500">
                          No team members registered yet. Invite collaborators to grant granular access.
                        </td>
                      </tr>
                    ) : (
                      memberships.map((m) => {
                        const roleInfo = ROLE_CONFIG[m.role] || ROLE_CONFIG.WRITER;
                        const caps = getRoleCapabilities(m.role);

                        return (
                          <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                            {/* Member info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-white">{m.name}</div>
                                  <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                                    <Mail className="w-3 h-3 text-slate-500" />
                                    <span>{m.email}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Production Role Dropdown or Badge */}
                            <td className="py-3 px-4">
                              {canManage ? (
                                <select
                                  value={m.role}
                                  onChange={(e) =>
                                    handleRoleChange(m.id, e.target.value as WorkspaceRole)
                                  }
                                  className={`px-2 py-1 rounded-md text-xs font-mono font-semibold border ${roleInfo.badgeBg} ${roleInfo.color} ${roleInfo.border} bg-slate-900 focus:outline-none`}
                                >
                                  {ALL_ROLES.map((r) => (
                                    <option key={r} value={r} className="bg-slate-900 text-white">
                                      {ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${roleInfo.badgeBg} ${roleInfo.color} ${roleInfo.border}`}
                                >
                                  <span>{roleInfo.icon}</span>
                                  <span>{roleInfo.label}</span>
                                </span>
                              )}
                            </td>

                            {/* Department */}
                            <td className="py-3 px-4">
                              {m.department ? (
                                <span className="inline-flex items-center space-x-1 text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                  <Building className="w-3 h-3 text-slate-400" />
                                  <span>{m.department}</span>
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            {/* Capabilities Pill Matrix */}
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1.5 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    caps.canEditScript
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-800/40 text-slate-500 border-slate-800 line-through'
                                  }`}
                                  title={caps.canEditScript ? 'Can edit screenplay script blocks' : 'Cannot edit screenplay'}
                                >
                                  Script
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    caps.canEditBudget
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-800/40 text-slate-500 border-slate-800 line-through'
                                  }`}
                                  title={caps.canEditBudget ? 'Can edit production budgets & rates' : 'Cannot edit production budgets'}
                                >
                                  Budget
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    caps.canLockScenes
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-800/40 text-slate-500 border-slate-800 line-through'
                                  }`}
                                  title={caps.canLockScenes ? 'Can freeze and lock scene numbers' : 'Cannot lock scenes'}
                                >
                                  Lock
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    caps.canManageMembers
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-800/40 text-slate-500 border-slate-800 line-through'
                                  }`}
                                  title={caps.canManageMembers ? 'Can invite and manage team members' : 'Cannot manage team members'}
                                >
                                  Admin
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            {canManage && (
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteMember(m)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                  title="Remove collaborator"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Role Capability Reference Matrix Card */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Production RBAC Security Matrix</span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Industry standard access separation ensuring writers focus on dialogue, directors command camera and locks, producers manage ledgers, and actors access sides.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-left">
                      <th className="py-3 px-4">Production Role</th>
                      <th className="py-3 px-4 text-center">Edit Screenplay</th>
                      <th className="py-3 px-4 text-center">Manage Budget</th>
                      <th className="py-3 px-4 text-center">Lock Scenes</th>
                      <th className="py-3 px-4 text-center">Team Admin</th>
                      <th className="py-3 px-4">Primary Production Canvas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ALL_ROLES.map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      const caps = getRoleCapabilities(r);

                      return (
                        <tr key={r} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <span className="flex items-center space-x-2">
                              <span>{cfg.icon}</span>
                              <span className={cfg.color}>{cfg.label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {caps.canEditScript ? (
                              <Check className="w-4 h-4 text-emerald-400 inline" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-600 inline" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {caps.canEditBudget ? (
                              <Check className="w-4 h-4 text-emerald-400 inline" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-600 inline" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {caps.canLockScenes ? (
                              <Check className="w-4 h-4 text-emerald-400 inline" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-600 inline" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {caps.canManageMembers ? (
                              <Check className="w-4 h-4 text-emerald-400 inline" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-600 inline" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {r === 'OWNER' && 'Master Studio Command Center & Executive Overview'}
                            {r === 'PRODUCER' && 'Production Budget Ledger & Digital Stripboard'}
                            {r === 'DIRECTOR' && 'Screenplay Canvas, Beat Board, Shot List'}
                            {r === 'WRITER' && 'Courier Prime Screenplay Script Editor'}
                            {r === 'DEPT_HEAD' && 'Script Breakdown Sheet & Audio Spotting Drawer'}
                            {r === 'ACTOR' && 'Filtered Actor Sides & Daily Call Sheets'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Studio Production Security System • DRF Permission Policy Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
