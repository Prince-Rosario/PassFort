// Account Settings Component for PassFort Zero-Knowledge Password Manager

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    UserIcon,
    EnvelopeIcon,
    PencilIcon,
    CheckCircleIcon,
    XMarkIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Input } from './Input';
import { Button } from './Button';
import { TwoFactorModal } from './TwoFactorModal';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api';

// Validation schemas
const updateProfileSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    email: z.string().email('Invalid email address'),
    masterPassword: z.string().min(12, 'Master password is required'),
    twoFactorCode: z.string().optional()
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const AccountSettings: React.FC = () => {
    const { user, updateUser } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<UpdateProfileFormData | null>(null);

    const form = useForm<UpdateProfileFormData>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            masterPassword: '',
            twoFactorCode: ''
        }
    });

    const handleStartEdit = () => {
        setIsEditing(true);
        form.reset({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            masterPassword: '',
            twoFactorCode: ''
        });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        form.reset();
    };

    const handleSaveProfile = async (data: UpdateProfileFormData) => {
        // Check if any critical changes were made (email change)
        const hasEmailChange = data.email !== user?.email;

        if (hasEmailChange && user?.twoFactorEnabled) {
            // Store pending changes and show 2FA modal
            setPendingChanges(data);
            setShow2FAModal(true);
            return;
        }

        // Proceed with update
        await updateProfile(data);
    };

    const updateProfile = async (data: UpdateProfileFormData) => {
        try {
            const response = await apiClient.put('/User/profile', {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                masterPassword: data.masterPassword,
                twoFactorCode: data.twoFactorCode || undefined
            });

            updateUser(response);
            setIsEditing(false);
            setPendingChanges(null);
            form.reset();
            toast.success('Profile updated successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');

            if (error.message?.includes('verification')) {
                form.setError('twoFactorCode', {
                    type: 'manual',
                    message: 'Invalid verification code'
                });
            }
        }
    };

    const handle2FASuccess = async (twoFactorCode: string) => {
        if (pendingChanges) {
            await updateProfile({
                ...pendingChanges,
                twoFactorCode
            });
        }
        setShow2FAModal(false);
    };

    const handle2FACancel = () => {
        setShow2FAModal(false);
        setPendingChanges(null);
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Account Information
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Manage your personal information and account details
                        </p>
                    </div>
                </div>

                {!isEditing && (
                    <Button
                        variant="outline"
                        onClick={handleStartEdit}
                        leftIcon={<PencilIcon className="h-4 w-4" />}
                    >
                        Edit Profile
                    </Button>
                )}
            </div>

            {isEditing ? (
                // Edit Form
                <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            {...form.register('firstName')}
                            label="First Name"
                            placeholder="Enter your first name"
                            error={form.formState.errors.firstName?.message}
                            isRequired
                        />

                        <Input
                            {...form.register('lastName')}
                            label="Last Name"
                            placeholder="Enter your last name"
                            error={form.formState.errors.lastName?.message}
                            isRequired
                        />
                    </div>

                    <Input
                        {...form.register('email')}
                        type="email"
                        label="Email Address"
                        placeholder="Enter your email address"
                        error={form.formState.errors.email?.message}
                        isRequired
                        helperText={
                            form.watch('email') !== user?.email
                                ? "⚠️ Changing your email requires 2FA verification if enabled"
                                : undefined
                        }
                    />

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Verify Changes
                        </h3>

                        <Input
                            {...form.register('masterPassword')}
                            type="password"
                            label="Master Password"
                            placeholder="Enter your master password to confirm changes"
                            error={form.formState.errors.masterPassword?.message}
                            showPasswordToggle
                            isRequired
                        />

                        {user?.twoFactorEnabled && form.watch('email') !== user?.email && (
                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <ShieldCheckIcon className="h-5 w-5 text-amber-600" />
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        Two-factor authentication will be required to save these changes
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={form.formState.isSubmitting}
                            leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                        >
                            Save Changes
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEdit}
                            leftIcon={<XMarkIcon className="h-5 w-5" />}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            ) : (
                // Display View
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                First Name
                            </label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
                                {user?.firstName || 'Not set'}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Last Name
                            </label>
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
                                {user?.lastName || 'Not set'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Address
                        </label>
                        <div className="flex items-center space-x-3">
                            <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
                                {user?.email || 'Not set'}
                            </div>
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Account Statistics */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Account Statistics
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blue-600 dark:text-blue-400">Security Level</p>
                                        <p className="text-lg font-semibold text-blue-900 dark:text-blue-300 capitalize">
                                            {user?.securityLevel || 'Balanced'}
                                        </p>
                                    </div>
                                    <ShieldCheckIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>

                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-green-600 dark:text-green-400">2FA Status</p>
                                        <p className="text-lg font-semibold text-green-900 dark:text-green-300">
                                            {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                        </p>
                                    </div>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${user?.twoFactorEnabled
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                        }`}>
                                        <CheckCircleIcon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-purple-600 dark:text-purple-400">Account Type</p>
                                        <p className="text-lg font-semibold text-purple-900 dark:text-purple-300">
                                            Personal
                                        </p>
                                    </div>
                                    <UserIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Security Info */}
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            🔒 Your Account Security
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <p>• Your master password is never stored on our servers</p>
                            <p>• All vault data is encrypted client-side before transmission</p>
                            <p>• We use zero-knowledge architecture to protect your privacy</p>
                            <p>• Enable 2FA for maximum security protection</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2FA Modal for Critical Changes */}
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