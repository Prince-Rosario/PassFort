import React, { useState } from 'react';
import { XMarkIcon, UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Input } from './Input';

interface CreateTeamModalProps {
    onClose: () => void;
    onSubmit: (data: { name: string; description?: string }) => Promise<void>;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Team name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Team name must be at least 2 characters';
        } else if (formData.name.trim().length > 200) {
            newErrors.name = 'Team name must be less than 200 characters';
        }

        if (formData.description.length > 1000) {
            newErrors.description = 'Description must be less than 1000 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                description: formData.description.trim() || undefined
            });
        } catch (error) {
            console.error('Error creating team:', error);
            setErrors({ submit: 'Unable to create team. Please ensure the backend server is running and try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear field error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <UsersIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Team</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.submit && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                            {errors.submit}
                        </div>
                    )}

                    <div>
                        <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Team Name *
                        </label>
                        <Input
                            id="teamName"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Enter team name"
                            className={errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                            maxLength={200}
                            autoFocus
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description <span className="text-gray-500 dark:text-gray-400">(Optional)</span>
                        </label>
                        <textarea
                            id="teamDescription"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Describe the purpose of this team"
                            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                         ${errors.description ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' : ''}`}
                            rows={3}
                            maxLength={1000}
                        />
                        <div className="flex justify-between mt-1">
                            {errors.description && (
                                <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                                {formData.description.length}/1000
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={loading || !formData.name.trim()}
                        >
                            {loading ? 'Creating...' : 'Create Team'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 