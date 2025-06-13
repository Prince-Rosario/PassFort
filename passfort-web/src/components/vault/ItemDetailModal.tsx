import React, { useState } from 'react';
import {
    XMarkIcon,
    EyeIcon,
    EyeSlashIcon,
    ClipboardIcon,
    UserIcon,
    KeyIcon,
    GlobeAltIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    DocumentTextIcon,
    PencilIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, HeartIcon as HeartIconOutline } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import type { VaultItemDto } from '../../types/vault';
import type { ClientVaultItemData } from '../../services/vaultService';
import { getItemTypeConfig } from '../../config/itemTypes';

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: VaultItemDto;
    decryptedData: ClientVaultItemData;
    onToggleFavorite?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    isOpen,
    onClose,
    item,
    decryptedData,
    onToggleFavorite,
    onEdit,
    onDelete
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showSensitiveFields, setShowSensitiveFields] = useState<Record<string, boolean>>({});

    if (!isOpen) return null;

    const config = getItemTypeConfig(item.itemType as any);
    const IconComponent = config.icon;

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied to clipboard!`);
        } catch (error) {
            toast.error('Failed to copy to clipboard');
        }
    };

    const toggleSensitiveField = (fieldName: string) => {
        setShowSensitiveFields(prev => ({
            ...prev,
            [fieldName]: !prev[fieldName]
        }));
    };

    const renderField = (
        label: string,
        value: string | undefined,
        icon: React.ComponentType<{ className?: string }>,
        isSensitive: boolean = false,
        fieldKey?: string
    ) => {
        if (!value) return null;

        const FieldIcon = icon;
        const isVisible = isSensitive ? (fieldKey ? showSensitiveFields[fieldKey] : showPassword) : true;

        return (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FieldIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {label}
                        </p>
                        <p className={`text-sm text-gray-900 dark:text-white mt-1 ${isSensitive ? 'font-mono' : ''} break-words`}>
                            {isVisible ? value : '••••••••••••'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-1 ml-3">
                    {isSensitive && (
                        <button
                            onClick={() => fieldKey ? toggleSensitiveField(fieldKey) : setShowPassword(!showPassword)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            {isVisible ? (
                                <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                                <EyeIcon className="h-4 w-4" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => copyToClipboard(value, label)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ClipboardIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    };

    const renderSection = (title: string, children: React.ReactNode) => {
        if (!children) return null;

        return (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-2">
                    {title}
                </h3>
                <div className="space-y-3">
                    {children}
                </div>
            </div>
        );
    };

    const renderLoginFields = () => (
        <>
            {renderField('Username', decryptedData.username, UserIcon)}
            {renderField('Password', decryptedData.password, KeyIcon, true)}
            {renderField('Website', decryptedData.url, GlobeAltIcon)}
        </>
    );

    const renderIdentityFields = () => {
        // For identity items, we need to parse custom fields or use structured data
        const customFields = decryptedData.customFields || {};

        return (
            <>
                {renderSection('Personal Details', (
                    <>
                        {renderField('First Name', customFields.firstName, UserIcon)}
                        {renderField('Last Name', customFields.lastName, UserIcon)}
                        {renderField('Email', customFields.email, EnvelopeIcon)}
                        {renderField('Phone', customFields.phone, PhoneIcon)}
                    </>
                ))}

                {renderSection('Address', (
                    <>
                        {renderField('Address', customFields.address, MapPinIcon)}
                        {renderField('City', customFields.city, MapPinIcon)}
                        {renderField('State', customFields.state, MapPinIcon)}
                        {renderField('Postal Code', customFields.postalCode, MapPinIcon)}
                        {renderField('Country', customFields.country, MapPinIcon)}
                    </>
                ))}
            </>
        );
    };

    const renderItemTypeFields = () => {
        switch (item.itemType.toLowerCase()) {
            case 'login':
                return renderLoginFields();
            case 'identity':
                return renderIdentityFields();
            case 'secure_note':
            case 'securenote':
                return renderField('Content', decryptedData.notes, DocumentTextIcon);
            default:
                return renderLoginFields(); // Fallback
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${config.color} shadow-sm`}>
                            <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {decryptedData.title || 'Untitled'}
                            </h2>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.color} bg-opacity-10`}>
                                    {config.name}
                                </span>
                                {item.isFavorite && (
                                    <HeartIconSolid className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onToggleFavorite}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            {item.isFavorite ? (
                                <HeartIconSolid className="h-5 w-5 text-red-500" />
                            ) : (
                                <HeartIconOutline className="h-5 w-5" />
                            )}
                        </button>
                        <button
                            onClick={onEdit}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="space-y-6">
                        {/* Item Details Section */}
                        {renderSection('Item Details', renderItemTypeFields())}

                        {/* Notes Section */}
                        {decryptedData.notes && renderSection('Notes', (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">
                                    {decryptedData.notes}
                                </p>
                            </div>
                        ))}

                        {/* Metadata Section */}
                        {renderSection('Item History', (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                                    <p><span className="font-medium">Created:</span> {new Date(item.createdAt).toLocaleString()}</p>
                                    <p><span className="font-medium">Modified:</span> {new Date(item.updatedAt).toLocaleString()}</p>
                                    <p><span className="font-medium">Item ID:</span> {item.id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailModal; 