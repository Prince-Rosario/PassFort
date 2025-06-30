export enum TeamRole {
    Admin = 0,
    Member = 1,
    Viewer = 2
}

export enum VaultPermission {
    Read = 0,
    Write = 1,
    Admin = 2
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    adminUserId: string;
    adminUserEmail: string;
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    sharedVaultCount: number;
    members: TeamMember[];
    sharedVaults: VaultShare[];
}

export interface TeamMember {
    id: string;
    teamId: string;
    teamName: string;
    userId: string;
    userEmail: string;
    userFullName?: string;
    role: TeamRole;
    joinedAt: string;
    lastActivityAt?: string;
    isInvitePending: boolean;
    inviteToken?: string;
    inviteExpiresAt?: string;
    invitedByUserEmail?: string;
}

export interface VaultShare {
    id: string;
    vaultId: string;
    vaultName: string;
    teamId: string;
    teamName: string;
    permission: VaultPermission;
    sharedByUserId: string;
    sharedByUserEmail: string;
    sharedAt: string;
    lastAccessedAt?: string;
    encryptedVaultKey: string;
}

// Request DTOs
export interface CreateTeamRequest {
    name: string;
    description?: string;
}

export interface UpdateTeamRequest {
    id: string;
    name: string;
    description?: string;
}

export interface InviteTeamMemberRequest {
    teamId: string;
    email: string;
    role: TeamRole;
}

export interface UpdateTeamMemberRoleRequest {
    teamMemberId: string;
    role: TeamRole;
}

export interface AcceptTeamInviteRequest {
    inviteToken: string;
}

export interface ShareVaultRequest {
    vaultId: string;
    teamId: string;
    permission: VaultPermission;
    encryptedVaultKey: string;
}

export interface UpdateVaultSharePermissionRequest {
    vaultShareId: string;
    permission: VaultPermission;
}

export interface UpdateVaultShareRequest {
    vaultShareId: string;
    permission: VaultPermission;
}

export const getTeamRoleLabel = (role: TeamRole): string => {
    switch (role) {
        case TeamRole.Admin:
            return 'Admin';
        case TeamRole.Member:
            return 'Member';
        case TeamRole.Viewer:
            return 'Viewer';
        default:
            return 'Unknown';
    }
};

export const getVaultPermissionLabel = (permission: VaultPermission): string => {
    switch (permission) {
        case VaultPermission.Read:
            return 'Read Only';
        case VaultPermission.Write:
            return 'Read & Write';
        case VaultPermission.Admin:
            return 'Full Access';
        default:
            return 'Unknown';
    }
};

export const getTeamRoleColor = (role: TeamRole): string => {
    switch (role) {
        case TeamRole.Admin:
            return 'text-red-600 bg-red-100';
        case TeamRole.Member:
            return 'text-blue-600 bg-blue-100';
        case TeamRole.Viewer:
            return 'text-gray-600 bg-gray-100';
        default:
            return 'text-gray-600 bg-gray-100';
    }
};

export const getVaultPermissionColor = (permission: VaultPermission): string => {
    switch (permission) {
        case VaultPermission.Read:
            return 'text-yellow-600 bg-yellow-100';
        case VaultPermission.Write:
            return 'text-green-600 bg-green-100';
        case VaultPermission.Admin:
            return 'text-red-600 bg-red-100';
        default:
            return 'text-gray-600 bg-gray-100';
    }
}; 