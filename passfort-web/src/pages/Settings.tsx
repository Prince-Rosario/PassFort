// Enhanced Settings Page for PassFort Zero-Knowledge Password Manager

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    UserIcon,
    ShieldCheckIcon,
    EyeIcon,
    ExclamationTriangleIcon,
    DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

import { useAuthStore } from '../store/authStore';

import { MFASettings } from '../components/ui/MFASettings';
import { AccountSettings } from '../components/ui/AccountSettings';
import { PreferencesSettings } from '../components/ui/PreferencesSettings';
import { DangerZoneSettings } from '../components/ui/DangerZoneSettings';

// Settings section type
type SettingsSection = 'account' | 'security' | 'mfa' | 'preferences' | 'danger';

export const Settings: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<SettingsSection>('account');

    // Settings navigation items
    const settingsNav = [
        {
            id: 'account' as SettingsSection,
            name: 'Account',
            icon: UserIcon,
            description: 'Personal information and profile'
        },
        {
            id: 'security' as SettingsSection,
            name: 'Security',
            icon: ShieldCheckIcon,
            description: 'Password and security settings'
        },
        {
            id: 'mfa' as SettingsSection,
            name: 'Two-Factor Auth',
            icon: DevicePhoneMobileIcon,
            description: 'Multi-factor authentication'
        },
        {
            id: 'preferences' as SettingsSection,
            name: 'Preferences',
            icon: EyeIcon,
            description: 'App preferences and behavior'
        },
        {
            id: 'danger' as SettingsSection,
            name: 'Advanced',
            icon: ExclamationTriangleIcon,
            description: 'Dangerous operations'
        }
    ];

    const renderSettingsContent = () => {
        switch (activeSection) {
            case 'account':
                return <AccountSettings />;
            case 'security':
                return (
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Security Settings</h2>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Security Level: Balanced</h3>
                            <p className="text-blue-700 dark:text-blue-300 text-sm">
                                PassFort uses a balanced security level (SCRYPT N=16384) for all accounts to ensure consistent vault encryption and optimal performance.
                                This provides strong security while maintaining reasonable login times.
                            </p>
                        </div>
                    </div>
                );
            case 'mfa':
                return <MFASettings />;
            case 'preferences':
                return <PreferencesSettings />;
            case 'danger':
                return <DangerZoneSettings />;
            default:
                return <AccountSettings />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        Back to Dashboard
                    </button>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <ShieldCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                    Settings
                                </h1>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                                    Manage your PassFort account, security, and preferences
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Tabs */}
                <div className="lg:hidden mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
                        <div className="flex overflow-x-auto space-x-1 scrollbar-thin">
                            {settingsNav.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeSection === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveSection(item.id)}
                                        className={`flex-shrink-0 flex flex-col items-center p-3 rounded-lg transition-colors min-w-[80px] ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                                        <span className="text-xs font-medium text-center">{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {/* Desktop Settings Navigation */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <nav className="space-y-2">
                                {settingsNav.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeSection === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${isActive
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                                                <div className="text-left">
                                                    <p className="font-medium">{item.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* User Info Card */}
                        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                    <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Security Level</span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">
                                        Balanced (Fixed)
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs mt-1">
                                    <span className="text-gray-500 dark:text-gray-400">2FA Status</span>
                                    <span className={`font-medium ${user?.twoFactorEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                        {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settings Content */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                            {renderSettingsContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 