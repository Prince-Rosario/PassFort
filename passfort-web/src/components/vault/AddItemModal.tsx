import React, { useState } from 'react';
import { VaultItemType } from '../../types/vault';
import { vaultService } from '../../services/vaultService';
import toast from 'react-hot-toast';
import ItemTypeSelector from './ItemTypeSelector';
import LoginForm from './forms/LoginForm';
import SSHKeyForm from './forms/SSHKeyForm';
import IdentityForm from './forms/IdentityForm';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    vaultId: string;
    onItemCreated?: () => void;
}

type AddItemStep = 'select-type' | 'form';

const AddItemModal: React.FC<AddItemModalProps> = ({
    isOpen,
    onClose,
    vaultId,
    onItemCreated
}) => {
    const [step, setStep] = useState<AddItemStep>('select-type');
    const [selectedType, setSelectedType] = useState<VaultItemType | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleTypeSelect = (type: VaultItemType) => {
        setSelectedType(type);
        setStep('form');
    };

    const handleFormSubmit = async (formData: any) => {
        if (!selectedType) return;

        setIsLoading(true);
        try {
            console.log('Creating item:', {
                vaultId,
                type: selectedType,
                data: formData
            });

            // Convert form data to the format expected by the existing API
            const itemData = {
                title: formData.title,
                username: formData.username || '',
                password: formData.password || '',
                url: formData.url || '',
                notes: formData.notes || '',
                customFields: convertToCustomFields(formData, selectedType)
            };

            await vaultService.createVaultItem(vaultId, itemData, selectedType);

            toast.success('Item created successfully!');
            onItemCreated?.();
            handleClose();
        } catch (error) {
            console.error('Error creating item:', error);
            toast.error('Failed to create item. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to convert form data to custom fields for non-login items
    const convertToCustomFields = (formData: any, itemType: VaultItemType): Record<string, string> => {
        const customFields: Record<string, string> = {};

        // Store all fields that are not part of the basic ClientVaultItemData interface
        Object.keys(formData).forEach(key => {
            if (!['title', 'username', 'password', 'url', 'notes'].includes(key)) {
                const value = formData[key];
                if (value !== undefined && value !== null && value !== '') {
                    customFields[key] = typeof value === 'string' ? value : JSON.stringify(value);
                }
            }
        });

        // Add item type for proper reconstruction later
        customFields._itemType = itemType;

        return customFields;
    };

    const handleClose = () => {
        setStep('select-type');
        setSelectedType(null);
        setIsLoading(false);
        onClose();
    };

    const handleBack = () => {
        setStep('select-type');
        setSelectedType(null);
    };

    if (!isOpen) return null;

    // Step 1: Type Selection
    if (step === 'select-type') {
        return (
            <ItemTypeSelector
                isOpen={true}
                onClose={handleClose}
                onSelectType={handleTypeSelect}
            />
        );
    }

    // Step 2: Form for selected type
    if (step === 'form' && selectedType) {
        switch (selectedType) {
            case VaultItemType.LOGIN:
                return (
                    <LoginForm
                        onSubmit={handleFormSubmit}
                        onCancel={handleBack}
                        isLoading={isLoading}
                    />
                );

            case VaultItemType.SSH_KEY:
                return (
                    <SSHKeyForm
                        onSubmit={handleFormSubmit}
                        onCancel={handleBack}
                        isLoading={isLoading}
                    />
                );

            case VaultItemType.IDENTITY:
                return (
                    <IdentityForm
                        onSubmit={handleFormSubmit}
                        onCancel={handleBack}
                        isLoading={isLoading}
                    />
                );

            case VaultItemType.SECURE_NOTE:
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                Secure Note Form
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Secure Note form coming soon...
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleBack}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case VaultItemType.CREDIT_CARD:
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                Credit Card Form
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Credit Card form coming soon...
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleBack}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case VaultItemType.API_KEY:
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                API Key Form
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                API Key form coming soon...
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleBack}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case VaultItemType.SOFTWARE_LICENSE:
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Software License Form
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Software License form coming soon...
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleBack}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    }

    return null;
};

export default AddItemModal; 