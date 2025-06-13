// MFA Settings Component for PassFort Zero-Knowledge Password Manager

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    DevicePhoneMobileIcon,
    ShieldCheckIcon,
    ClipboardIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Input } from './Input';
import { Button } from './Button';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api';
import { deriveAuthHash } from '../../utils/crypto';

// MFA Setup Types
interface MFAStatusData {
    isEnabled: boolean;
    hasRecoveryCodes: boolean;
    recoveryCodesLeft: number;
}

interface EnableMFAResponse {
    success: boolean;
    message: string;
    secretKey: string;
    qrCodeUrl: string;
    recoveryCodes: string[];
}

// Validation schemas
const enableMFASchema = z.object({
    masterPassword: z.string().min(12, 'Master password is required'),
    verificationCode: z.string().min(6, 'Enter the 6-digit code from your authenticator app').max(6)
});

const disableMFASchema = z.object({
    masterPassword: z.string().min(12, 'Master password is required'),
    verificationCode: z.string().min(6, 'Enter the 6-digit code from your authenticator app').max(6)
});

type EnableMFAFormData = z.infer<typeof enableMFASchema>;
type DisableMFAFormData = z.infer<typeof disableMFASchema>;

export const MFASettings: React.FC = () => {
    const { user } = useAuthStore();
    const [mfaStatus, setMfaStatus] = useState<MFAStatusData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSetup, setShowSetup] = useState(false);
    const [showDisable, setShowDisable] = useState(false);
    const [setupData, setSetupData] = useState<EnableMFAResponse | null>(null);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

    // Forms
    const enableForm = useForm<EnableMFAFormData>({
        resolver: zodResolver(enableMFASchema)
    });

    const disableForm = useForm<DisableMFAFormData>({
        resolver: zodResolver(disableMFASchema)
    });

    // Load MFA status
    useEffect(() => {
        loadMFAStatus();
    }, []);

    const loadMFAStatus = async () => {
        try {
            setIsLoading(true);
            const status = await apiClient.get<MFAStatusData>('/Mfa/status');
            setMfaStatus(status);
        } catch (error) {
            console.error('Failed to load MFA status:', error);
            toast.error('Failed to load MFA settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnableMFA = async (data: EnableMFAFormData) => {
        try {
            console.log('🔐 ZERO-KNOWLEDGE MFA: Deriving master password hash...');

            // CRITICAL: Derive authentication hash - NEVER send raw password!
            const masterPasswordHash = await deriveAuthHash(user?.email || '', data.masterPassword, user?.securityLevel as any);

            console.log('✅ Master password hash derived for MFA verification');

            const response = await apiClient.post<EnableMFAResponse>('/Mfa/enable', {
                masterPasswordHash: masterPasswordHash, // Send hash, NOT raw password
                verificationCode: data.verificationCode
            });

            setSetupData(response);
            setRecoveryCodes(response.recoveryCodes);
            setShowRecoveryCodes(true);

            toast.success('Two-factor authentication enabled successfully!');
            enableForm.reset();
            await loadMFAStatus();
        } catch (error: any) {
            toast.error(error.message || 'Failed to enable 2FA');
            enableForm.setError('verificationCode', {
                type: 'manual',
                message: 'Invalid verification code'
            });
        }
    };

    const handleDisableMFA = async (data: DisableMFAFormData) => {
        try {
            console.log('🔐 ZERO-KNOWLEDGE MFA: Deriving master password hash for disable...');

            // CRITICAL: Derive authentication hash - NEVER send raw password!
            const masterPasswordHash = await deriveAuthHash(user?.email || '', data.masterPassword, user?.securityLevel as any);

            console.log('✅ Master password hash derived for MFA disable verification');

            await apiClient.post('/Mfa/disable', {
                masterPasswordHash: masterPasswordHash, // Send hash, NOT raw password
                verificationCode: data.verificationCode
            });

            setShowDisable(false);
            toast.success('Two-factor authentication disabled');
            disableForm.reset();
            await loadMFAStatus();
        } catch (error: any) {
            toast.error(error.message || 'Failed to disable 2FA');
        }
    };

    const startMFASetup = async () => {
        try {
            // Get the QR code and secret for setup
            const response = await apiClient.get<{ qrCodeUrl: string; secretKey: string }>('/Mfa/setup');
            setSetupData({
                success: true,
                message: '',
                secretKey: response.secretKey,
                qrCodeUrl: response.qrCodeUrl,
                recoveryCodes: []
            });
            setShowSetup(true);
        } catch (error) {
            toast.error('Failed to start MFA setup');
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied to clipboard!`);
        } catch (error) {
            toast.error('Failed to copy to clipboard');
        }
    };

    const generateNewRecoveryCodes = async () => {
        try {
            const codes = await apiClient.post<string[]>('/Mfa/recovery-codes', {});
            setRecoveryCodes(codes);
            setShowRecoveryCodes(true);
            toast.success('New recovery codes generated');
        } catch (error) {
            toast.error('Failed to generate recovery codes');
        }
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
                <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Two-Factor Authentication
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Add an extra layer of security to your account with 2FA
                    </p>
                </div>
            </div>

            {/* MFA Status */}
            <div className="mb-8 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${mfaStatus?.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                Two-Factor Authentication is {mfaStatus?.isEnabled ? 'Enabled' : 'Disabled'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {mfaStatus?.isEnabled
                                    ? `Protected with authenticator app • ${mfaStatus.recoveryCodesLeft} recovery codes remaining`
                                    : 'Your account is protected only by your master password'
                                }
                            </p>
                        </div>
                    </div>

                    {!mfaStatus?.isEnabled ? (
                        <Button
                            variant="primary"
                            onClick={startMFASetup}
                            leftIcon={<ShieldCheckIcon className="h-5 w-5" />}
                        >
                            Enable 2FA
                        </Button>
                    ) : (
                        <div className="flex space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={generateNewRecoveryCodes}
                                leftIcon={<KeyIcon className="h-4 w-4" />}
                            >
                                Recovery Codes
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setShowDisable(true)}
                            >
                                Disable 2FA
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Setup Modal */}
            {showSetup && setupData && (
                <div className="mb-8 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Set Up Two-Factor Authentication
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* QR Code */}
                        <div className="text-center">
                            <div className="bg-white p-4 rounded-lg inline-block">
                                <img
                                    src={setupData.qrCodeUrl}
                                    alt="2FA QR Code"
                                    className="w-48 h-48 mx-auto"
                                />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                Scan with your authenticator app
                            </p>
                        </div>

                        {/* Manual Setup */}
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                Can't scan the code?
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Enter this secret key manually in your authenticator app:
                            </p>
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <code className="text-sm font-mono text-gray-900 dark:text-white flex-1">
                                    {setupData.secretKey}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(setupData.secretKey, 'Secret key')}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <ClipboardIcon className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Verification Form */}
                            <form onSubmit={enableForm.handleSubmit(handleEnableMFA)} className="mt-6 space-y-4">
                                <Input
                                    {...enableForm.register('masterPassword')}
                                    type="password"
                                    label="Master Password"
                                    placeholder="Enter your master password"
                                    error={enableForm.formState.errors.masterPassword?.message}
                                    showPasswordToggle
                                    isRequired
                                />

                                <Input
                                    {...enableForm.register('verificationCode')}
                                    type="text"
                                    label="Verification Code"
                                    placeholder="Enter 6-digit code"
                                    error={enableForm.formState.errors.verificationCode?.message}
                                    maxLength={6}
                                    isRequired
                                />

                                <div className="flex space-x-3">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        isLoading={enableForm.formState.isSubmitting}
                                        leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                                    >
                                        Verify & Enable
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowSetup(false);
                                            enableForm.reset();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Disable 2FA Modal */}
            {showDisable && (
                <div className="mb-8 p-6 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center space-x-3 mb-4">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                        <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
                            Disable Two-Factor Authentication
                        </h3>
                    </div>

                    <p className="text-sm text-red-800 dark:text-red-300 mb-6">
                        This will make your account less secure. You'll only be protected by your master password.
                    </p>

                    <form onSubmit={disableForm.handleSubmit(handleDisableMFA)} className="space-y-4">
                        <Input
                            {...disableForm.register('masterPassword')}
                            type="password"
                            label="Master Password"
                            placeholder="Enter your master password"
                            error={disableForm.formState.errors.masterPassword?.message}
                            showPasswordToggle
                            isRequired
                        />

                        <Input
                            {...disableForm.register('verificationCode')}
                            type="text"
                            label="Verification Code"
                            placeholder="Enter 6-digit code from your authenticator"
                            error={disableForm.formState.errors.verificationCode?.message}
                            maxLength={6}
                            isRequired
                        />

                        <div className="flex space-x-3">
                            <Button
                                type="submit"
                                variant="danger"
                                isLoading={disableForm.formState.isSubmitting}
                            >
                                Disable 2FA
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowDisable(false);
                                    disableForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Recovery Codes Modal */}
            {showRecoveryCodes && recoveryCodes.length > 0 && (
                <div className="mb-8 p-6 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-center space-x-3 mb-4">
                        <KeyIcon className="h-6 w-6 text-amber-600" />
                        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-300">
                            Recovery Codes
                        </h3>
                    </div>

                    <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
                        Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device.
                    </p>

                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {recoveryCodes.map((code, index) => (
                            <div key={index} className="p-2 bg-white dark:bg-gray-800 rounded border text-center">
                                <code className="text-sm font-mono text-gray-900 dark:text-white">{code}</code>
                            </div>
                        ))}
                    </div>

                    <div className="flex space-x-3">
                        <Button
                            variant="primary"
                            onClick={() => copyToClipboard(recoveryCodes.join('\n'), 'Recovery codes')}
                            leftIcon={<ClipboardIcon className="h-5 w-5" />}
                        >
                            Copy All Codes
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowRecoveryCodes(false)}
                        >
                            I've Saved Them
                        </Button>
                    </div>
                </div>
            )}

            {/* 2FA Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                    🔐 Recommended Authenticator Apps
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p>• <strong>Google Authenticator</strong> - Simple and reliable</p>
                    <p>• <strong>Authy</strong> - Multi-device sync with backup</p>
                    <p>• <strong>Microsoft Authenticator</strong> - Enterprise-grade security</p>
                    <p>• <strong>1Password</strong> - Integrated with password manager</p>
                </div>
            </div>
        </div>
    );
}; 