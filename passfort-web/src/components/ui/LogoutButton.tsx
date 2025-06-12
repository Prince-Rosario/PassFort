// Logout Button Component for PassFort Password Manager

import React, { useState } from 'react';
import { ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useLogout } from '../../hooks/useLogout';

interface LogoutButtonProps {
    variant?: 'button' | 'menu-item';
    className?: string;
    showConfirmation?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
    variant = 'button',
    className = '',
    showConfirmation = true
}) => {
    const { logout, isLoading } = useLogout();
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const handleInitialClick = () => {
        if (showConfirmation) {
            setShowConfirmDialog(true);
        } else {
            logout();
        }
    };

    const handleConfirmLogout = () => {
        setShowConfirmDialog(false);
        logout();
    };

    const handleCancel = () => {
        setShowConfirmDialog(false);
    };

    if (variant === 'menu-item') {
        return (
            <>
                <button
                    onClick={handleInitialClick}
                    disabled={isLoading}
                    className={`w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 ${className}`}
                >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
                </button>
                {showConfirmDialog && <ConfirmDialog onConfirm={handleConfirmLogout} onCancel={handleCancel} />}
            </>
        );
    }

    return (
        <>
            <button
                onClick={handleInitialClick}
                disabled={isLoading}
                className={`inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${className}`}
            >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
            </button>
            {showConfirmDialog && <ConfirmDialog onConfirm={handleConfirmLogout} onCancel={handleCancel} />}
        </>
    );
};

// Confirmation Dialog Component
const ConfirmDialog: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-auto p-6">
                <div className="flex flex-col items-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="mt-3 text-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                            Sign out of PassFort?
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                You will need to sign in again to access your vault. Make sure you remember your master password.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:gap-3">
                    <button
                        type="button"
                        className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                        onClick={onConfirm}
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}; 