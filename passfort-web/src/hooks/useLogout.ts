// Custom hook for logout functionality

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface UseLogoutOptions {
    showSuccessToast?: boolean;
    redirectTo?: string;
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export const useLogout = (options: UseLogoutOptions = {}) => {
    const {
        showSuccessToast = true,
        redirectTo = '/login',
        onSuccess,
        onError
    } = options;

    const navigate = useNavigate();
    const { logout: storeLogout, isLoading } = useAuthStore();

    const logout = useCallback(async () => {
        try {
            await storeLogout();

            if (showSuccessToast) {
                toast.success('Successfully signed out');
            }

            onSuccess?.();

            if (redirectTo) {
                navigate(redirectTo, { replace: true });
            }
        } catch (error) {
            console.error('Logout error:', error);

            // Even if logout fails on server, we still clear local state
            // so show appropriate message
            if (showSuccessToast) {
                toast.success('Signed out locally (server error occurred)');
            }

            onError?.(error);

            if (redirectTo) {
                navigate(redirectTo, { replace: true });
            }
        }
    }, [storeLogout, showSuccessToast, redirectTo, navigate, onSuccess, onError]);

    return {
        logout,
        isLoading
    };
};

// Hook for logout with confirmation
export const useLogoutWithConfirmation = (options: UseLogoutOptions = {}) => {
    const { logout, isLoading } = useLogout(options);

    const logoutWithConfirmation = useCallback(async () => {
        const confirmed = window.confirm(
            'Are you sure you want to sign out? You will need to enter your master password again to access your vault.'
        );

        if (confirmed) {
            await logout();
        }
    }, [logout]);

    return {
        logout: logoutWithConfirmation,
        isLoading
    };
}; 