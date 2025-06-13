// Unlock Vault Modal for PassFort Zero-Knowledge Password Manager

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheckIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Input } from './Input';
import { Button } from './Button';
import { useAuthStore } from '../../store/authStore';
import { deriveEncryptionKey } from '../../utils/crypto';
import { SecureKeyManager } from '../../utils/crypto';

// Validation schema
const unlockSchema = z.object({
    masterPassword: z
        .string()
        .min(1, 'Master password is required')
        .min(12, 'Master password must be at least 12 characters'),
});

type UnlockFormData = z.infer<typeof unlockSchema>;

interface UnlockVaultModalProps {
    isOpen: boolean;
    onUnlock: () => void;
}

export const UnlockVaultModal: React.FC<UnlockVaultModalProps> = ({ isOpen, onUnlock }) => {
    const { user } = useAuthStore();
    const [isUnlocking, setIsUnlocking] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setError,
    } = useForm<UnlockFormData>({
        resolver: zodResolver(unlockSchema),
    });

    const handleUnlock = async (data: UnlockFormData) => {
        if (!user?.email) {
            toast.error('User email not available');
            return;
        }

        setIsUnlocking(true);

        try {
            console.log('🔓 Re-deriving encryption key to unlock vault...');

            // Get user's security level
            const { apiClient } = await import('../../services/api');
            const { securityLevel } = await apiClient.getUserSecurityLevel(user.email);

            // Re-derive encryption key with the same parameters used during login
            const encryptionKey = await deriveEncryptionKey(
                user.email,
                data.masterPassword,
                securityLevel as any
            );

            // Store encryption key securely in memory
            SecureKeyManager.getInstance().setEncryptionKey(encryptionKey);

            console.log('✅ Vault unlocked successfully!');
            toast.success('Vault unlocked successfully!');

            reset(); // Clear the form
            onUnlock(); // Notify parent component
        } catch (error) {
            console.error('❌ Failed to unlock vault:', error);
            setError('masterPassword', {
                type: 'manual',
                message: 'Invalid master password. Please try again.',
            });
            toast.error('Invalid master password');
        } finally {
            setIsUnlocking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

                {/* Modal */}
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    <div className="text-center mb-6">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                            <LockClosedIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Unlock Your Vault
                        </h3>

                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            For security, your vault is locked after page refresh. Please enter your master password to decrypt your data.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(handleUnlock)} className="space-y-4">
                        <Input
                            {...register('masterPassword')}
                            type="password"
                            label="Master Password"
                            placeholder="Enter your master password"
                            error={errors.masterPassword?.message}
                            isRequired
                            showPasswordToggle
                            autoFocus
                        />

                        <div className="flex space-x-3">
                            <Button
                                type="submit"
                                variant="primary"
                                className="flex-1"
                                isLoading={isUnlocking}
                                disabled={isUnlocking}
                                leftIcon={<ShieldCheckIcon className="h-5 w-5" />}
                            >
                                {isUnlocking ? 'Unlocking...' : 'Unlock Vault'}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <div className="flex items-start space-x-2">
                            <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-800 dark:text-blue-200">
                                <p className="font-medium mb-1">🔐 Zero-Knowledge Security</p>
                                <p>Your master password is never stored or transmitted. It's only used locally to decrypt your data.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 