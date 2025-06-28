import React, { useState, useEffect } from 'react';
import {
    KeyIcon,
    ShareIcon,
    XMarkIcon,
    PlusIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    CheckIcon,
    PencilIcon
} from '@heroicons/react/24/outline';

import { Button } from './Button';
import { TeamService } from '../../services/teamService';
import { vaultService } from '../../services/vaultService';
import type {
    VaultShare,
    Team,
    ShareVaultRequest,
    UpdateVaultShareRequest
} from '../../types/team';
import { VaultPermission } from '../../types/team';
import type { VaultSummaryDto } from '../../types/vault';
import { getVaultPermissionLabel, getVaultPermissionColor } from '../../types/team';

interface VaultShareManagerProps {
    teamId?: string;
    vaultId?: string;
    onSharesUpdated?: () => void;
}

export const VaultShareManager: React.FC<VaultShareManagerProps> = ({
    teamId,
    vaultId,
    onSharesUpdated
}) => {
    const [shares, setShares] = useState<VaultShare[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [vaults, setVaults] = useState<Array<{ vault: VaultSummaryDto; decryptedName: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showShareModal, setShowShareModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Form states
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedVault, setSelectedVault] = useState('');
    const [sharePermission, setSharePermission] = useState<VaultPermission>(VaultPermission.Read);
    const [editingPermission, setEditingPermission] = useState<VaultPermission>(VaultPermission.Read);

    useEffect(() => {
        loadData();
    }, [teamId, vaultId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [sharesData, teamsData, vaultsData] = await Promise.all([
                TeamService.getSharedVaults(),
                TeamService.getUserTeams(),
                vaultService.getVaults()
            ]);

            // Decrypt vault names for display
            const decryptedVaults: Array<{ vault: VaultSummaryDto; decryptedName: string }> = [];
            for (const vault of vaultsData) {
                try {
                    // Decrypt the vault name for display
                    const decryptedNameData = await vaultService.decryptData<{ value: string }>(vault.name);
                    decryptedVaults.push({
                        vault,
                        decryptedName: decryptedNameData.value
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

            let filteredShares = sharesData;
            if (teamId) {
                filteredShares = sharesData.filter(share => share.teamId === teamId);
            }
            if (vaultId) {
                filteredShares = filteredShares.filter(share => share.vaultId === vaultId);
            }

            setShares(filteredShares);
            setTeams(teamsData);
            setVaults(decryptedVaults);
            setError(null);
        } catch (err) {
            console.error('Error loading vault shares:', err);
            setError('Failed to load vault shares');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            if (!selectedTeam || !selectedVault) return;

            const shareData: ShareVaultRequest = {
                vaultId: selectedVault,
                teamId: selectedTeam,
                permission: sharePermission,
                encryptedVaultKey: '' // This would be encrypted with team keys in production
            };

            await TeamService.shareVault(shareData);
            setSelectedTeam('');
            setSelectedVault('');
            setSharePermission(VaultPermission.Read);
            setShowShareModal(false);
            await loadData();
            onSharesUpdated?.();
        } catch (err) {
            console.error('Error sharing vault:', err);
            setError('Failed to share vault');
        }
    };

    const handleUpdatePermission = async (shareId: string) => {
        try {
            const updateData: UpdateVaultShareRequest = {
                vaultShareId: shareId,
                permission: editingPermission
            };

            await TeamService.updateVaultShare(shareId, updateData);
            setShowPermissionModal(null);
            await loadData();
            onSharesUpdated?.();
        } catch (err) {
            console.error('Error updating permissions:', err);
            setError('Failed to update permissions');
        }
    };

    const handleUnshare = async (shareId: string) => {
        try {
            await TeamService.unshareVault(shareId);
            setShowDeleteConfirm(null);
            await loadData();
            onSharesUpdated?.();
        } catch (err) {
            console.error('Error unsharing vault:', err);
            setError('Failed to unshare vault');
        }
    };

    const getTeamName = (teamId: string) => {
        const team = teams.find(t => t.id === teamId);
        return team?.name || 'Unknown Team';
    };

    const getVaultName = (vaultId: string) => {
        const vaultData = vaults.find(v => v.vault.id === vaultId);
        return vaultData?.decryptedName || 'Unknown Vault';
    };

    const getAvailableTeams = () => {
        if (teamId) return teams.filter(team => team.id === teamId);
        const sharedTeamIds = shares.map(share => share.teamId);
        return teams.filter(team => !sharedTeamIds.includes(team.id));
    };

    const getAvailableVaults = () => {
        if (vaultId) return vaults.filter(vaultData => vaultData.vault.id === vaultId);
        const sharedVaultIds = shares.map(share => share.vaultId);
        return vaults.filter(vaultData => !sharedVaultIds.includes(vaultData.vault.id));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShareIcon className="h-5 w-5" />
                    Vault Sharing ({shares.length})
                </h3>
                <Button
                    size="sm"
                    onClick={() => setShowShareModal(true)}
                    disabled={getAvailableTeams().length === 0 || getAvailableVaults().length === 0}
                >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Share Vault
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <XMarkIcon className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Shares List */}
            <div className="space-y-3">
                {shares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <KeyIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {getVaultName(share.vaultId)}
                                    </p>
                                    <span className="text-gray-500 dark:text-gray-400">→</span>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        {getTeamName(share.teamId)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVaultPermissionColor(share.permission)}`}>
                                        {getVaultPermissionLabel(share.permission)}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Shared {new Date(share.sharedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setEditingPermission(share.permission);
                                    setShowPermissionModal(share.id);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(share.id)}
                                className="p-1 text-red-600 hover:text-red-700"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {shares.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <ShareIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No shared vaults yet</p>
                        <p className="text-sm">Share a vault with your team to get started</p>
                    </div>
                )}
            </div>

            {/* Share Vault Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Vault</h3>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {!vaultId && (
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
                            )}
                            {!teamId && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Select Team
                                    </label>
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Choose a team...</option>
                                        {getAvailableTeams().map((team) => (
                                            <option key={team.id} value={team.id}>
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Permission Level
                                </label>
                                <select
                                    value={sharePermission}
                                    onChange={(e) => setSharePermission(Number(e.target.value) as VaultPermission)}
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
                                    onClick={() => setShowShareModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleShare}
                                    className="flex-1"
                                    disabled={
                                        (!vaultId && !selectedVault) ||
                                        (!teamId && !selectedTeam)
                                    }
                                >
                                    Share Vault
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Modal */}
            {showPermissionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Permissions</h3>
                                <button
                                    onClick={() => setShowPermissionModal(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Permission Level
                                </label>
                                <select
                                    value={editingPermission}
                                    onChange={(e) => setEditingPermission(Number(e.target.value) as VaultPermission)}
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
                                    onClick={() => setShowPermissionModal(null)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleUpdatePermission(showPermissionModal)}
                                    className="flex-1"
                                >
                                    Update
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stop Sharing</h3>
                                    <p className="text-gray-600 dark:text-gray-400">This will remove team access to this vault.</p>
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
                                    onClick={() => handleUnshare(showDeleteConfirm)}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                >
                                    Stop Sharing
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 