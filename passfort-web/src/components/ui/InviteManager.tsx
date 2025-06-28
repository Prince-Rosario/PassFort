import React, { useState, useEffect } from 'react';
import {
    EnvelopeIcon,
    CheckIcon,
    XMarkIcon,
    UsersIcon,
    ClockIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { Button } from './Button';
import { TeamService } from '../../services/teamService';
import type { TeamMember, AcceptTeamInviteRequest } from '../../types/team';
import { getTeamRoleLabel, getTeamRoleColor } from '../../types/team';

interface InviteManagerProps {
    onInviteUpdate?: () => void;
}

export const InviteManager: React.FC<InviteManagerProps> = ({ onInviteUpdate }) => {
    const [invites, setInvites] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingInvite, setProcessingInvite] = useState<string | null>(null);

    useEffect(() => {
        loadPendingInvites();
    }, []);

    const loadPendingInvites = async () => {
        try {
            setLoading(true);
            const pendingInvites = await TeamService.getUserPendingInvites();
            setInvites(pendingInvites);
            setError(null);
        } catch (err) {
            console.error('Error loading pending invites:', err);
            setError('Failed to load pending invites');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvite = async (invite: TeamMember) => {
        if (!invite.inviteToken) {
            setError('Invalid invite token');
            return;
        }

        try {
            setProcessingInvite(invite.id);
            const acceptData: AcceptTeamInviteRequest = {
                inviteToken: invite.inviteToken
            };

            await TeamService.acceptTeamInvite(acceptData);
            await loadPendingInvites(); // Refresh invites
            onInviteUpdate?.();
        } catch (err) {
            console.error('Error accepting invite:', err);
            setError('Failed to accept invite');
        } finally {
            setProcessingInvite(null);
        }
    };

    const handleDeclineInvite = async (invite: TeamMember) => {
        try {
            setProcessingInvite(invite.id);
            await TeamService.removeTeamMember(invite.id);
            await loadPendingInvites(); // Refresh invites
            onInviteUpdate?.();
        } catch (err) {
            console.error('Error declining invite:', err);
            setError('Failed to decline invite');
        } finally {
            setProcessingInvite(null);
        }
    };

    const formatExpirationDate = (dateString?: string) => {
        if (!dateString) return 'No expiration';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Expired';
        if (diffDays === 0) return 'Expires today';
        if (diffDays === 1) return 'Expires tomorrow';
        return `Expires in ${diffDays} days`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (invites.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <EnvelopeIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending invites</p>
                <p className="text-sm">You'll see team invitations here when you receive them</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <EnvelopeIcon className="h-5 w-5" />
                    Pending Invites ({invites.length})
                </h3>
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

            {/* Invites List */}
            <div className="space-y-3">
                {invites.map((invite) => (
                    <div key={invite.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                    <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                            {invite.teamName || `Team ${invite.teamId}`}
                                        </h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTeamRoleColor(invite.role)}`}>
                                            {getTeamRoleLabel(invite.role)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Invited by {invite.invitedByUserEmail || 'Team Admin'}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <ClockIcon className="h-3 w-3" />
                                        <span>{formatExpirationDate(invite.inviteExpiresAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                                <Button
                                    size="sm"
                                    onClick={() => handleAcceptInvite(invite)}
                                    disabled={processingInvite === invite.id}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {processingInvite === invite.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    ) : (
                                        <CheckIcon className="h-3 w-3" />
                                    )}
                                    Accept
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeclineInvite(invite)}
                                    disabled={processingInvite === invite.id}
                                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <XMarkIcon className="h-3 w-3" />
                                    Decline
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 