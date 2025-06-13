import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { LoginFormData } from '../../../types/vault';

interface LoginFormProps {
    initialData?: Partial<LoginFormData>;
    onSubmit: (data: LoginFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue
    } = useForm<LoginFormData>({
        defaultValues: {
            title: initialData?.title || '',
            username: initialData?.username || '',
            password: initialData?.password || '',
            url: initialData?.url || '',
            notes: initialData?.notes || '',
            totpSecret: initialData?.totpSecret || ''
        }
    });

    const generatePassword = () => {
        const length = 16;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setValue('password', password);
    };

    const currentPassword = watch('password');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {initialData ? 'Edit Login' : 'Add Login'}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name *
                        </label>
                        <input
                            {...register('title', { required: 'Name is required' })}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Gmail, GitHub, Company Portal"
                        />
                        {errors.title && (
                            <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                        )}
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            {...register('username')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Username or email address"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                {...register('password')}
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter password"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 border-l border-gray-300"
                                    title="Generate password"
                                >
                                    🎲
                                </button>
                            </div>
                        </div>
                        {currentPassword && (
                            <div className="mt-2 text-sm text-gray-600">
                                Strength: <span className="font-medium">
                                    {currentPassword.length < 8 ? 'Weak' :
                                        currentPassword.length < 12 ? 'Medium' : 'Strong'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Website URL
                        </label>
                        <input
                            {...register('url')}
                            type="url"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://example.com"
                        />
                    </div>

                    {/* TOTP Secret */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            2FA Secret Key (Optional)
                        </label>
                        <input
                            {...register('totpSecret')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Base32 secret for TOTP generation"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Enter the secret key from your 2FA setup to generate codes within PassFort
                        </p>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Additional notes or information"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : (initialData ? 'Update' : 'Save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm; 