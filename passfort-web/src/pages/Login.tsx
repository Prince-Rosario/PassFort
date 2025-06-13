// Login Page for PassFort Zero-Knowledge Password Manager

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TwoFactorModal } from '../components/ui/TwoFactorModal';
import { useAuthStore } from '../store/authStore';
import type { LoginRequest } from '../types/auth';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  masterPassword: z
    .string()
    .min(1, 'Master password is required')
    .min(12, 'Master password must be at least 12 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [rememberMe, setRememberMe] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<LoginRequest | null>(null);
  const [twoFactorError, setTwoFactorError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const credentials: LoginRequest = {
        ...data,
        rememberMe
      };

      await login(credentials);
      toast.success('Welcome back to PassFort!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);

      // Check if 2FA is required
      if (error?.message === 'Two-factor authentication code is required') {
        // Store credentials and show 2FA modal
        setPendingCredentials({
          ...data,
          rememberMe
        });
        setShowTwoFactorModal(true);
        setTwoFactorError('');
        return;
      }

      // Handle other specific error cases
      if (error?.status === 401) {
        setError('masterPassword', { message: 'Invalid email or master password' });
      } else if (error?.status === 429) {
        toast.error('Too many login attempts. Please try again later.');
      } else {
        toast.error(error?.message || 'Login failed. Please try again.');
      }
    }
  };

  const handleTwoFactorSubmit = async (twoFactorCode: string) => {
    if (!pendingCredentials) return;

    try {
      console.log('🔐 2FA LOGIN: Submitting code:', {
        codeLength: twoFactorCode.length,
        timestamp: new Date().toISOString(),
        email: pendingCredentials.email
      });

      const credentialsWithTwoFactor: LoginRequest = {
        ...pendingCredentials,
        twoFactorCode
      };

      await login(credentialsWithTwoFactor);

      // Success - close modal and navigate
      setShowTwoFactorModal(false);
      setPendingCredentials(null);
      setTwoFactorError('');
      toast.success('Welcome back to PassFort!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('🚨 2FA verification error:', error);

      // Show error in modal
      if (error?.message?.includes('Invalid two-factor authentication code')) {
        setTwoFactorError('Invalid verification code. Please try again.');
      } else if (error?.message?.includes('Invalid verification code')) {
        setTwoFactorError('Invalid verification code. Please try again.');
      } else {
        setTwoFactorError(error?.message || 'Verification failed. Please try again.');
      }

      throw error; // Re-throw so modal can handle loading state
    }
  };

  const handleTwoFactorModalClose = () => {
    setShowTwoFactorModal(false);
    setPendingCredentials(null);
    setTwoFactorError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and header */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-12 w-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              PassFort
            </h1>
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or{' '}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Security notice */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex">
              <LockClosedIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Zero-Knowledge Security
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  Your master password never leaves your device. PassFort cannot access your data.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register('email')}
              type="email"
              label="Email address"
              placeholder="Enter your email"
              error={errors.email?.message}
              isRequired
              autoComplete="email"
              autoFocus
            />

            <Input
              {...register('masterPassword')}
              type="password"
              label="Master Password"
              placeholder="Enter your master password"
              error={errors.masterPassword?.message}
              isRequired
              showPasswordToggle
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading || isSubmitting}
              disabled={isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Additional security info */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Protected by end-to-end encryption and zero-knowledge architecture.
              <br />
              <Link to="/security" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                Learn more about our security
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Modal */}
      <TwoFactorModal
        isOpen={showTwoFactorModal}
        onClose={handleTwoFactorModalClose}
        onSubmit={handleTwoFactorSubmit}
        isLoading={isLoading}
        error={twoFactorError}
        userEmail={pendingCredentials?.email}
      />
    </div>
  );
}; 