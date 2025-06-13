// Preferences Settings Component for PassFort Zero-Knowledge Password Manager

import React, { useState } from 'react';
import {
    EyeIcon,
    MoonIcon,
    SunIcon,
    ClockIcon,
    ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Button } from './Button';
import { useTheme, type Theme } from '../../hooks/useTheme';

interface PreferencesData {
    autoLockTimeout: number; // in minutes
    clipboardTimeout: number; // in seconds
    showPasswordStrength: boolean;
    enableNotifications: boolean;
    enableSoundEffects: boolean;
}

export const PreferencesSettings: React.FC = () => {
    const { theme, changeTheme } = useTheme();

    const [preferences, setPreferences] = useState<PreferencesData>({
        autoLockTimeout: 15,
        clipboardTimeout: 30,
        showPasswordStrength: true,
        enableNotifications: true,
        enableSoundEffects: false
    });

    const [isLoading, setIsLoading] = useState(false);

    const handlePreferenceChange = <K extends keyof PreferencesData>(
        key: K,
        value: PreferencesData[K]
    ) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleThemeChange = (newTheme: Theme) => {
        changeTheme(newTheme);
        toast.success(`Theme changed to ${newTheme === 'system' ? 'system default' : newTheme} mode`);
    };

    const savePreferences = async () => {
        setIsLoading(true);
        try {
            // TODO: Save to API/localStorage
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            toast.success('Preferences saved successfully');
        } catch (error) {
            toast.error('Failed to save preferences');
        } finally {
            setIsLoading(false);
        }
    };

    const autoLockOptions = [
        { value: 5, label: '5 minutes' },
        { value: 15, label: '15 minutes' },
        { value: 30, label: '30 minutes' },
        { value: 60, label: '1 hour' },
        { value: 120, label: '2 hours' },
        { value: 0, label: 'Never' }
    ];

    const clipboardOptions = [
        { value: 10, label: '10 seconds' },
        { value: 30, label: '30 seconds' },
        { value: 60, label: '1 minute' },
        { value: 120, label: '2 minutes' },
        { value: 0, label: 'Never clear' }
    ];

    return (
        <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
                <EyeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Preferences
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customize your PassFort experience and app behavior
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Appearance */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Appearance
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Theme
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Choose your preferred color scheme
                                </p>
                            </div>
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${theme === 'light'
                                        ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <SunIcon className="h-4 w-4" />
                                    <span className="text-sm">Light</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${theme === 'dark'
                                        ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <MoonIcon className="h-4 w-4" />
                                    <span className="text-sm">Dark</span>
                                </button>
                                <button
                                    onClick={() => handleThemeChange('system')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${theme === 'system'
                                        ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <ComputerDesktopIcon className="h-4 w-4" />
                                    <span className="text-sm">System</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Security & Privacy
                    </h3>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Auto-lock Timeout
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Automatically lock your vault after inactivity
                                </p>
                            </div>
                            <select
                                value={preferences.autoLockTimeout}
                                onChange={(e) => handlePreferenceChange('autoLockTimeout', Number(e.target.value))}
                                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {autoLockOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Clipboard Clear Timeout
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Clear copied passwords from clipboard after
                                </p>
                            </div>
                            <select
                                value={preferences.clipboardTimeout}
                                onChange={(e) => handlePreferenceChange('clipboardTimeout', Number(e.target.value))}
                                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {clipboardOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* User Experience */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        User Experience
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Show Password Strength
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Display password strength indicators when creating passwords
                                </p>
                            </div>
                            <button
                                onClick={() => handlePreferenceChange('showPasswordStrength', !preferences.showPasswordStrength)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.showPasswordStrength
                                    ? 'bg-blue-600'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.showPasswordStrength ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Enable Notifications
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Show notifications for security alerts and updates
                                </p>
                            </div>
                            <button
                                onClick={() => handlePreferenceChange('enableNotifications', !preferences.enableNotifications)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.enableNotifications
                                    ? 'bg-blue-600'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    Sound Effects
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Play sounds for actions like copying and notifications
                                </p>
                            </div>
                            <button
                                onClick={() => handlePreferenceChange('enableSoundEffects', !preferences.enableSoundEffects)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.enableSoundEffects
                                    ? 'bg-blue-600'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.enableSoundEffects ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <Button
                        variant="primary"
                        onClick={savePreferences}
                        isLoading={isLoading}
                        leftIcon={<ClockIcon className="h-5 w-5" />}
                    >
                        Save Preferences
                    </Button>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                        💡 Privacy & Performance Tips
                    </h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <p>• Enable auto-lock for better security when away from your device</p>
                        <p>• Set clipboard timeout to prevent password exposure</p>
                        <p>• Use system theme to match your device preferences</p>
                        <p>• Notifications help you stay informed about security events</p>
                    </div>
                </div>
            </div>
        </div>
    );
}; 