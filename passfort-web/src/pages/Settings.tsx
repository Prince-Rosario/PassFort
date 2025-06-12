import React from 'react';
import { SecuritySettings } from '../components/ui/SecuritySettings';
import { useAuthStore } from '../store/authStore';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export const Settings: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        Back to Dashboard
                    </button>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Settings
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage your PassFort account and security preferences
                        </p>
                    </div>
                </div>

                {/* Settings Sections */}
                <div className="space-y-8">
                    {/* Account Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Account Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    First Name
                                </label>
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                                    {user?.firstName || 'Not set'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Last Name
                                </label>
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                                    {user?.lastName || 'Not set'}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email Address
                                </label>
                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                                    {user?.email || 'Not set'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <SecuritySettings />
                    </div>

                    {/* Additional Settings Placeholder */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Preferences
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                        Dark Mode
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Toggle between light and dark themes
                                    </p>
                                </div>
                                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                        Auto-lock Timeout
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Automatically lock vault after inactivity
                                    </p>
                                </div>
                                <select className="px-3 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 text-sm">
                                    <option>15 minutes</option>
                                    <option>30 minutes</option>
                                    <option>1 hour</option>
                                    <option>Never</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-red-500">
                        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
                            Danger Zone
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                        Change Master Password
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Update your master password (will re-encrypt all data)
                                    </p>
                                </div>
                                <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-md transition-colors">
                                    Change Password
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                        Delete Account
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Permanently delete your account and all data
                                    </p>
                                </div>
                                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors">
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 