// Danger Zone Settings Component for PassFort Zero-Knowledge Password Manager

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    ExclamationTriangleIcon,
    KeyIcon,
    TrashIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Input } from './Input';
import { Button } from './Button';
import { TwoFactorModal } from './TwoFactorModal';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api';

// Validation schemas
const changeMasterPasswordSchema = z.object({
    currentPassword: z.string().min(12, 'Current password is required'),
    newPassword: z.string().min(12, 'New password must be at least 12 characters'),
    confirmPassword: z.string().min(12, 'Please confirm your new password'),
    twoFactorCode: z.string().optional()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

const deleteAccountSchema = z.object({
    masterPassword: z.string().min(12, 'Master password is required'),
    confirmationText: z.literal('DELETE MY ACCOUNT'),
    twoFactorCode: z.string().optional()
});

type ChangeMasterPasswordFormData = z.infer<typeof changeMasterPasswordSchema>;
type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

export const DangerZoneSettings: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [activeAction, setActiveAction] = useState<'password' | 'delete' | null>(null);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<any>(null);

    const passwordForm = useForm<ChangeMasterPasswordFormData>({
        resolver: zodResolver(changeMasterPasswordSchema)
    });

    const deleteForm = useForm<DeleteAccountFormData>({
        resolver: zodResolver(deleteAccountSchema)
    });

    const handleChangeMasterPassword = async (data: ChangeMasterPasswordFormData) => {
        if (user?.twoFactorEnabled) {
            setPendingAction({ type: 'password', data });
            setShow2FAModal(true);
            return;
        }

        await executeChangeMasterPassword(data);
    };

    const executeChangeMasterPassword = async (data: ChangeMasterPasswordFormData) => {
        try {
            await apiClient.post('/User/change-master-password', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                twoFactorCode: data.twoFactorCode
            });

            toast.success('Master password changed successfully! Please log in again.');
            passwordForm.reset();
            setActiveAction(null);

            // Force re-login after password change
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (error: any) {
            toast.error(error.message || 'Failed to change master password');
        }
    };

    const handleDeleteAccount = async (data: DeleteAccountFormData) => {
        if (user?.twoFactorEnabled) {
            setPendingAction({ type: 'delete', data });
            setShow2FAModal(true);
            return;
        }

        await executeDeleteAccount(data);
    };

    const executeDeleteAccount = async (data: DeleteAccountFormData) => {
        try {
            await apiClient.post('/User/delete-account', {
                masterPassword: data.masterPassword,
                twoFactorCode: data.twoFactorCode
            });

            toast.success('Account deleted successfully');
            deleteForm.reset();
            setActiveAction(null);

            // Logout and redirect
            logout();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete account');
        }
    };

    const handle2FASuccess = async (twoFactorCode: string) => {
        if (pendingAction) {
            const dataWithTwoFactor = {
                ...pendingAction.data,
                twoFactorCode
            };

            if (pendingAction.type === 'password') {
                await executeChangeMasterPassword(dataWithTwoFactor);
            } else if (pendingAction.type === 'delete') {
                await executeDeleteAccount(dataWithTwoFactor);
            }
        }

        setShow2FAModal(false);
        setPendingAction(null);
    };

    const handle2FACancel = () => {
        setShow2FAModal(false);
        setPendingAction(null);
    };

    const exportData = async () => {
        try {
            const response = await apiClient.get<string>('/Export/data');

            // Create download link
            const blob = new Blob([response], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `passfort-backup-${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Data exported successfully');
        } catch (error) {
            toast.error('Failed to export data');
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                <div>
                    <h2 className="text-2xl font-bold text-red-900 dark:text-red-400">
                        Advanced Settings
                    </h2>
                    <p className="text-sm text-red-700 dark:text-red-300">
                        Critical operations that affect your account security and data
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Export Data */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 flex items-center space-x-2">
                                <DocumentArrowDownIcon className="h-5 w-5" />
                                <span>Export Data</span>
                            </h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                                Download a backup of all your vault data in encrypted format
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={exportData}
                            leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                        >
                            Export
                        </Button>
                    </div>
                </div>

                {/* Change Master Password */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 flex items-center space-x-2">
                                <KeyIcon className="h-5 w-5" />
                                <span>Change Master Password</span>
                            </h3>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                                Update your master password. This will re-encrypt all your data.
                            </p>
                        </div>
                        {activeAction !== 'password' && (
                            <Button
                                variant="secondary"
                                onClick={() => setActiveAction('password')}
                                leftIcon={<KeyIcon className="h-4 w-4" />}
                            >
                                Change Password
                            </Button>
                        )}
                    </div>

                    {activeAction === 'password' && (
                        <form onSubmit={passwordForm.handleSubmit(handleChangeMasterPassword)} className="space-y-4 mt-6">
                            <Input
                                {...passwordForm.register('currentPassword')}
                                type="password"
                                label="Current Master Password"
                                placeholder="Enter your current master password"
                                error={passwordForm.formState.errors.currentPassword?.message}
                                showPasswordToggle
                                isRequired
                            />

                            <Input
                                {...passwordForm.register('newPassword')}
                                type="password"
                                label="New Master Password"
                                placeholder="Enter your new master password"
                                error={passwordForm.formState.errors.newPassword?.message}
                                showPasswordToggle
                                isRequired
                            />

                            <Input
                                {...passwordForm.register('confirmPassword')}
                                type="password"
                                label="Confirm New Password"
                                placeholder="Confirm your new master password"
                                error={passwordForm.formState.errors.confirmPassword?.message}
                                showPasswordToggle
                                isRequired
                            />

                            {user?.twoFactorEnabled && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <ShieldCheckIcon className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm text-amber-800 dark:text-amber-200">
                                            Two-factor authentication will be required to change your master password
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex space-x-3">
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    isLoading={passwordForm.formState.isSubmitting}
                                    leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                                >
                                    Change Password
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setActiveAction(null);
                                        passwordForm.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Delete Account */}
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 flex items-center space-x-2">
                                <TrashIcon className="h-5 w-5" />
                                <span>Delete Account</span>
                            </h3>
                            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                        </div>
                        {activeAction !== 'delete' && (
                            <Button
                                variant="danger"
                                onClick={() => setActiveAction('delete')}
                                leftIcon={<TrashIcon className="h-4 w-4" />}
                            >
                                Delete Account
                            </Button>
                        )}
                    </div>

                    {activeAction === 'delete' && (
                        <form onSubmit={deleteForm.handleSubmit(handleDeleteAccount)} className="space-y-4 mt-6">
                            <div className="p-4 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg">
                                <div className="flex items-center space-x-2 mb-2">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                                    <h4 className="font-semibold text-red-900 dark:text-red-300">
                                        This action is irreversible
                                    </h4>
                                </div>
                                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                                    <li>• All your vaults and passwords will be permanently deleted</li>
                                    <li>• Your account data cannot be recovered</li>
                                    <li>• You will lose access to all stored credentials</li>
                                    <li>• Active sessions will be terminated immediately</li>
                                </ul>
                            </div>

                            <Input
                                {...deleteForm.register('masterPassword')}
                                type="password"
                                label="Master Password"
                                placeholder="Enter your master password"
                                error={deleteForm.formState.errors.masterPassword?.message}
                                showPasswordToggle
                                isRequired
                            />

                            <Input
                                {...deleteForm.register('confirmationText')}
                                type="text"
                                label="Confirmation"
                                placeholder="Type 'DELETE MY ACCOUNT' to confirm"
                                error={deleteForm.formState.errors.confirmationText?.message}
                                isRequired
                            />

                            {user?.twoFactorEnabled && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <ShieldCheckIcon className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm text-amber-800 dark:text-amber-200">
                                            Two-factor authentication will be required to delete your account
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex space-x-3">
                                <Button
                                    type="submit"
                                    variant="danger"
                                    isLoading={deleteForm.formState.isSubmitting}
                                    leftIcon={<TrashIcon className="h-5 w-5" />}
                                >
                                    Delete My Account
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setActiveAction(null);
                                        deleteForm.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* 2FA Modal */}
            {show2FAModal && (
                <TwoFactorModal
                    isOpen={show2FAModal}
                    onClose={handle2FACancel}
                    onSubmit={handle2FASuccess}
                />
            )}
        </div>
    );
}; 