import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
    SecurityLevel,
    getSecurityLevels,
    deriveAuthHash
} from '../../utils/crypto';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api';
import { Input } from './Input';
import { Button } from './Button';

const changeSecurityLevelSchema = z.object({
    currentMasterPassword: z.string().min(1, 'Current master password is required'),
    confirmMasterPassword: z.string().min(1, 'Please confirm your master password'),
}).refine((data) => data.currentMasterPassword === data.confirmMasterPassword, {
    message: "Passwords don't match",
    path: ["confirmMasterPassword"],
});

type ChangeSecurityLevelFormData = z.infer<typeof changeSecurityLevelSchema>;

interface ChangeSecurityLevelProps {
    currentSecurityLevel: SecurityLevel;
    onSecurityLevelChanged: (newLevel: SecurityLevel) => void;
    onCancel: () => void;
}

export const ChangeSecurityLevel: React.FC<ChangeSecurityLevelProps> = ({
    currentSecurityLevel,
    onSecurityLevelChanged,
    onCancel
}) => {
    const { user } = useAuthStore();
    const [selectedSecurityLevel, setSelectedSecurityLevel] = useState<SecurityLevel>(currentSecurityLevel);
    const [isLoading, setIsLoading] = useState(false);

    const securityLevels = getSecurityLevels();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<ChangeSecurityLevelFormData>({
        resolver: zodResolver(changeSecurityLevelSchema),
    });

    const getSecurityDescription = (level: SecurityLevel) => {
        switch (level) {
            case SecurityLevel.FAST:
                return { title: 'Fast', description: 'Quick logins, good for mobile devices', color: 'text-yellow-600' };
            case SecurityLevel.BALANCED:
                return { title: 'Balanced', description: 'Recommended for most users', color: 'text-blue-600' };
            case SecurityLevel.STRONG:
                return { title: 'Strong', description: 'Enhanced security, moderate performance', color: 'text-green-600' };
            case SecurityLevel.MAXIMUM:
                return { title: 'Maximum', description: 'OWASP-compliant maximum security', color: 'text-purple-600' };
        }
    };

    const onSubmit = async (data: ChangeSecurityLevelFormData) => {
        if (!user?.email) {
            toast.error('User email not found');
            return;
        }

        if (selectedSecurityLevel === currentSecurityLevel) {
            toast.error('Please select a different security level');
            return;
        }

        setIsLoading(true);

        try {
            console.log('🔐 Changing security level...');

            // Derive current password hash using current security level
            const currentPasswordHash = await deriveAuthHash(user.email, data.currentMasterPassword, currentSecurityLevel);

            // Derive new password hash using new security level
            const newPasswordHash = await deriveAuthHash(user.email, data.currentMasterPassword, selectedSecurityLevel);

            // Call API to change security level
            await apiClient.post('/Auth/change-security-level', {
                currentMasterPasswordHash: currentPasswordHash,
                newMasterPasswordHash: newPasswordHash,
                newSecurityLevel: selectedSecurityLevel,
            });

            toast.success('Security level changed successfully! Please log in again.');
            onSecurityLevelChanged(selectedSecurityLevel);

            // Force logout since all tokens are revoked
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);

        } catch (error: any) {
            console.error('Security level change error:', error);

            if (error.message.includes('Current master password is incorrect')) {
                setError('currentMasterPassword', { message: 'Current master password is incorrect' });
            } else {
                toast.error(error.message || 'Failed to change security level');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Change Security Level
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Changing your security level requires re-entering your master password and will log you out.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Current Security Level */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Current Security Level
                    </h4>
                    <div className="flex items-center justify-between">
                        <div>
                            <span className={`font-medium ${getSecurityDescription(currentSecurityLevel).color}`}>
                                {getSecurityDescription(currentSecurityLevel).title}
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {getSecurityDescription(currentSecurityLevel).description}
                            </p>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {securityLevels[currentSecurityLevel].memoryMiB} MiB, ~{securityLevels[currentSecurityLevel].estimatedMs}ms
                        </div>
                    </div>
                </div>

                {/* New Security Level Selection */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        New Security Level
                    </label>

                    <div className="space-y-2">
                        {Object.entries(securityLevels).map(([level, config]) => {
                            const levelKey = level as SecurityLevel;
                            const description = getSecurityDescription(levelKey);
                            const isSelected = selectedSecurityLevel === levelKey;
                            const isCurrent = levelKey === currentSecurityLevel;

                            return (
                                <div
                                    key={level}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${isCurrent
                                        ? 'border-gray-300 bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                                        : isSelected
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    onClick={() => !isCurrent && setSelectedSecurityLevel(levelKey)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                checked={isSelected}
                                                disabled={isCurrent}
                                                onChange={() => !isCurrent && setSelectedSecurityLevel(levelKey)}
                                                className="text-blue-600 mr-3"
                                            />
                                            <div>
                                                <h4 className={`font-medium ${description.color} ${isCurrent ? 'opacity-50' : ''}`}>
                                                    {description.title} {isCurrent && '(Current)'}
                                                </h4>
                                                <p className={`text-sm text-gray-600 dark:text-gray-400 ${isCurrent ? 'opacity-50' : ''}`}>
                                                    {description.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`text-right text-sm text-gray-500 dark:text-gray-400 ${isCurrent ? 'opacity-50' : ''}`}>
                                            <div>{config.memoryMiB} MiB</div>
                                            <div>~{config.estimatedMs}ms</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Password Confirmation */}
                <div className="space-y-4">
                    <Input
                        {...register('currentMasterPassword')}
                        type="password"
                        label="Current Master Password"
                        placeholder="Enter your current master password"
                        error={errors.currentMasterPassword?.message}
                        isRequired
                        showPasswordToggle
                    />

                    <Input
                        {...register('confirmMasterPassword')}
                        type="password"
                        label="Confirm Master Password"
                        placeholder="Confirm your master password"
                        error={errors.confirmMasterPassword?.message}
                        isRequired
                        showPasswordToggle
                    />
                </div>

                {/* Warning */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                        ⚠️ Important Notice
                    </h4>
                    <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                        <li>• Changing security level will log you out of all devices</li>
                        <li>• You'll need to log in again with the new security level</li>
                        <li>• This process re-encrypts your authentication hash</li>
                        <li>• Your vault data remains encrypted with the original security level</li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={isLoading || selectedSecurityLevel === currentSecurityLevel}
                        className="flex-1"
                    >
                        {isLoading ? 'Changing Security Level...' : 'Change Security Level'}
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}; 