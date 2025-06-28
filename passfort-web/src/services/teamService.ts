import { apiClient } from './api';
import type {
    Team,
    TeamMember,
    VaultShare,
    CreateTeamRequest,
    UpdateTeamRequest,
    InviteTeamMemberRequest,
    UpdateTeamMemberRoleRequest,
    AcceptTeamInviteRequest,
    ShareVaultRequest,
    UpdateVaultSharePermissionRequest,
    UpdateVaultShareRequest
} from '../types/team';

export class TeamService {
    // Team operations
    static async createTeam(data: CreateTeamRequest): Promise<Team> {
        return await apiClient.post<Team>('/team', data);
    }

    static async getTeam(teamId: string): Promise<Team> {
        return await apiClient.get<Team>(`/team/${teamId}`);
    }

    static async getUserTeams(): Promise<Team[]> {
        return await apiClient.get<Team[]>('/team');
    }

    static async updateTeam(teamId: string, data: UpdateTeamRequest): Promise<Team> {
        return await apiClient.put<Team>(`/team/${teamId}`, data);
    }

    static async deleteTeam(teamId: string): Promise<void> {
        await apiClient.delete(`/team/${teamId}`);
    }

    // Team member operations
    static async inviteTeamMember(teamId: string, data: InviteTeamMemberRequest): Promise<TeamMember> {
        return await apiClient.post<TeamMember>(`/team/${teamId}/members/invite`, data);
    }

    static async acceptTeamInvite(data: AcceptTeamInviteRequest): Promise<TeamMember> {
        return await apiClient.post<TeamMember>('/team/invites/accept', data);
    }

    static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
        return await apiClient.get<TeamMember[]>(`/team/${teamId}/members`);
    }

    static async getPendingInvites(teamId: string): Promise<TeamMember[]> {
        return await apiClient.get<TeamMember[]>(`/team/${teamId}/invites`);
    }

    static async getUserPendingInvites(): Promise<TeamMember[]> {
        return await apiClient.get<TeamMember[]>('/team/invites/me');
    }

    static async updateTeamMemberRole(memberId: string, data: UpdateTeamMemberRoleRequest): Promise<TeamMember> {
        return await apiClient.put<TeamMember>(`/team/members/${memberId}/role`, data);
    }

    static async removeTeamMember(memberId: string): Promise<void> {
        await apiClient.delete(`/team/members/${memberId}`);
    }

    // Vault sharing operations
    static async shareVault(data: ShareVaultRequest): Promise<VaultShare> {
        return await apiClient.post<VaultShare>('/team/vaults/share', data);
    }

    static async getVaultShares(vaultId: string): Promise<VaultShare[]> {
        return await apiClient.get<VaultShare[]>(`/team/vaults/${vaultId}/shares`);
    }

    static async getSharedVaults(): Promise<VaultShare[]> {
        return await apiClient.get<VaultShare[]>('/team/vaults/shared');
    }

    static async updateVaultSharePermission(shareId: string, data: UpdateVaultSharePermissionRequest): Promise<VaultShare> {
        return await apiClient.put<VaultShare>(`/team/vaults/shares/${shareId}/permission`, data);
    }

    static async updateVaultShare(shareId: string, data: UpdateVaultShareRequest): Promise<VaultShare> {
        return await apiClient.put<VaultShare>(`/team/vaults/shares/${shareId}`, data);
    }

    static async unshareVault(shareId: string): Promise<void> {
        await apiClient.delete(`/team/vaults/shares/${shareId}`);
    }

    // Permission checks
    static async checkTeamPermission(teamId: string, permission: string): Promise<boolean> {
        const response = await apiClient.get<{ hasPermission: boolean }>(`/team/${teamId}/permissions/${permission}`);
        return response.hasPermission;
    }

    static async checkVaultPermission(vaultId: string, permission: string): Promise<boolean> {
        const response = await apiClient.get<{ hasPermission: boolean }>(`/team/vaults/${vaultId}/permissions/${permission}`);
        return response.hasPermission;
    }
} 