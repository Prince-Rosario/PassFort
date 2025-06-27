// Backup/Restore Settings Component for PassFort

import React, { useState } from 'react';
import {
    CloudArrowDownIcon,
    CloudArrowUpIcon,
    DocumentArrowDownIcon,
    DocumentArrowUpIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Button } from './Button';
import { TwoFactorModal } from './TwoFactorModal';
import { useAuthStore } from '../../store/authStore';
import { backupService, type BackupProgress, type RestoreProgress } from '../../services/backupService';

export const BackupRestoreSettings: React.FC = () => {
    const { user } = useAuthStore();
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
    const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [originalMasterPassword, setOriginalMasterPassword] = useState('');
    const [showPasswordField, setShowPasswordField] = useState(false);
    const [backupMetadata, setBackupMetadata] = useState<{ createdBy?: string; timestamp?: string } | null>(null);

    // MFA states
    const [showMFAModal, setShowMFAModal] = useState(false);
    const [mfaOperation, setMfaOperation] = useState<'backup' | 'restore' | null>(null);
    const [mfaError, setMfaError] = useState('');
    const [isMFALoading, setIsMFALoading] = useState(false);

    const handleCreateBackup = async () => {
        if (!user?.email) {
            toast.error('User email not available');
            return;
        }

        try {
            // Check if MFA is required
            const mfaStatus = await backupService.checkMFAStatus();
            if (mfaStatus.isEnabled) {
                // Show MFA modal for backup
                setMfaOperation('backup');
                setShowMFAModal(true);
                setMfaError('');
                return;
            }

            // No MFA required, proceed directly
            await executeBackup();
        } catch (error: any) {
            console.error('Backup failed:', error);
            toast.error(`Backup failed: ${error.message}`);
        }
    };

    const executeBackup = async (mfaCode?: string) => {
        if (!user?.email) return;

        setIsCreatingBackup(true);
        setBackupProgress(null);

        try {
            await backupService.downloadBackup(user.email, (progress) => {
                setBackupProgress(progress);
            }, mfaCode);
            toast.success('Backup downloaded successfully!');
            setShowMFAModal(false);
        } catch (error: any) {
            console.error('Backup failed:', error);
            if (error.message === 'MFA_REQUIRED') {
                setMfaOperation('backup');
                setShowMFAModal(true);
                setMfaError('');
            } else if (error.message === 'Invalid 2FA code') {
                setMfaError('Invalid 2FA code. Please try again.');
            } else {
                toast.error(`Backup failed: ${error.message}`);
                setShowMFAModal(false);
            }
        } finally {
            setIsCreatingBackup(false);
            setBackupProgress(null);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/json') {
                toast.error('Please select a JSON backup file');
                return;
            }
            setSelectedFile(file);

            // Try to read backup metadata to check if cross-account restore
            try {
                const fileText = await file.text();
                const backupData = JSON.parse(fileText);
                setBackupMetadata({
                    createdBy: backupData.metadata?.createdBy,
                    timestamp: backupData.metadata?.timestamp
                });

                // Show password field if backup was created by different user
                if (backupData.metadata?.createdBy && backupData.metadata.createdBy !== user?.email) {
                    setShowPasswordField(true);
                    toast('This backup was created by a different account. You may need to enter the original master password.', {
                        icon: 'ℹ️',
                        duration: 4000
                    });
                } else {
                    setShowPasswordField(false);
                }
            } catch (error) {
                toast.error('Invalid backup file format');
                setSelectedFile(null);
                setBackupMetadata(null);
                setShowPasswordField(false);
            }
        }
    };

    const handleRestore = async () => {
        if (!selectedFile) {
            toast.error('Please select a backup file');
            return;
        }

        try {
            // Check if MFA is required
            const mfaStatus = await backupService.checkMFAStatus();
            if (mfaStatus.isEnabled) {
                // Show MFA modal for restore
                setMfaOperation('restore');
                setShowMFAModal(true);
                setMfaError('');
                setShowRestoreConfirm(false);
                return;
            }

            // No MFA required, proceed directly
            await executeRestore();
        } catch (error: any) {
            console.error('Restore failed:', error);
            toast.error(`Restore failed: ${error.message}`);
            setShowRestoreConfirm(false);
        }
    };

    const executeRestore = async (mfaCode?: string) => {
        if (!selectedFile) return;

        setIsRestoring(true);
        setRestoreProgress(null);
        setShowRestoreConfirm(false);

        try {
            const result = await backupService.restoreFromFile(
                selectedFile,
                (progress) => {
                    setRestoreProgress(progress);
                },
                originalMasterPassword || undefined,
                mfaCode
            );

            if (result.success) {
                toast.success(
                    `Restore completed! Imported ${result.importedVaults} vaults and ${result.importedItems} items`
                );
                setSelectedFile(null);
                setOriginalMasterPassword('');
                setShowPasswordField(false);
                setBackupMetadata(null);
                setShowMFAModal(false);
                // Reset file input
                const fileInput = document.getElementById('backup-file') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                toast.error('Restore failed');
            }
        } catch (error: any) {
            console.error('Restore failed:', error);
            if (error.message === 'MFA_REQUIRED') {
                setMfaOperation('restore');
                setShowMFAModal(true);
                setMfaError('');
            } else if (error.message === 'Invalid 2FA code') {
                setMfaError('Invalid 2FA code. Please try again.');
            } else {
                toast.error(`Restore failed: ${error.message}`);
                setShowMFAModal(false);
            }
        } finally {
            setIsRestoring(false);
            setRestoreProgress(null);
        }
    };

    const handleMFASubmit = async (code: string) => {
        setIsMFALoading(true);
        setMfaError('');

        try {
            if (mfaOperation === 'backup') {
                await executeBackup(code);
            } else if (mfaOperation === 'restore') {
                await executeRestore(code);
            }
        } catch (error: any) {
            // Error handling is done in execute functions
            throw error;
        } finally {
            setIsMFALoading(false);
        }
    };

    const handleMFAClose = () => {
        setShowMFAModal(false);
        setMfaOperation(null);
        setMfaError('');
        setIsMFALoading(false);
    };

    const renderProgressBar = (progress: BackupProgress | RestoreProgress | null) => {
        if (!progress) return null;

        return (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        {progress.message}
                    </span>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                        {progress.progress}%
                    </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
                <CloudArrowDownIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Backup & Restore
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Secure backup and restore of your vault data
                    </p>
                </div>
            </div>

            {/* Security Notice */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-3">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                            Zero-Knowledge Security
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Your backup files are encrypted with your master password. Only you can decrypt and restore them.
                            PassFort cannot access your backup data.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Backup */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <DocumentArrowDownIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Create Backup
                        </h3>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Download an encrypted backup of all your vaults and items. This backup is protected
                        with your master password and can be restored on any PassFort instance.
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            <span>Zero-knowledge encryption</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            <span>Includes all vaults and items</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            <span>Portable JSON format</span>
                        </div>
                    </div>

                    {renderProgressBar(backupProgress)}

                    <Button
                        onClick={handleCreateBackup}
                        disabled={isCreatingBackup}
                        isLoading={isCreatingBackup}
                        className="mt-4 w-full"
                        leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}
                    >
                        {isCreatingBackup ? 'Creating Backup...' : 'Create Backup'}
                    </Button>
                </div>

                {/* Restore Backup */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <DocumentArrowUpIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Restore Backup
                        </h3>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Restore vaults and items from a PassFort backup file. Your existing data will not be
                        affected - restored items will be added to your account.
                    </p>

                    {/* Warning */}
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                Only restore backup files from trusted sources. Restored vaults will be named
                                with "(Restored)" suffix to distinguish them from your existing vaults.
                            </p>
                        </div>
                    </div>

                    {/* File Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select backup file
                        </label>
                        <input
                            id="backup-file"
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-600 dark:file:text-gray-300"
                        />
                        {selectedFile && (
                            <div className="mt-2 space-y-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Selected: {selectedFile.name}
                                </p>
                                {backupMetadata && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                        <p><strong>Created by:</strong> {backupMetadata.createdBy}</p>
                                        <p><strong>Created:</strong> {new Date(backupMetadata.timestamp || '').toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Original Master Password Field (for cross-account restore) */}
                    {showPasswordField && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Original Account Master Password
                            </label>
                            <input
                                type="password"
                                value={originalMasterPassword}
                                onChange={(e) => setOriginalMasterPassword(e.target.value)}
                                placeholder="Enter the master password of the account that created this backup"
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ This backup was created by {backupMetadata?.createdBy}. You need their master password to decrypt it.
                            </p>
                        </div>
                    )}

                    {renderProgressBar(restoreProgress)}

                    <Button
                        onClick={() => setShowRestoreConfirm(true)}
                        disabled={!selectedFile || isRestoring}
                        isLoading={isRestoring}
                        className="mt-4 w-full"
                        variant="outline"
                        leftIcon={<DocumentArrowUpIcon className="h-5 w-5" />}
                    >
                        {isRestoring ? 'Restoring...' : 'Restore Backup'}
                    </Button>
                </div>
            </div>

            {/* Restore Confirmation Modal */}
            {showRestoreConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Confirm Restore
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to restore from this backup file? This will import all
                            vaults and items from the backup into your account.
                        </p>

                        <div className="flex space-x-3">
                            <Button
                                onClick={handleRestore}
                                variant="primary"
                                className="flex-1"
                            >
                                Yes, Restore
                            </Button>
                            <Button
                                onClick={() => setShowRestoreConfirm(false)}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MFA Modal */}
            <TwoFactorModal
                isOpen={showMFAModal}
                onClose={handleMFAClose}
                onSubmit={handleMFASubmit}
                isLoading={isMFALoading || isCreatingBackup || isRestoring}
                error={mfaError}
                userEmail={user?.email}
            />
        </div>
    );
}; 