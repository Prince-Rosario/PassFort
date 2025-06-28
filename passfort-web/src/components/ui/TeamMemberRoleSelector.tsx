import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { TeamRole, getTeamRoleLabel, getTeamRoleColor } from '../../types/team';

interface TeamMemberRoleSelectorProps {
    currentRole: TeamRole;
    memberId: string;
    onRoleChange: (memberId: string, newRole: TeamRole) => Promise<void>;
    disabled?: boolean;
}

export const TeamMemberRoleSelector: React.FC<TeamMemberRoleSelectorProps> = ({
    currentRole,
    memberId,
    onRoleChange,
    disabled = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedRole, setSelectedRole] = useState(currentRole);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (selectedRole === currentRole) {
            setIsEditing(false);
            return;
        }

        try {
            setLoading(true);
            await onRoleChange(memberId, selectedRole);
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating role:', err);
            setSelectedRole(currentRole); // Reset on error
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setSelectedRole(currentRole);
        setIsEditing(false);
    };

    if (disabled) {
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTeamRoleColor(currentRole)}`}>
                {getTeamRoleLabel(currentRole)}
            </span>
        );
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(Number(e.target.value) as TeamRole)}
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                >
                    <option value={TeamRole.Viewer}>Viewer</option>
                    <option value={TeamRole.Member}>Member</option>
                    <option value={TeamRole.Admin}>Admin</option>
                </select>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                >
                    <CheckIcon className="h-3 w-3" />
                </button>
                <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                    <XMarkIcon className="h-3 w-3" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTeamRoleColor(currentRole)}`}>
                {getTeamRoleLabel(currentRole)}
            </span>
            <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
                <PencilIcon className="h-3 w-3" />
            </button>
        </div>
    );
}; 