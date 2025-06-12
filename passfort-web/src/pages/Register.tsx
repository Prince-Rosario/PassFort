// Register Page for PassFort Zero-Knowledge Password Manager

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { SecurityLevel, getSecurityLevels, setSecurityLevel, getSecurityLevel } from '../utils/crypto';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import type { RegisterRequest } from '../types/auth';

// Password requirements for strength checking
const passwordRequirements = [
  { regex: /.{12,}/, text: 'At least 12 characters' },
  { regex: /[a-z]/, text: 'Lowercase letter' },
  { regex: /[A-Z]/, text: 'Uppercase letter' },
  { regex: /[0-9]/, text: 'Number' },
  { regex: /[^A-Za-z0-9]/, text: 'Special character' },
];

// Validation schema
const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  masterPassword: z
    .string()
    .min(12, 'Master password must be at least 12 characters')
    .regex(/[a-z]/, 'Master password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Master password must contain an uppercase letter')
    .regex(/[0-9]/, 'Master password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Master password must contain a special character'),
  confirmMasterPassword: z
    .string()
    .min(1, 'Please confirm your master password'),
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the Terms of Service'),
}).refine((data) => data.masterPassword === data.confirmMasterPassword, {
  message: "Master passwords don't match",
  path: ["confirmMasterPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [masterPassword, setMasterPassword] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);
  const [selectedSecurityLevel, setSelectedSecurityLevel] = useState<SecurityLevel>(getSecurityLevel());

  const securityLevels = getSecurityLevels();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchedMasterPassword = watch('masterPassword', '');

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

  // Update master password state for strength checking
  useEffect(() => {
    setMasterPassword(watchedMasterPassword || '');
  }, [watchedMasterPassword]);

  const getPasswordStrength = (password: string) => {
    const metRequirements = passwordRequirements.filter(req => req.regex.test(password));
    const strength = metRequirements.length;

    if (strength < 2) return { level: 'weak', percentage: 20 };
    if (strength < 4) return { level: 'medium', percentage: 60 };
    if (strength === 5) return { level: 'strong', percentage: 100 };
    return { level: 'medium', percentage: 80 };
  };

  const passwordStrength = getPasswordStrength(masterPassword);

  const handleSecurityLevelChange = (level: SecurityLevel) => {
    setSelectedSecurityLevel(level);
    setSecurityLevel(level); // Update the global security level for registration
  };

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

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data as RegisterRequest);
      toast.success('Account created successfully! Please sign in.');
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error('Registration error:', error);

      if (error?.status === 409) {
        setError('email', { message: 'An account with this email already exists' });
      } else {
        toast.error(error?.message || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-12 w-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              PassFort
            </h1>
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Create your account
        </h2>



        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <Input
                {...register('firstName')}
                type="text"
                label="First name"
                placeholder="John"
                error={errors.firstName?.message}
                isRequired
              />

              <Input
                {...register('lastName')}
                type="text"
                label="Last name"
                placeholder="Doe"
                error={errors.lastName?.message}
                isRequired
              />
            </div>

            <Input
              {...register('email')}
              type="email"
              label="Email address"
              placeholder="john@example.com"
              error={errors.email?.message}
              isRequired
            />

            <div className="space-y-2">
              <Input
                {...register('masterPassword')}
                type="password"
                label="Master password"
                placeholder="Create a strong master password"
                error={errors.masterPassword?.message}
                isRequired
                showPasswordToggle
                onFocus={() => setShowRequirements(true)}
              />

              {masterPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Password strength:
                    </span>
                    <span className={`text-sm font-medium ${passwordStrength.level === 'weak' ? 'text-red-600' :
                      passwordStrength.level === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                      {passwordStrength.level.charAt(0).toUpperCase() + passwordStrength.level.slice(1)}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.level === 'weak' ? 'bg-red-500' :
                        passwordStrength.level === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {(showRequirements || masterPassword) && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Master password requirements:
                  </h4>
                  <ul className="space-y-1">
                    {passwordRequirements.map((req, index) => {
                      const isMet = req.regex.test(masterPassword);
                      return (
                        <li key={index} className="flex items-center text-sm">
                          {isMet ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
                          )}
                          <span className={isMet ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}>
                            {req.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <Input
              {...register('confirmMasterPassword')}
              type="password"
              label="Confirm master password"
              placeholder="Confirm your master password"
              error={errors.confirmMasterPassword?.message}
              isRequired
              showPasswordToggle
            />

            {/* Security Level Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Security Level
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred security level. This affects login time and protection strength.
              </p>

              <div className="space-y-2">
                {Object.entries(securityLevels).map(([level, config]) => {
                  const levelKey = level as SecurityLevel;
                  const description = getSecurityDescription(levelKey);
                  const isSelected = selectedSecurityLevel === levelKey;

                  return (
                    <div
                      key={level}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      onClick={() => handleSecurityLevelChange(levelKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => handleSecurityLevelChange(levelKey)}
                            className="text-blue-600 mr-3"
                          />
                          <div>
                            <h4 className={`font-medium ${description.color}`}>
                              {description.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {description.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                          <div>{config.memoryMiB} MiB</div>
                          <div>~{config.estimatedMs}ms</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> You can change this later in Settings, but it will require re-entering your master password.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                {...register('agreeToTerms')}
                id="agree-terms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                I agree to the{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.agreeToTerms.message}
              </p>
            )}

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
              {isLoading || isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}; 