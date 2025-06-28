import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlusIcon,
    UsersIcon,
    CogIcon,
    ShareIcon,
    StarIcon,
    ExclamationTriangleIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { TeamService } from '../services/teamService';
import { CreateTeamModal } from '../components/ui/CreateTeamModal';
import type { Team } from '../types/team';
import { getTeamRoleColor, TeamRole } from '../types/team';

export const Teams: React.FC = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            setLoading(true);
            const userTeams = await TeamService.getUserTeams();
            setTeams(userTeams);
            setError(null);
        } catch (err) {
            // For now, silently handle API errors since backend might not be running
            // In production, this would show proper error handling
            console.log('Teams API not available:', err);
            setTeams([]); // Show empty state instead of error
            setError(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async (teamData: { name: string; description?: string }) => {
        try {
            const newTeam = await TeamService.createTeam(teamData);
            setTeams([...teams, newTeam]);
            setShowCreateModal(false);
        } catch (err) {
            console.error('Error creating team:', err);
            // Show user-friendly error message instead of throwing
            setError('Unable to create team. Please ensure the backend server is running.');
            throw new Error('Unable to create team. Please ensure the backend server is running.');
        }
    };

    const isTeamAdmin = (team: Team): boolean => {
        // TODO: Get current user ID from auth context
        return true; // For now, assuming current user can be admin
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                {/* Header with Back Navigation */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        Back to Dashboard
                    </button>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Collaborate securely by sharing vaults with your team members.
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Create Team
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {teams.length === 0 && !loading ? (
                    <div className="text-center py-12">
                        <UsersIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No teams yet</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Create your first team to start collaborating and sharing vaults securely.
                        </p>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 mx-auto"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Create Your First Team
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                                <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {team.name}
                                                </h3>
                                                {team.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {team.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {isTeamAdmin(team) && (
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTeamRoleColor(TeamRole.Admin)}`}>
                                                <StarIcon className="h-3 w-3 inline mr-1" />
                                                Admin
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Members</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{team.memberCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Shared Vaults</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{team.sharedVaultCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Created</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {new Date(team.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 flex items-center justify-center gap-2"
                                            onClick={() => navigate(`/teams/${team.id}`)}
                                        >
                                            <UsersIcon className="h-4 w-4" />
                                            View Team
                                        </Button>
                                        {isTeamAdmin(team) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center justify-center gap-2"
                                                onClick={() => navigate(`/teams/${team.id}`)}
                                            >
                                                <CogIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center justify-center gap-2"
                                            onClick={() => navigate(`/teams/${team.id}`)}
                                        >
                                            <ShareIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showCreateModal && (
                    <CreateTeamModal
                        onClose={() => setShowCreateModal(false)}
                        onSubmit={handleCreateTeam}
                    />
                )}
            </div>
        </div>
    );
}; 