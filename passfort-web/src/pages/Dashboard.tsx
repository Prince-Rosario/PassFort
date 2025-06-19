// Zero-Knowledge Vault Dashboard for PassFort Password Manager

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    KeyIcon,
    CogIcon,
    EyeIcon,
    EyeSlashIcon,
    ClipboardIcon,
    FolderIcon,
    GlobeAltIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    UserIcon,
    SunIcon,
    MoonIcon,
    Bars3Icon,
    XMarkIcon,
    StarIcon,
    ArchiveBoxIcon,
    TrashIcon,
    TagIcon,
    ChevronRightIcon,
    EllipsisHorizontalIcon,
    FolderPlusIcon,
    EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';
import { vaultService, type ClientVaultData, type ClientVaultItemData } from '../services/vaultService';
import { offlineVaultService } from '../services/offlineVaultService';
import type { VaultSummaryDto, VaultItemDto } from '../types/vault';
import { VaultItemType } from '../types/vault';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LogoutButton } from '../components/ui/LogoutButton';
import { UnlockVaultModal } from '../components/ui/UnlockVaultModal';
import { SecureKeyManager } from '../utils/crypto';
import AddItemModal from '../components/vault/AddItemModal';
import ItemDetailModal from '../components/vault/ItemDetailModal';
import EditItemModal from '../components/vault/EditItemModal';
import { getItemTypeConfig } from '../config/itemTypes';
import { useTheme } from '../hooks/useTheme';

// Combined type for decrypted vault items
interface DecryptedVaultItem {
    item: VaultItemDto;
    decryptedData: ClientVaultItemData;
}

// Combined type for decrypted vault summaries
interface DecryptedVaultSummary {
    vault: VaultSummaryDto;
    decryptedName: string;
}

// Sidebar categories
interface SidebarCategory {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    filter: (items: DecryptedVaultItem[]) => DecryptedVaultItem[];
}

export const Dashboard: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { theme, changeTheme } = useTheme();

    // State management
    const [vaults, setVaults] = useState<DecryptedVaultSummary[]>([]);
    const [selectedVault, setSelectedVault] = useState<string | null>(null);
    const [vaultItems, setVaultItems] = useState<DecryptedVaultItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<DecryptedVaultItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateVaultForm, setShowCreateVaultForm] = useState(false);
    const [isCreatingVault, setIsCreatingVault] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showVaultMenu, setShowVaultMenu] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<string | null>(null);

    const [newVaultName, setNewVaultName] = useState('');
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DecryptedVaultItem | null>(null);
    const [showItemDetailModal, setShowItemDetailModal] = useState(false);
    const [showEditItemModal, setShowEditItemModal] = useState(false);

    // Define sidebar categories
    const sidebarCategories: SidebarCategory[] = [
        {
            id: 'all',
            name: 'All Items',
            icon: FolderIcon,
            filter: (items) => items
        },
        {
            id: 'favorites',
            name: 'Favorites',
            icon: StarIcon,
            filter: (items) => items.filter(item => item.item.isFavorite)
        },
        {
            id: 'logins',
            name: 'Logins',
            icon: KeyIcon,
            filter: (items) => items.filter(item =>
                item.item.itemType === VaultItemType.LOGIN ||
                (item.item.itemType as string) === 'Password' ||
                (item.item.itemType as string) === 'Login'
            )
        },
        {
            id: 'secure_notes',
            name: 'Secure Notes',
            icon: DocumentTextIcon,
            filter: (items) => items.filter(item =>
                item.item.itemType === VaultItemType.SECURE_NOTE ||
                (item.item.itemType as string) === 'Note'
            )
        },
        {
            id: 'credit_cards',
            name: 'Credit Cards',
            icon: ({ className }) => (
                <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            ),
            filter: (items) => items.filter(item =>
                item.item.itemType === VaultItemType.CREDIT_CARD ||
                (item.item.itemType as string) === 'CreditCard'
            )
        },
        {
            id: 'identities',
            name: 'Identities',
            icon: UserIcon,
            filter: (items) => items.filter(item =>
                item.item.itemType === VaultItemType.IDENTITY ||
                (item.item.itemType as string) === 'Identity'
            )
        }
    ];

    // Load vaults on component mount
    useEffect(() => {
        checkEncryptionKeyAndLoadVaults();
    }, []);

    // Close vault menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowVaultMenu(null);
        };

        if (showVaultMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showVaultMenu]);

    // Handle search and category filtering
    useEffect(() => {
        let filtered = vaultItems;

        // Apply category filter
        const category = sidebarCategories.find(cat => cat.id === selectedCategory);
        if (category) {
            filtered = category.filter(vaultItems);
        }

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(({ decryptedData }) => {
                return (
                    decryptedData.title?.toLowerCase().includes(search) ||
                    decryptedData.username?.toLowerCase().includes(search) ||
                    decryptedData.url?.toLowerCase().includes(search) ||
                    decryptedData.notes?.toLowerCase().includes(search)
                );
            });
        }

        setFilteredItems(filtered);
    }, [searchTerm, vaultItems, selectedCategory]);

    // Check if encryption key is available, if not show unlock modal
    const checkEncryptionKeyAndLoadVaults = async () => {
        const keyManager = SecureKeyManager.getInstance();
        const encryptionKey = keyManager.getEncryptionKey();

        console.log('🔐 Checking encryption key availability...', {
            hasKey: !!encryptionKey,
            keyType: encryptionKey?.constructor?.name,
            keyAlgorithm: encryptionKey?.algorithm
        });

        if (!encryptionKey) {
            console.log('🔐 Encryption key not available, prompting user to unlock vault...');
            setIsLoading(false);
            setShowUnlockModal(true);
            return;
        }

        // Key is available, proceed with loading vaults
        console.log('✅ Encryption key found, proceeding with vault loading...');
        await loadVaults();
    };

    // Load user's vaults
    const loadVaults = async () => {
        try {
            setIsLoading(true);
            console.log('🔐 Loading vaults with zero-knowledge encryption...');

            const userVaults = await offlineVaultService.getVaults();

            // Decrypt vault names for display
            const decryptedVaults: DecryptedVaultSummary[] = [];
            for (const vault of userVaults) {
                try {
                    // Decrypt the vault name for display
                    const decryptedNameData = await offlineVaultService.decryptData<{ value: string }>(vault.name);
                    decryptedVaults.push({
                        vault,
                        decryptedName: decryptedNameData.value
                    });
                } catch (error) {
                    console.warn(`Failed to decrypt vault name for vault ${vault.id}:`, error);
                    // Fallback to showing encrypted name or a default
                    decryptedVaults.push({
                        vault,
                        decryptedName: 'Encrypted Vault'
                    });
                }
            }

            setVaults(decryptedVaults);

            // Auto-select first vault if available
            if (decryptedVaults.length > 0 && !selectedVault) {
                setSelectedVault(decryptedVaults[0].vault.id);
                await loadVaultItems(decryptedVaults[0].vault.id);
            }

            console.log('✅ Vaults loaded and decrypted successfully');
        } catch (error) {
            console.error('❌ Failed to load vaults:', error);
            toast.error('Failed to load vaults');
        } finally {
            setIsLoading(false);
        }
    };

    // Load items for selected vault
    const loadVaultItems = async (vaultId: string) => {
        try {
            console.log(`🔐 Loading vault items for vault ${vaultId}...`);

            // Check encryption key before starting
            const keyManager = SecureKeyManager.getInstance();
            const encryptionKey = keyManager.getEncryptionKey();
            console.log(`🔐 Encryption key status before loading items:`, {
                hasKey: !!encryptionKey,
                keyType: encryptionKey?.constructor?.name
            });

            if (!encryptionKey) {
                console.error('❌ No encryption key available for decryption');
                toast.error('Encryption key not available. Please unlock your vault.');
                setShowUnlockModal(true);
                return;
            }

            const encryptedItems = await offlineVaultService.getVaultItems(vaultId);
            console.log(`📋 Retrieved ${encryptedItems.length} encrypted items from server`);

            const decryptedItems: DecryptedVaultItem[] = [];

            // Decrypt each item on the client side (Zero-Knowledge)
            for (const item of encryptedItems) {
                try {
                    console.log(`🔓 Attempting to decrypt item ${item.id}...`);
                    const { decryptedData } = await offlineVaultService.getVaultItem(vaultId, item.id);
                    decryptedItems.push({ item, decryptedData });
                    console.log(`✅ Successfully decrypted item ${item.id}`);
                } catch (error) {
                    console.error(`❌ Failed to decrypt item ${item.id}:`, error);

                    // Check if encryption key is still available after error
                    const keyAfterError = keyManager.getEncryptionKey();
                    console.log(`🔐 Encryption key status after error:`, {
                        hasKey: !!keyAfterError,
                        hasKeyChanged: keyAfterError !== encryptionKey
                    });

                    // If the key is gone, show unlock modal
                    if (!keyAfterError) {
                        console.error('❌ Encryption key lost during decryption. User needs to unlock vault again.');
                        toast.error('Your session has expired. Please unlock your vault again.');
                        setShowUnlockModal(true);
                        return;
                    }

                    // Continue with other items even if one fails
                    toast.error(`Failed to decrypt item: ${item.itemType}`);
                }
            }

            setVaultItems(decryptedItems);
            console.log(`✅ Successfully decrypted ${decryptedItems.length} out of ${encryptedItems.length} vault items`);

        } catch (error) {
            console.error('❌ Failed to load vault items:', error);
            toast.error('Failed to load vault items');
        }
    };

    // Create new vault
    const createVault = async () => {
        if (!newVaultName.trim()) return;

        try {
            setIsCreatingVault(true);
            const vaultData: ClientVaultData = {
                name: newVaultName.trim(),
                description: `Personal vault created on ${new Date().toLocaleDateString()}`
            };
            await offlineVaultService.createVault(vaultData);
            setNewVaultName('');
            setShowCreateVaultForm(false);
            await loadVaults();
            toast.success('Vault created successfully');
        } catch (error) {
            console.error('Failed to create vault:', error);
            toast.error('Failed to create vault');
        } finally {
            setIsCreatingVault(false);
        }
    };

    // Handle item created
    const handleItemCreated = async () => {
        if (selectedVault) {
            await loadVaultItems(selectedVault);
        }
    };

    // Copy to clipboard utility
    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied to clipboard`);
        } catch (error) {
            toast.error('Failed to copy to clipboard');
        }
    };

    // Toggle password visibility
    const togglePasswordVisibility = (itemId: string) => {
        setShowPasswords(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Get item type display with icon
    const getItemTypeDisplay = (itemType: string, title: string) => {
        console.log('🔍 getItemTypeDisplay called with itemType:', itemType, 'title:', title);

        // Map legacy item types to new enum values
        const itemTypeMapping: Record<string, VaultItemType> = {
            'Password': VaultItemType.LOGIN,
            'Login': VaultItemType.LOGIN,
            'login': VaultItemType.LOGIN,
            'Note': VaultItemType.SECURE_NOTE,
            'SecureNote': VaultItemType.SECURE_NOTE,
            'secure_note': VaultItemType.SECURE_NOTE,
            'CreditCard': VaultItemType.CREDIT_CARD,
            'credit_card': VaultItemType.CREDIT_CARD,
            'Identity': VaultItemType.IDENTITY,
            'identity': VaultItemType.IDENTITY,
            'SSHKey': VaultItemType.SSH_KEY,
            'ssh_key': VaultItemType.SSH_KEY,
            'APIKey': VaultItemType.API_KEY,
            'api_key': VaultItemType.API_KEY,
            'SoftwareLicense': VaultItemType.SOFTWARE_LICENSE,
            'software_license': VaultItemType.SOFTWARE_LICENSE,
        };

        // Get the mapped item type or use the original
        const mappedItemType = itemTypeMapping[itemType] || itemType as VaultItemType;
        console.log('🔄 Mapped itemType:', itemType, '->', mappedItemType);

        try {
            const config = getItemTypeConfig(mappedItemType);
            console.log('✅ Found config for:', mappedItemType, config);

            const IconComponent = config.icon;

            return {
                icon: IconComponent,
                color: config.color,
                name: config.name
            };
        } catch (error) {
            console.error('❌ Failed to get config for itemType:', itemType, 'mappedItemType:', mappedItemType, 'error:', error);

            // Fallback for unknown item types
            return {
                icon: KeyIcon,
                color: 'bg-gray-500',
                name: itemType || 'Unknown'
            };
        }
    };

    // Handle item click
    const handleItemClick = (item: DecryptedVaultItem) => {
        setSelectedItem(item);
        setShowItemDetailModal(true);
    };

    // Handle close item detail
    const handleCloseItemDetail = () => {
        setSelectedItem(null);
        setShowItemDetailModal(false);
    };

    // Handle vault unlocked
    const handleVaultUnlocked = async () => {
        setShowUnlockModal(false);
        await loadVaults();
    };

    // Delete vault
    const deleteVault = async (vaultId: string) => {
        try {
            await offlineVaultService.deleteVault(vaultId);

            // Reset selection if deleted vault was selected
            if (selectedVault === vaultId) {
                setSelectedVault(null);
                setVaultItems([]);
            }

            // Reload vaults
            await loadVaults();
            toast.success('Vault deleted successfully');
        } catch (error) {
            console.error('Failed to delete vault:', error);
            toast.error('Failed to delete vault');
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    // Get category counts
    const getCategoryCounts = () => {
        const counts: Record<string, number> = {};
        sidebarCategories.forEach(category => {
            counts[category.id] = category.filter(vaultItems).length;
        });
        return counts;
    };

    const categoryCounts = getCategoryCounts();

    // Toggle favorite status
    const toggleFavorite = async (vaultId: string, itemId: string, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        try {
            await offlineVaultService.toggleFavorite(vaultId, itemId);
            // Reload items to reflect the change
            await loadVaultItems(vaultId);
            toast.success('Favorite status updated');
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            toast.error('Failed to update favorite status');
        }
    };

    // Delete item
    const deleteItem = async (itemId: string) => {
        try {
            if (!selectedVault) return;

            await offlineVaultService.deleteVaultItem(selectedVault, itemId);

            // Close modal and reload items
            setShowItemDetailModal(false);
            setSelectedItem(null);
            await loadVaultItems(selectedVault);
            toast.success('Item deleted successfully');
        } catch (error) {
            console.error('Failed to delete item:', error);
            toast.error('Failed to delete item');
        } finally {
            setShowDeleteItemConfirm(null);
        }
    };

    // Edit item
    const editItem = () => {
        if (selectedItem) {
            setShowItemDetailModal(false);
            setShowEditItemModal(true);
        }
    };

    // Handle item updated
    const handleItemUpdated = async () => {
        if (selectedVault) {
            await loadVaultItems(selectedVault);
            // Update the selected item with fresh data
            if (selectedItem) {
                const updatedItems = await offlineVaultService.getVaultItems(selectedVault);
                const updatedItem = updatedItems.find(item => item.id === selectedItem.item.id);
                if (updatedItem) {
                    const decryptedData = await offlineVaultService.decryptData<ClientVaultItemData>(updatedItem.encryptedData);
                    setSelectedItem({ item: updatedItem, decryptedData });
                }
            }
        }
    };

    // Handle close edit modal
    const handleCloseEditModal = () => {
        setShowEditItemModal(false);
        setShowItemDetailModal(true);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading your encrypted vault...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Unlock Vault Modal */}
            <UnlockVaultModal
                isOpen={showUnlockModal}
                onUnlock={handleVaultUnlocked}
            />

            {/* Add Item Modal */}
            {selectedVault && (
                <AddItemModal
                    isOpen={showAddItemModal}
                    onClose={() => setShowAddItemModal(false)}
                    vaultId={selectedVault}
                    onItemCreated={handleItemCreated}
                />
            )}

            {/* Item Detail Modal */}
            {selectedItem && (
                <ItemDetailModal
                    isOpen={showItemDetailModal}
                    onClose={handleCloseItemDetail}
                    item={selectedItem.item}
                    decryptedData={selectedItem.decryptedData}
                    onToggleFavorite={() => {
                        if (selectedVault && selectedItem) {
                            toggleFavorite(selectedVault, selectedItem.item.id);
                        }
                    }}
                    onEdit={editItem}
                    onDelete={() => setShowDeleteItemConfirm(selectedItem.item.id)}
                />
            )}

            {/* Edit Item Modal */}
            {selectedItem && selectedVault && (
                <EditItemModal
                    isOpen={showEditItemModal}
                    onClose={handleCloseEditModal}
                    vaultId={selectedVault}
                    item={selectedItem.item}
                    decryptedData={selectedItem.decryptedData}
                    onItemUpdated={handleItemUpdated}
                />
            )}

            {/* Delete Vault Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Delete Vault
                            </h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this vault? This action cannot be undone and all items in the vault will be permanently deleted.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteVault(showDeleteConfirm)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete Vault
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Item Confirmation Modal */}
            {showDeleteItemConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Delete Item
                            </h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this item? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteItemConfirm(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteItem(showDeleteItemConfirm)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
                {/* Sidebar - Mobile: Overlay, Desktop: Fixed */}
                <div className={`
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 
                    w-full sm:w-80 lg:w-64 xl:w-72
                    bg-white dark:bg-gray-800 
                    border-r border-gray-200 dark:border-gray-700 
                    transition-transform duration-300 ease-in-out
                    flex flex-col
                    lg:max-w-xs
                `}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                    PassFort
                                </h1>
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="lg:hidden p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Vault Selector */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Vaults</h3>
                            <button
                                onClick={() => setShowCreateVaultForm(true)}
                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Create new vault"
                            >
                                <FolderPlusIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Create Vault Form */}
                        {showCreateVaultForm && (
                            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <input
                                    type="text"
                                    placeholder="Vault name"
                                    value={newVaultName}
                                    onChange={(e) => setNewVaultName(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                                    autoFocus
                                />
                                <div className="flex space-x-2">
                                    <button
                                        onClick={createVault}
                                        disabled={!newVaultName.trim() || isCreatingVault}
                                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCreatingVault ? 'Creating...' : 'Create'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCreateVaultForm(false);
                                            setNewVaultName('');
                                        }}
                                        disabled={isCreatingVault}
                                        className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            {vaults.map((vaultData) => (
                                <div key={vaultData.vault.id} className="relative">
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => {
                                                setSelectedVault(vaultData.vault.id);
                                                loadVaultItems(vaultData.vault.id);
                                                setSelectedCategory('all');
                                                // Auto-close sidebar on mobile after selection
                                                if (window.innerWidth < 1024) {
                                                    setIsSidebarOpen(false);
                                                }
                                            }}
                                            className={`flex-1 text-left p-2 rounded-md text-sm transition-colors ${selectedVault === vaultData.vault.id
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <FolderIcon className="h-4 w-4" />
                                                <span className="truncate">{vaultData.decryptedName}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {vaultData.vault.itemCount}
                                                </span>
                                            </div>
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowVaultMenu(showVaultMenu === vaultData.vault.id ? null : vaultData.vault.id);
                                                }}
                                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <EllipsisVerticalIcon className="h-4 w-4" />
                                            </button>

                                            {showVaultMenu === vaultData.vault.id && (
                                                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowDeleteConfirm(vaultData.vault.id);
                                                            setShowVaultMenu(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                    >
                                                        Delete Vault
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex-1 p-4">
                        <div className="space-y-1">
                            {sidebarCategories.map((category) => {
                                const IconComponent = category.icon;
                                const count = categoryCounts[category.id] || 0;

                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            setSelectedCategory(category.id);
                                            // Auto-close sidebar on mobile after selection
                                            if (window.innerWidth < 1024) {
                                                setIsSidebarOpen(false);
                                            }
                                        }}
                                        className={`w-full text-left p-2 rounded-md text-sm transition-colors flex items-center justify-between ${selectedCategory === category.id
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <IconComponent className="h-4 w-4" />
                                            <span>{category.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            >
                                {theme === 'dark' ? (
                                    <SunIcon className="h-5 w-5" />
                                ) : (
                                    <MoonIcon className="h-5 w-5" />
                                )}
                            </button>
                            <button
                                onClick={() => navigate('/settings')}
                                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Settings"
                            >
                                <CogIcon className="h-5 w-5" />
                            </button>
                            <div className="flex items-center">
                                <LogoutButton />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Bar - Mobile Optimized */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
                                >
                                    <Bars3Icon className="h-5 w-5" />
                                </button>

                                {/* Search - Full width on mobile */}
                                <div className="relative flex-1 max-w-none lg:max-w-md">
                                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search in all vaults"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 w-full"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setShowAddItemModal(true)}
                                    leftIcon={<PlusIcon className="h-4 w-4" />}
                                    disabled={!selectedVault}
                                    className="hidden sm:flex"
                                >
                                    New Item
                                </Button>
                                {/* Mobile: Icon only button */}
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setShowAddItemModal(true)}
                                    disabled={!selectedVault}
                                    className="sm:hidden p-2"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Items List - Full width, mobile optimized */}
                    <div className="flex-1 overflow-y-auto">
                        {selectedVault ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredItems.length === 0 ? (
                                    <div className="text-center py-12 px-4">
                                        <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">
                                            {searchTerm ? 'No items match your search' : 'No items in this category'}
                                        </p>
                                        {!searchTerm && selectedCategory === 'all' && (
                                            <Button
                                                variant="primary"
                                                className="mt-4"
                                                onClick={() => setShowAddItemModal(true)}
                                                leftIcon={<PlusIcon className="h-5 w-5" />}
                                            >
                                                Add Your First Item
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    filteredItems.map(({ item, decryptedData }) => {
                                        const typeDisplay = getItemTypeDisplay(item.itemType, decryptedData.title);
                                        const IconComponent = typeDisplay.icon;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleItemClick({ item, decryptedData })}
                                                className="group px-3 sm:px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    {/* Item Icon */}
                                                    <div className={`p-2 rounded-lg ${typeDisplay.color} flex-shrink-0`}>
                                                        <IconComponent className="h-4 w-4 text-white" />
                                                    </div>

                                                    {/* Item Info - Better mobile layout */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2">
                                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {decryptedData.title || 'Untitled'}
                                                            </h3>
                                                            {item.isFavorite && (
                                                                <StarIconSolid className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 space-y-1 sm:space-y-0">
                                                            {decryptedData.username && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    {decryptedData.username}
                                                                </span>
                                                            )}
                                                            {decryptedData.url && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    {decryptedData.url}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions - Mobile optimized */}
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                                                        {/* Favorite Toggle */}
                                                        <button
                                                            onClick={(e) => toggleFavorite(selectedVault!, item.id, e)}
                                                            className={`p-1.5 rounded-md transition-colors ${item.isFavorite
                                                                ? 'text-yellow-500 hover:text-yellow-600'
                                                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                                } hover:bg-gray-100 dark:hover:bg-gray-600`}
                                                            title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                                        >
                                                            {item.isFavorite ? (
                                                                <StarIconSolid className="h-3 w-3" />
                                                            ) : (
                                                                <StarIcon className="h-3 w-3" />
                                                            )}
                                                        </button>
                                                        {/* Hide copy buttons on very small screens */}
                                                        <div className="hidden sm:flex items-center space-x-1">
                                                            {decryptedData.username && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        copyToClipboard(decryptedData.username!, 'Username');
                                                                    }}
                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                                    title="Copy username"
                                                                >
                                                                    <UserIcon className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                            {decryptedData.password && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        copyToClipboard(decryptedData.password!, 'Password');
                                                                    }}
                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                                    title="Copy password"
                                                                >
                                                                    <KeyIcon className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-4">
                                <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    Select a vault to view your items
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}; 