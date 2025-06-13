import React from 'react';
import { VaultItemType } from '../../types/vault';
import { getAllItemTypes } from '../../config/itemTypes';

// Mock X icon for now
const X: React.FC<{ className?: string }> = ({ className }) =>
    <span className={className}>✕</span>;

interface ItemTypeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectType: (type: VaultItemType) => void;
}

const ItemTypeSelector: React.FC<ItemTypeSelectorProps> = ({
    isOpen,
    onClose,
    onSelectType
}) => {
    const itemTypes = getAllItemTypes();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Item</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {itemTypes.map((itemType) => {
                        const IconComponent = itemType.icon;
                        return (
                            <button
                                key={itemType.type}
                                onClick={() => onSelectType(itemType.type)}
                                className="flex items-start p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                            >
                                <div className={`flex-shrink-0 p-2 rounded-lg ${itemType.color} mr-3 mt-1`}>
                                    <IconComponent className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                                        {itemType.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {itemType.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Select the type of item you want to add to your vault. You can always change this later.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ItemTypeSelector; 