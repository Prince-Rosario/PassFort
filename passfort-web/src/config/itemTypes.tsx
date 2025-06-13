import React from 'react';
import { VaultItemType, type ItemTypeConfig } from '../types/vault';
import {
    KeyIcon,
    CreditCardIcon,
    UserIcon,
    DocumentTextIcon,
    CommandLineIcon,
    CogIcon,
    DocumentIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
    IdentificationIcon,
    BanknotesIcon
} from '@heroicons/react/24/outline';

// Mock icons for now - we'll need to install lucide-react or use other icons
const Key: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🔑</span>;
const CreditCard: React.FC<{ className?: string }> = ({ className }) => <span className={className}>💳</span>;
const User: React.FC<{ className?: string }> = ({ className }) => <span className={className}>👤</span>;
const FileText: React.FC<{ className?: string }> = ({ className }) => <span className={className}>📄</span>;
const Terminal: React.FC<{ className?: string }> = ({ className }) => <span className={className}>💻</span>;
const Settings: React.FC<{ className?: string }> = ({ className }) => <span className={className}>⚙️</span>;
const Award: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🏆</span>;

export const ITEM_TYPE_CONFIGS: Record<VaultItemType, ItemTypeConfig> = {
    [VaultItemType.LOGIN]: {
        type: VaultItemType.LOGIN,
        name: 'Login',
        description: 'Website and app logins with usernames and passwords',
        icon: KeyIcon,
        color: 'bg-blue-500',
        fields: ['username', 'password', 'url']
    },

    [VaultItemType.SECURE_NOTE]: {
        type: VaultItemType.SECURE_NOTE,
        name: 'Secure Note',
        description: 'Private notes and sensitive text information',
        icon: DocumentTextIcon,
        color: 'bg-green-500',
        fields: ['content']
    },

    [VaultItemType.CREDIT_CARD]: {
        type: VaultItemType.CREDIT_CARD,
        name: 'Credit Card',
        description: 'Credit and debit card information',
        icon: CreditCardIcon,
        color: 'bg-purple-500',
        fields: ['cardNumber', 'expiryDate', 'cvv']
    },

    [VaultItemType.IDENTITY]: {
        type: VaultItemType.IDENTITY,
        name: 'Identity',
        description: 'Personal information, ID documents, and contacts',
        icon: IdentificationIcon,
        color: 'bg-orange-500',
        fields: ['firstName', 'lastName', 'email']
    },

    [VaultItemType.SSH_KEY]: {
        type: VaultItemType.SSH_KEY,
        name: 'SSH Key',
        description: 'SSH private keys and certificates for secure connections',
        icon: CommandLineIcon,
        color: 'bg-gray-500',
        fields: ['keyName', 'keyType', 'fingerprint']
    },

    [VaultItemType.API_KEY]: {
        type: VaultItemType.API_KEY,
        name: 'API Key',
        description: 'API keys, tokens, and service credentials',
        icon: CogIcon,
        color: 'bg-indigo-500',
        fields: ['serviceName', 'apiKey']
    },

    [VaultItemType.SOFTWARE_LICENSE]: {
        type: VaultItemType.SOFTWARE_LICENSE,
        name: 'Software License',
        description: 'Software licenses, activation keys, and product codes',
        icon: DocumentIcon,
        color: 'bg-yellow-500',
        fields: ['softwareName', 'licenseKey', 'version']
    }
};

export const getItemTypeConfig = (type: VaultItemType): ItemTypeConfig => {
    return ITEM_TYPE_CONFIGS[type];
};

export const getAllItemTypes = (): ItemTypeConfig[] => {
    return Object.values(ITEM_TYPE_CONFIGS);
}; 