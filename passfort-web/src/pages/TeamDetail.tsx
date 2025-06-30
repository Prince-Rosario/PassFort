import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    UsersIcon,
    CogIcon,
    ShareIcon,
    PlusIcon,
    TrashIcon,
    PencilIcon,
    XMarkIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    EllipsisVerticalIcon,
    ShieldCheckIcon,
    EyeIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TeamMemberRoleSelector } from '../components/ui/TeamMemberRoleSelector';
import { TeamService } from '../services/teamService';
import { vaultService } from '../services/vaultService';
import { SecureKeyManager, encryptVaultKey, deriveTeamKey } from '../utils/crypto';
import type {
    Team,
    TeamMember,
    VaultShare,
    InviteTeamMemberRequest,
    ShareVaultRequest
} from '../types/team';
import { TeamRole, VaultPermission } from '../types/team';
import type { VaultSummaryDto } from '../types/vault';
import { getTeamRoleLabel, getTeamRoleColor, getVaultPermissionLabel, getVaultPermissionColor } from '../types/team';

export const TeamDetail: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [vaultShares, setVaultShares] = useState<VaultShare[]>([]);
    const [userVaults, setUserVaults] = useState<Array<{ vault: VaultSummaryDto; decryptedName: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showShareVaultModal, setShowShareVaultModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);

    // Form states
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<TeamRole>(TeamRole.Member);
    const [selectedVault, setSelectedVault] = useState('');
    const [vaultPermission, setVaultPermission] = useState<VaultPermission>(VaultPermission.Read);
    const [editTeamName, setEditTeamName] = useState('');
    const [editTeamDescription, setEditTeamDescription] = useState('');

    useEffect(() => {
        if (teamId) {
            // Store current team ID for shared vault decryption
            localStorage.setItem('current_team_id', teamId);
            loadTeamData();
        }
    }, [teamId]);

    const loadTeamData = async () => {
        try {
            setLoading(true);
            if (!teamId) return;

            // Load team data in parallel
            const [teamData, membersData, vaultSharesData, vaultsData] = await Promise.all([
                TeamService.getTeam(teamId),
                TeamService.getTeamMembers(teamId),
                TeamService.getSharedVaults(),
                vaultService.getVaults()
            ]);

            // Decrypt vault names for display
            const decryptedVaults: Array<{ vault: VaultSummaryDto; decryptedName: string }> = [];
            for (const vault of vaultsData) {
                try {
                    // Decrypt the vault name using vault-specific key
                    const decryptedName = await vaultService.decryptVaultName(vault.id, vault.name);
                    decryptedVaults.push({
                        vault,
                        decryptedName: decryptedName
                    });
                } catch (error) {
                    console.warn(`Failed to decrypt vault name for vault ${vault.id}:`, error);
                    // Fallback to showing encrypted name or a default
                    decryptedVaults.push({
                        vault,
                        decryptedName: 'Encrypted Vault'
                    });
                }
            }

            setTeam(teamData);
            setMembers(membersData);
            setVaultShares(vaultSharesData.filter(share => share.teamId === teamId));
            setUserVaults(decryptedVaults);
            setEditTeamName(teamData.name);
            setEditTeamDescription(teamData.description || '');
            setError(null);
        } catch (err) {
            console.error('Error loading team data:', err);
            setError('Failed to load team data');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteMember = async () => {
        try {
            if (!teamId || !inviteEmail.trim()) return;

            const inviteData: InviteTeamMemberRequest = {
                teamId: teamId,
                email: inviteEmail.trim(),
                role: inviteRole
            };

            await TeamService.inviteTeamMember(teamId, inviteData);
            setInviteEmail('');
            setInviteRole(TeamRole.Member);
            setShowInviteModal(false);
            await loadTeamData(); // Refresh data
        } catch (err) {
            console.error('Error inviting member:', err);
            setError('Failed to invite member');
        }
    };

    const handleShareVault = async () => {
        try {
            if (!teamId || !selectedVault) return;

            console.log(`🔐 Starting team-based vault key sharing for vault ${selectedVault} with team ${teamId}`);

            // Get the vault's encryption key 
            const vaultKey = await vaultService.getVaultKey(selectedVault);
            if (!vaultKey) {
                setError('Could not access vault encryption key');
                return;
            }

            // Create a team-based encrypted vault key that any team member can decrypt
            // We'll use the teamId as a shared secret for this demonstration
            const teamBasedKey = await deriveTeamKey(teamId);
            const encryptedVaultKeyForSharing = await encryptVaultKey(vaultKey, teamBasedKey);
            console.log('🔑 Encrypted vault key for team-based sharing');

            const shareData: ShareVaultRequest = {
                vaultId: selectedVault,
                teamId: teamId,
                permission: vaultPermission,
                encryptedVaultKey: encryptedVaultKeyForSharing
            };

            await TeamService.shareVault(shareData);
            setSelectedVault('');
            setVaultPermission(VaultPermission.Read);
            setShowShareVaultModal(false);
            await loadTeamData(); // Refresh data

            console.log('✅ Vault successfully shared with team-based key encryption');
        } catch (err) {
            console.error('Error sharing vault:', err);
            setError('Failed to share vault');
        }
    };

    const handleUpdateTeam = async () => {
        try {
            if (!teamId) return;

            await TeamService.updateTeam(teamId, {
                id: teamId,
                name: editTeamName.trim(),
                description: editTeamDescription.trim() || undefined
            });

            setShowEditTeamModal(false);
            await loadTeamData(); // Refresh data
        } catch (err) {
            console.error('Error updating team:', err);
            setError('Failed to update team');
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            await TeamService.removeTeamMember(memberId);
            setShowDeleteConfirm(null);
            await loadTeamData(); // Refresh data
        } catch (err) {
            console.error('Error removing member:', err);
            setError('Failed to remove member');
        }
    };

    const handleUnshareVault = async (shareId: string) => {
        try {
            await TeamService.unshareVault(shareId);
            await loadTeamData(); // Refresh data
        } catch (err) {
            console.error('Error unsharing vault:', err);
            setError('Failed to unshare vault');
        }
    };

    const handleDeleteTeam = async () => {
        try {
            if (!teamId) return;

            await TeamService.deleteTeam(teamId);
            setShowDeleteTeamConfirm(false);
            navigate('/teams'); // Navigate back to teams list
        } catch (err) {
            console.error('Error deleting team:', err);
            setError('Failed to delete team');
            setShowDeleteTeamConfirm(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
        try {
            await TeamService.updateTeamMemberRole(memberId, {
                teamMemberId: memberId,
                role: newRole
            });
            await loadTeamData(); // Refresh data
        } catch (err) {
            console.error('Error updating member role:', err);
            setError('Failed to update member role');
            throw err; // Re-throw so the component can handle it
        }
    };

    const isTeamAdmin = () => {
        // TODO: Check if current user is admin of this team
        return true; // For now, assume user is admin
    };

    const getAvailableVaults = () => {
        const sharedVaultIds = vaultShares.map(share => share.vaultId);
        return userVaults.filter(vaultData => !sharedVaultIds.includes(vaultData.vault.id));
    };

    const getVaultName = (vaultId: string) => {
        const vaultData = userVaults.find(v => v.vault.id === vaultId);
        return vaultData?.decryptedName || `Vault ${vaultId}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Team not found</h2>
                    <Button onClick={() => navigate('/teams')}>Back to Teams</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/teams')}
                        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        Back to Teams
                    </button>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                    <UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
                                    {team.description && (
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">{team.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span>{team.memberCount} members</span>
                                        <span>•</span>
                                        <span>{team.sharedVaultCount} shared vaults</span>
                                        <span>•</span>
                                        <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {isTeamAdmin() && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowEditTeamModal(true)}
                                    >
                                        <PencilIcon className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowInviteModal(true)}
                                    >
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Invite
                                    </Button>
                                    <Button
                                        onClick={() => setShowShareVaultModal(true)}
                                    >
                                        <ShareIcon className="h-4 w-4 mr-2" />
                                        Share Vault
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                        onClick={() => setShowDeleteTeamConfirm(true)}
                                    >
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Delete Team
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Members Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <UsersIcon className="h-5 w-5" />
                                    Team Members ({members.length})
                                </h2>
                                {isTeamAdmin() && (
                                    <Button
                                        size="sm"
                                        onClick={() => setShowInviteModal(true)}
                                    >
                                        <PlusIcon className="h-4 w-4 mr-1" />
                                        Invite
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                                <UsersIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {member.userFullName || member.userEmail || member.userId}
                                                </p>
                                                {member.userEmail && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {member.userEmail}
                                                    </p>
                                                )}
                                                {!member.userEmail && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        ID: {member.userId}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <TeamMemberRoleSelector
                                                        currentRole={member.role}
                                                        memberId={member.id}
                                                        onRoleChange={handleRoleChange}
                                                        disabled={!isTeamAdmin() || member.role === TeamRole.Admin}
                                                    />
                                                    {member.isInvitePending && (
                                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full text-xs">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isTeamAdmin() && member.role !== TeamRole.Admin && (
                                            <button
                                                onClick={() => setShowDeleteConfirm(member.id)}
                                                className="text-red-600 hover:text-red-700 p-1"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {members.length === 0 && (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                        No members yet
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Shared Vaults Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <KeyIcon className="h-5 w-5" />
                                    Shared Vaults ({vaultShares.length})
                                </h2>
                                {isTeamAdmin() && (
                                    <Button
                                        size="sm"
                                        onClick={() => setShowShareVaultModal(true)}
                                    >
                                        <ShareIcon className="h-4 w-4 mr-1" />
                                        Share
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {vaultShares.map((share) => (
                                    <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                                <KeyIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{getVaultName(share.vaultId)}</p>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVaultPermissionColor(share.permission)}`}>
                                                    {getVaultPermissionLabel(share.permission)}
                                                </span>
                                            </div>
                                        </div>
                                        {isTeamAdmin() && (
                                            <button
                                                onClick={() => handleUnshareVault(share.id)}
                                                className="text-red-600 hover:text-red-700 p-1"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {vaultShares.length === 0 && (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                        No shared vaults yet
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invite Member Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Team Member</h3>
                                    <button
                                        onClick={() => setShowInviteModal(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <Input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Role
                                    </label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(Number(e.target.value) as TeamRole)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={TeamRole.Member}>Member</option>
                                        <option value={TeamRole.Admin}>Admin</option>
                                        <option value={TeamRole.Viewer}>Viewer</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleInviteMember}
                                        className="flex-1"
                                        disabled={!inviteEmail.trim()}
                                    >
                                        Send Invite
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Share Vault Modal */}
                {showShareVaultModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Vault</h3>
                                    <button
                                        onClick={() => setShowShareVaultModal(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Select Vault
                                    </label>
                                    <select
                                        value={selectedVault}
                                        onChange={(e) => setSelectedVault(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Choose a vault...</option>
                                        {getAvailableVaults().map((vaultData) => (
                                            <option key={vaultData.vault.id} value={vaultData.vault.id}>
                                                {vaultData.decryptedName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Permission Level
                                    </label>
                                    <select
                                        value={vaultPermission}
                                        onChange={(e) => setVaultPermission(Number(e.target.value) as VaultPermission)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={VaultPermission.Read}>Read Only</option>
                                        <option value={VaultPermission.Write}>Read & Write</option>
                                        <option value={VaultPermission.Admin}>Admin</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowShareVaultModal(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleShareVault}
                                        className="flex-1"
                                        disabled={!selectedVault}
                                    >
                                        Share Vault
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Team Modal */}
                {showEditTeamModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Team</h3>
                                    <button
                                        onClick={() => setShowEditTeamModal(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Team Name
                                    </label>
                                    <Input
                                        type="text"
                                        value={editTeamName}
                                        onChange={(e) => setEditTeamName(e.target.value)}
                                        placeholder="Enter team name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={editTeamDescription}
                                        onChange={(e) => setEditTeamDescription(e.target.value)}
                                        placeholder="Enter team description"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowEditTeamModal(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpdateTeam}
                                        className="flex-1"
                                        disabled={!editTeamName.trim()}
                                    >
                                        Update Team
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Member Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remove Member</h3>
                                        <p className="text-gray-600 dark:text-gray-400">This action cannot be undone.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => handleRemoveMember(showDeleteConfirm)}
                                        className="flex-1 bg-red-600 hover:bg-red-700"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Team Confirmation Modal */}
                {showDeleteTeamConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Team</h3>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Are you sure you want to delete "{team?.name}"? This will permanently delete the team, all its members, and shared vault permissions. This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteTeamConfirm(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleDeleteTeam}
                                        className="flex-1 bg-red-600 hover:bg-red-700"
                                    >
                                        Delete Team
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}; 