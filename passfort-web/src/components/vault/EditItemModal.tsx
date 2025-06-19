import React, { useState } from 'react';
import { VaultItemType } from '../../types/vault';
import { offlineVaultService } from '../../services/offlineVaultService';
import type { ClientVaultItemData } from '../../services/vaultService';
import type { VaultItemDto } from '../../types/vault';
import toast from 'react-hot-toast';
import LoginForm from './forms/LoginForm';
import SSHKeyForm from './forms/SSHKeyForm';
import IdentityForm from './forms/IdentityForm';

interface EditItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    vaultId: string;
    item: VaultItemDto;
    decryptedData: ClientVaultItemData;
    onItemUpdated?: () => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({
    isOpen,
    onClose,
    vaultId,
    item,
    decryptedData,
    onItemUpdated
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleFormSubmit = async (formData: any) => {
        setIsLoading(true);
        try {
            console.log('Updating item:', {
                itemId: item.id,
                type: item.itemType,
                data: formData
            });

            // Convert form data to the format expected by the existing API
            const itemData: ClientVaultItemData = {
                title: formData.title,
                username: formData.username || '',
                password: formData.password || '',
                url: formData.url || '',
                notes: formData.notes || '',
                customFields: convertToCustomFields(formData, item.itemType as VaultItemType)
            };

            await offlineVaultService.updateVaultItem(vaultId, item.id, itemData, item.itemType);

            toast.success('Item updated successfully!');
            onItemUpdated?.();
            onClose();
        } catch (error) {
            console.error('Error updating item:', error);
            toast.error('Failed to update item. Please try again.');
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

    // Convert decrypted data to form data format
    const getInitialFormData = () => {
        const baseData: Record<string, any> = {
            title: decryptedData.title || '',
            username: decryptedData.username || '',
            password: decryptedData.password || '',
            url: decryptedData.url || '',
            notes: decryptedData.notes || ''
        };

        // Add custom fields if they exist
        if (decryptedData.customFields) {
            Object.keys(decryptedData.customFields).forEach(key => {
                if (key !== '_itemType') {
                    const value = decryptedData.customFields![key];
                    try {
                        // Try to parse JSON values
                        baseData[key] = JSON.parse(value);
                    } catch {
                        // If not JSON, use as string
                        baseData[key] = value;
                    }
                }
            });
        }

        return baseData;
    };

    if (!isOpen) return null;

    const initialFormData = getInitialFormData();
    const itemType = item.itemType.toLowerCase() as VaultItemType;

    // Render the appropriate form based on item type
    switch (itemType) {
        case VaultItemType.LOGIN:
            return (
                <LoginForm
                    initialData={initialFormData}
                    onSubmit={handleFormSubmit}
                    onCancel={onClose}
                    isLoading={isLoading}
                />
            );

        case VaultItemType.SSH_KEY:
            return (
                <SSHKeyForm
                    initialData={initialFormData}
                    onSubmit={handleFormSubmit}
                    onCancel={onClose}
                    isLoading={isLoading}
                />
            );

        case VaultItemType.IDENTITY:
            return (
                <IdentityForm
                    initialData={initialFormData}
                    onSubmit={handleFormSubmit}
                    onCancel={onClose}
                    isLoading={isLoading}
                />
            );

        case VaultItemType.SECURE_NOTE:
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Edit Secure Note
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Secure Note editing form coming soon...
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
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
                            Edit Credit Card
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Credit Card editing form coming soon...
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
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
                            Edit API Key
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            API Key editing form coming soon...
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            );

        case VaultItemType.SOFTWARE_LICENSE:
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Edit Software License
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Software License editing form coming soon...
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            );

        default:
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Edit Item
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Editing for this item type is not yet supported.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            );
    }
};

export default EditItemModal; 