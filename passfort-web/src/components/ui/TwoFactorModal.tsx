// Two-Factor Authentication Modal Component for PassFort

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Input } from './Input';

interface TwoFactorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (code: string) => Promise<void>;
    isLoading?: boolean;
    error?: string;
    userEmail?: string;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
    error,
    userEmail
}) => {
    const [code, setCode] = useState('');
    const [localError, setLocalError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Clear state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setCode('');
            setLocalError('');
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!code.trim()) {
            setLocalError('Please enter your 2FA code');
            return;
        }

        if (code.length !== 6) {
            setLocalError('2FA code must be 6 digits');
            return;
        }

        try {
            await onSubmit(code.trim());
        } catch (err) {
            // Error is handled by parent component
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
        if (localError) setLocalError('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
                    onKeyDown={handleKeyDown}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Two-Factor Authentication
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {userEmail && `Signing in to ${userEmail}`}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            disabled={isLoading}
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Enter the 6-digit code from your authenticator app to complete sign in.
                            </p>

                            <Input
                                ref={inputRef}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={code}
                                onChange={handleCodeChange}
                                placeholder="000000"
                                label="Verification Code"
                                error={localError || error}
                                isRequired
                                className="text-center text-2xl tracking-widest font-mono"
                                autoComplete="one-time-code"
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex space-x-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                className="flex-1"
                                isLoading={isLoading}
                                disabled={isLoading || !code.trim()}
                            >
                                {isLoading ? 'Verifying...' : 'Verify'}
                            </Button>
                        </div>
                    </form>

                    {/* Recovery code option */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                            Lost your device?{' '}
                            <button
                                type="button"
                                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
                                onClick={() => {
                                    // TODO: Implement recovery code flow
                                    alert('Recovery code feature coming soon!');
                                }}
                            >
                                Use a recovery code instead
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}; 