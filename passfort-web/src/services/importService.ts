// Zero-Knowledge Import Service for PassFort Password Manager
// Supports imports from: 1Password, Bitwarden, LastPass, Dashlane, KeePass, Chrome/Edge browsers

import { vaultService, type ClientVaultData, type ClientVaultItemData } from './vaultService';
import { SecureKeyManager } from '../utils/crypto';
import { VaultItemType } from '../types/vault';
import toast from 'react-hot-toast';
import JSZip from 'jszip';

export interface ImportProgress {
    stage: 'parsing' | 'validating' | 'encrypting' | 'importing' | 'complete';
    progress: number;
    message: string;
    itemsProcessed?: number;
    totalItems?: number;
}

export interface ImportResult {
    success: boolean;
    importedItems: number;
    skippedItems: number;
    errors: string[];
    summary: {
        logins: number;
        secureNotes: number;
        identities: number;
        creditCards: number;
        sshKeys: number;
        apiKeys: number;
        softwareLicenses: number;
    };
}

export interface ImportOptions {
    createNewVault?: boolean;
    vaultName?: string;
    vaultId?: string;
    skipDuplicates?: boolean;
    mergeStrategy?: 'skip' | 'overwrite' | 'create_copy';
}

// Supported import formats
export enum ImportFormat {
    BITWARDEN_JSON = 'bitwarden_json',
    ONEPASSWORD_1PUX = '1password_1pux',
    LASTPASS_CSV = 'lastpass_csv',
    DASHLANE_JSON = 'dashlane_json',
    KEEPASS_CSV = 'keepass_csv',
    CHROME_CSV = 'chrome_csv',
    EDGE_CSV = 'edge_csv',
    FIREFOX_CSV = 'firefox_csv',
    GENERIC_CSV = 'generic_csv'
}

// Format configurations
export const IMPORT_FORMAT_CONFIGS = {
    [ImportFormat.BITWARDEN_JSON]: {
        name: 'Bitwarden (JSON)',
        description: 'Export from Bitwarden vault in JSON format',
        fileExtensions: ['.json'],
        icon: '🔐',
        instructions: 'In Bitwarden: Go to Settings → Export Vault → File Format: .json → Export Vault'
    },
    [ImportFormat.ONEPASSWORD_1PUX]: {
        name: '1Password (1PUX)',
        description: '1Password unencrypted export format',
        fileExtensions: ['.1pux', '.json'],
        icon: '🔑',
        instructions: 'In 1Password: File → Export → Unencrypted Format → Save as .1pux'
    },
    [ImportFormat.LASTPASS_CSV]: {
        name: 'LastPass (CSV)',
        description: 'Export from LastPass in CSV format',
        fileExtensions: ['.csv'],
        icon: '🔴',
        instructions: 'In LastPass: Vault → Advanced Options → Export → Save as CSV'
    },
    [ImportFormat.DASHLANE_JSON]: {
        name: 'Dashlane (JSON)',
        description: 'Export from Dashlane in JSON format',
        fileExtensions: ['.json'],
        icon: '🟢',
        instructions: 'In Dashlane: Settings → Export Data → Unencrypted JSON → Download'
    },
    [ImportFormat.KEEPASS_CSV]: {
        name: 'KeePass (CSV)',
        description: 'Export from KeePass database as CSV',
        fileExtensions: ['.csv'],
        icon: '🔒',
        instructions: 'In KeePass: Database → Export → CSV Format → Export'
    },
    [ImportFormat.CHROME_CSV]: {
        name: 'Chrome Passwords (CSV)',
        description: 'Export saved passwords from Google Chrome',
        fileExtensions: ['.csv'],
        icon: '🌐',
        instructions: 'In Chrome: Settings → Passwords → Export passwords → Save as CSV'
    },
    [ImportFormat.EDGE_CSV]: {
        name: 'Edge Passwords (CSV)',
        description: 'Export saved passwords from Microsoft Edge',
        fileExtensions: ['.csv'],
        icon: '🌍',
        instructions: 'In Edge: Settings → Passwords → Export passwords → Save as CSV'
    },
    [ImportFormat.FIREFOX_CSV]: {
        name: 'Firefox Passwords (CSV)',
        description: 'Export saved passwords from Mozilla Firefox',
        fileExtensions: ['.csv'],
        icon: '🦊',
        instructions: 'In Firefox: about:logins → Menu (⋯) → Export Logins → Save as CSV'
    },
    [ImportFormat.GENERIC_CSV]: {
        name: 'Generic CSV',
        description: 'Import from any CSV with title,username,password,url,notes columns',
        fileExtensions: ['.csv'],
        icon: '📊',
        instructions: 'CSV should have columns: title,username,password,url,notes (header row required)'
    }
};

class ImportService {
    private keyManager = SecureKeyManager.getInstance();

    /**
     * Auto-detect import format from file content
     */
    async detectFormat(file: File): Promise<ImportFormat | null> {
        try {
            const content = await file.text();
            const filename = file.name.toLowerCase();

            // Check file extension first
            if (filename.endsWith('.1pux')) {
                return ImportFormat.ONEPASSWORD_1PUX;
            }

            if (filename.endsWith('.csv')) {
                // Analyze CSV headers to determine source
                const lines = content.split('\n');
                const headers = lines[0]?.toLowerCase();

                if (headers?.includes('url,username,password,extra,name,grouping,fav')) {
                    return ImportFormat.LASTPASS_CSV;
                }
                if (headers?.includes('name,url,username,password')) {
                    return ImportFormat.CHROME_CSV;
                }
                if (headers?.includes('url,username,password,hostname,encrypted_username,encrypted_password')) {
                    return ImportFormat.FIREFOX_CSV;
                }
                if (headers?.includes('account,login_name,password,web_site,comments')) {
                    return ImportFormat.KEEPASS_CSV;
                }
                // Generic CSV fallback
                return ImportFormat.GENERIC_CSV;
            }

            if (filename.endsWith('.json')) {
                const data = JSON.parse(content);

                // Bitwarden format detection
                if (data.encrypted === false && data.items && Array.isArray(data.items)) {
                    return ImportFormat.BITWARDEN_JSON;
                }

                // 1Password format detection
                if (data.accounts && data.vaults) {
                    return ImportFormat.ONEPASSWORD_1PUX;
                }

                // Dashlane format detection
                if (data.CREDENTIALS || data.SECURENOTES || data.PAYMENTS) {
                    return ImportFormat.DASHLANE_JSON;
                }
            }

            return null;
        } catch (error) {
            console.error('Format detection failed:', error);
            return null;
        }
    }

    /** 
     * Import data from file
     */
    async importFromFile(
        file: File,
        format: ImportFormat,
        options: ImportOptions,
        onProgress?: (progress: ImportProgress) => void
    ): Promise<ImportResult> {
        const encryptionKey = this.keyManager.getEncryptionKey();
        if (!encryptionKey) {
            throw new Error('Encryption key not available. Please log in again.');
        }

        onProgress?.({
            stage: 'parsing',
            progress: 0,
            message: 'Reading import file...'
        });

        try {
            let parsedItems: ParsedItem[] = [];

            // Parse based on format
            switch (format) {
                case ImportFormat.BITWARDEN_JSON:
                    const jsonContent = await file.text();
                    parsedItems = await this.parseBitwardenJSON(jsonContent);
                    break;
                case ImportFormat.ONEPASSWORD_1PUX:
                    // 1PUX files are ZIP archives, so read as ArrayBuffer
                    const buffer = await file.arrayBuffer();
                    parsedItems = await this.parse1PasswordZIP(buffer);
                    break;
                case ImportFormat.LASTPASS_CSV:
                    const lastpassContent = await file.text();
                    parsedItems = await this.parseLastPassCSV(lastpassContent);
                    break;
                case ImportFormat.DASHLANE_JSON:
                    const dashlaneContent = await file.text();
                    parsedItems = await this.parseDashlaneJSON(dashlaneContent);
                    break;
                case ImportFormat.KEEPASS_CSV:
                    const keepassContent = await file.text();
                    parsedItems = await this.parseKeePassCSV(keepassContent);
                    break;
                case ImportFormat.CHROME_CSV:
                case ImportFormat.EDGE_CSV:
                    const chromeContent = await file.text();
                    parsedItems = await this.parseChromeEdgeCSV(chromeContent);
                    break;
                case ImportFormat.FIREFOX_CSV:
                    const firefoxContent = await file.text();
                    parsedItems = await this.parseFirefoxCSV(firefoxContent);
                    break;
                case ImportFormat.GENERIC_CSV:
                    const genericContent = await file.text();
                    parsedItems = await this.parseGenericCSV(genericContent);
                    break;
                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }

            onProgress?.({
                stage: 'validating',
                progress: 20,
                message: `Validating ${parsedItems.length} items...`,
                totalItems: parsedItems.length
            });

            // Validate and filter items
            const validItems = parsedItems.filter(item => this.validateParsedItem(item));

            onProgress?.({
                stage: 'encrypting',
                progress: 40,
                message: 'Preparing vault...'
            });

            // Get or create target vault
            let targetVaultId = options.vaultId;
            if (options.createNewVault || !targetVaultId) {
                const vaultName = options.vaultName || `Imported ${new Date().toLocaleDateString()}`;
                const newVault = await vaultService.createVault({
                    name: vaultName,
                    description: `Imported from ${IMPORT_FORMAT_CONFIGS[format].name}`
                });
                targetVaultId = newVault.id;
            }

            if (!targetVaultId) {
                throw new Error('No target vault specified');
            }

            // Import items with progress tracking
            const result = await this.importItems(validItems, targetVaultId, options, onProgress);

            onProgress?.({
                stage: 'complete',
                progress: 100,
                message: `Import completed! ${result.importedItems} items imported.`
            });

            return result;

        } catch (error: any) {
            console.error('Import failed:', error);
            throw new Error(`Import failed: ${error.message}`);
        }
    }

    /**
     * Parse Bitwarden JSON export
     */
    private async parseBitwardenJSON(content: string): Promise<ParsedItem[]> {
        const data = JSON.parse(content);
        const items: ParsedItem[] = [];

        if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid Bitwarden export format');
        }

        for (const item of data.items) {
            switch (item.type) {
                case 1: // Login
                    if (item.login) {
                        items.push({
                            type: VaultItemType.LOGIN,
                            title: item.name || 'Untitled Login',
                            data: {
                                username: item.login.username || '',
                                password: item.login.password || '',
                                url: item.login.uris?.[0]?.uri || '',
                                totp: item.login.totp || '',
                                notes: item.notes || ''
                            }
                        });
                    }
                    break;
                case 2: // Secure Note
                    items.push({
                        type: VaultItemType.SECURE_NOTE,
                        title: item.name || 'Untitled Note',
                        data: {
                            content: item.notes || '',
                            notes: ''
                        }
                    });
                    break;
                case 3: // Card
                    if (item.card) {
                        items.push({
                            type: VaultItemType.CREDIT_CARD,
                            title: item.name || 'Untitled Card',
                            data: {
                                cardholderName: item.card.cardholderName || '',
                                number: item.card.number || '',
                                expiryMonth: item.card.expMonth || '',
                                expiryYear: item.card.expYear || '',
                                cvv: item.card.code || '',
                                notes: item.notes || ''
                            }
                        });
                    }
                    break;
                case 4: // Identity
                    if (item.identity) {
                        items.push({
                            type: VaultItemType.IDENTITY,
                            title: item.name || 'Untitled Identity',
                            data: {
                                firstName: item.identity.firstName || '',
                                lastName: item.identity.lastName || '',
                                email: item.identity.email || '',
                                phone: item.identity.phone || '',
                                address: item.identity.address1 || '',
                                city: item.identity.city || '',
                                state: item.identity.state || '',
                                postalCode: item.identity.postalCode || '',
                                country: item.identity.country || '',
                                passportNumber: item.identity.passportNumber || '',
                                driverLicenseNumber: item.identity.licenseNumber || '',
                                socialSecurityNumber: item.identity.ssn || '',
                                notes: item.notes || ''
                            }
                        });
                    }
                    break;
            }
        }

        return items;
    }

    /**
     * Parse 1Password 1PUX export (ZIP archive or JSON)
     */
    private async parse1PasswordJSON(content: string): Promise<ParsedItem[]> {
        try {
            // First try to parse as JSON (for legacy exports)
            const data = JSON.parse(content);
            return this.parse1PasswordDataJSON(data);
        } catch (jsonError) {
            // If JSON parsing fails, it might be a ZIP file that was read as text
            throw new Error('Invalid 1Password JSON format. For 1PUX files, please use the 1PUX format option.');
        }
    }

    /**
 * Parse 1Password 1PUX ZIP file
 */
    private async parse1PasswordZIP(buffer: ArrayBuffer): Promise<ParsedItem[]> {
        try {
            const zip = await JSZip.loadAsync(buffer);

            // Look for export.data file in the ZIP
            const exportDataFile = zip.file('export.data');
            if (!exportDataFile) {
                throw new Error('No export.data file found in 1PUX archive');
            }

            // Read and parse the export.data JSON file
            const exportDataContent = await exportDataFile.async('text');
            const data = JSON.parse(exportDataContent);

            return this.parse1PasswordDataJSON(data);

        } catch (error: any) {
            console.error('Failed to parse 1PUX ZIP file:', error);
            throw new Error(`Failed to parse 1PUX file: ${error.message}`);
        }
    }

    /**
     * Parse 1Password JSON data structure
     */
    private parse1PasswordDataJSON(data: any): ParsedItem[] {
        const items: ParsedItem[] = [];

        // Handle both direct vault structure and accounts structure
        let vaults = data.vaults;
        if (data.accounts && Array.isArray(data.accounts)) {
            // Extract vaults from accounts structure
            vaults = [];
            for (const account of data.accounts) {
                if (account.vaults && Array.isArray(account.vaults)) {
                    vaults.push(...account.vaults);
                }
            }
        }

        if (!vaults || !Array.isArray(vaults)) {
            throw new Error('Invalid 1Password export format - no vaults found');
        }

        for (const vault of vaults) {
            if (vault.items && Array.isArray(vault.items)) {
                for (const item of vault.items) {
                    // Skip archived items
                    if (item.state === 'archived') {
                        continue;
                    }

                    switch (item.categoryUuid) {
                        case '001': // Login
                            const loginData = this.extract1PasswordFields(item, ['username', 'password', 'website']);
                            items.push({
                                type: VaultItemType.LOGIN,
                                title: item.overview?.title || 'Untitled Login',
                                data: {
                                    username: loginData.username || '',
                                    password: loginData.password || '',
                                    url: loginData.website || item.overview?.url || '',
                                    notes: item.details?.notesPlain || ''
                                }
                            });
                            break;
                        case '005': // Password (treat as secure note)
                            items.push({
                                type: VaultItemType.SECURE_NOTE,
                                title: item.overview?.title || 'Untitled Note',
                                data: {
                                    content: item.details?.notesPlain || '',
                                    notes: ''
                                }
                            });
                            break;
                        case '002': // Credit Card
                            const cardData = this.extract1PasswordFields(item, ['cardholder', 'ccnum', 'expiry', 'cvv']);
                            items.push({
                                type: VaultItemType.CREDIT_CARD,
                                title: item.overview?.title || 'Untitled Card',
                                data: {
                                    cardholderName: cardData.cardholder || '',
                                    number: cardData.ccnum || '',
                                    expiryDate: cardData.expiry || '',
                                    cvv: cardData.cvv || '',
                                    notes: item.details?.notesPlain || ''
                                }
                            });
                            break;
                        case '004': // Identity
                            const identityData = this.extract1PasswordFields(item, [
                                'firstname', 'lastname', 'email', 'cellphone',
                                'address', 'city', 'state', 'zip', 'country'
                            ]);
                            items.push({
                                type: VaultItemType.IDENTITY,
                                title: item.overview?.title || 'Untitled Identity',
                                data: {
                                    firstName: identityData.firstname || '',
                                    lastName: identityData.lastname || '',
                                    email: identityData.email || '',
                                    phone: identityData.cellphone || '',
                                    address: identityData.address || '',
                                    city: identityData.city || '',
                                    state: identityData.state || '',
                                    postalCode: identityData.zip || '',
                                    country: identityData.country || '',
                                    notes: item.details?.notesPlain || ''
                                }
                            });
                            break;
                        case '100': // Secure Note
                            items.push({
                                type: VaultItemType.SECURE_NOTE,
                                title: item.overview?.title || 'Untitled Note',
                                data: {
                                    content: item.details?.notesPlain || '',
                                    notes: ''
                                }
                            });
                            break;
                    }
                }
            }
        }

        return items;
    }

    /**
     * Parse LastPass CSV export
     */
    private async parseLastPassCSV(content: string): Promise<ParsedItem[]> {
        const lines = content.split('\n');
        const items: ParsedItem[] = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseCSVLine(line);
            if (cols.length >= 5) {
                items.push({
                    type: VaultItemType.LOGIN,
                    title: cols[4] || 'Untitled Login', // name
                    data: {
                        url: cols[0] || '',
                        username: cols[1] || '',
                        password: cols[2] || '',
                        notes: cols[3] || ''
                    }
                });
            }
        }

        return items;
    }

    /**
     * Parse Chrome/Edge CSV export
     */
    private async parseChromeEdgeCSV(content: string): Promise<ParsedItem[]> {
        const lines = content.split('\n');
        const items: ParsedItem[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseCSVLine(line);
            if (cols.length >= 4) {
                items.push({
                    type: VaultItemType.LOGIN,
                    title: cols[0] || 'Untitled Login', // name
                    data: {
                        url: cols[1] || '',
                        username: cols[2] || '',
                        password: cols[3] || '',
                        notes: ''
                    }
                });
            }
        }

        return items;
    }

    /**
     * Parse Firefox CSV export
     */
    private async parseFirefoxCSV(content: string): Promise<ParsedItem[]> {
        const lines = content.split('\n');
        const items: ParsedItem[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseCSVLine(line);
            if (cols.length >= 3) {
                const hostname = cols[3] || cols[0] || '';
                items.push({
                    type: VaultItemType.LOGIN,
                    title: hostname ? this.extractDomainFromUrl(hostname) : 'Untitled Login',
                    data: {
                        url: cols[0] || '',
                        username: cols[1] || '',
                        password: cols[2] || '',
                        notes: ''
                    }
                });
            }
        }

        return items;
    }

    /**
     * Parse KeePass CSV export
     */
    private async parseKeePassCSV(content: string): Promise<ParsedItem[]> {
        const lines = content.split('\n');
        const items: ParsedItem[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseCSVLine(line);
            if (cols.length >= 4) {
                items.push({
                    type: VaultItemType.LOGIN,
                    title: cols[0] || 'Untitled Login', // account
                    data: {
                        username: cols[1] || '', // login_name
                        password: cols[2] || '',
                        url: cols[3] || '', // web_site
                        notes: cols[4] || '' // comments
                    }
                });
            }
        }

        return items;
    }

    /**
     * Parse Dashlane JSON export
     */
    private async parseDashlaneJSON(content: string): Promise<ParsedItem[]> {
        const data = JSON.parse(content);
        const items: ParsedItem[] = [];

        // Parse credentials (logins)
        if (data.CREDENTIALS && Array.isArray(data.CREDENTIALS)) {
            for (const cred of data.CREDENTIALS) {
                items.push({
                    type: VaultItemType.LOGIN,
                    title: cred.title || cred.domain || 'Untitled Login',
                    data: {
                        username: cred.username || cred.email || '',
                        password: cred.password || '',
                        url: cred.domain || '',
                        notes: cred.note || ''
                    }
                });
            }
        }

        // Parse secure notes
        if (data.SECURENOTES && Array.isArray(data.SECURENOTES)) {
            for (const note of data.SECURENOTES) {
                items.push({
                    type: VaultItemType.SECURE_NOTE,
                    title: note.title || 'Untitled Note',
                    data: {
                        content: note.content || '',
                        notes: ''
                    }
                });
            }
        }

        // Parse payment methods (credit cards)
        if (data.PAYMENTS && Array.isArray(data.PAYMENTS)) {
            for (const payment of data.PAYMENTS) {
                items.push({
                    type: VaultItemType.CREDIT_CARD,
                    title: payment.name || 'Untitled Card',
                    data: {
                        cardholderName: payment.ownerName || '',
                        number: payment.cardNumber || '',
                        expiryMonth: payment.expireMonth || '',
                        expiryYear: payment.expireYear || '',
                        cvv: payment.securityCode || '',
                        notes: ''
                    }
                });
            }
        }

        return items;
    }

    /**
     * Parse generic CSV (title,username,password,url,notes)
     */
    private async parseGenericCSV(content: string): Promise<ParsedItem[]> {
        const lines = content.split('\n');
        const items: ParsedItem[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseCSVLine(line);
            if (cols.length >= 3) {
                items.push({
                    type: VaultItemType.LOGIN,
                    title: cols[0] || 'Untitled Login',
                    data: {
                        username: cols[1] || '',
                        password: cols[2] || '',
                        url: cols[3] || '',
                        notes: cols[4] || ''
                    }
                });
            }
        }

        return items;
    }

    /**
     * Import processed items into vault
     */
    private async importItems(
        items: ParsedItem[],
        vaultId: string,
        options: ImportOptions,
        onProgress?: (progress: ImportProgress) => void
    ): Promise<ImportResult> {
        const result: ImportResult = {
            success: true,
            importedItems: 0,
            skippedItems: 0,
            errors: [],
            summary: {
                logins: 0,
                secureNotes: 0,
                identities: 0,
                creditCards: 0,
                sshKeys: 0,
                apiKeys: 0,
                softwareLicenses: 0
            }
        };

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            try {
                onProgress?.({
                    stage: 'importing',
                    progress: Math.round((i / items.length) * 60) + 40,
                    message: `Importing item ${i + 1} of ${items.length}...`,
                    itemsProcessed: i,
                    totalItems: items.length
                });

                // Convert to vault item format
                const vaultItem = await this.convertToVaultItem(item, vaultId);

                // Create the item
                await vaultService.createVaultItem(vaultId, vaultItem, item.type);

                result.importedItems++;
                this.incrementSummaryCount(result.summary, item.type);

            } catch (error: any) {
                console.error(`Failed to import item "${item.title}":`, error);
                result.errors.push(`Failed to import "${item.title}": ${error.message}`);
                result.skippedItems++;
            }
        }

        return result;
    }

    /**
     * Helper methods
     */
    private extract1PasswordFields(item: any, fieldNames: string[]): Record<string, string> {
        const result: Record<string, string> = {};

        if (item.details?.fields) {
            for (const field of item.details.fields) {
                const designation = field.designation || field.name;
                if (fieldNames.includes(designation)) {
                    result[designation] = field.value || '';
                }
            }
        }

        return result;
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    private extractDomainFromUrl(url: string): string {
        try {
            const domain = new URL(url).hostname;
            return domain.replace(/^www\./, '') || url;
        } catch {
            return url;
        }
    }

    private validateParsedItem(item: ParsedItem): boolean {
        return !!(item.title && item.title.trim().length > 0);
    }

    private async convertToVaultItem(item: ParsedItem, vaultId: string): Promise<ClientVaultItemData> {
        // Convert to ClientVaultItemData structure used by vaultService
        const baseData: ClientVaultItemData = {
            title: item.title,
            notes: item.data.notes || ''
        };

        switch (item.type) {
            case VaultItemType.LOGIN:
                return {
                    ...baseData,
                    username: item.data.username || '',
                    password: item.data.password || '',
                    url: item.data.url || '',
                    customFields: item.data.totp ? { totpSecret: item.data.totp } : undefined
                };

            case VaultItemType.SECURE_NOTE:
                return {
                    ...baseData,
                    customFields: { content: item.data.content || '' }
                };

            case VaultItemType.IDENTITY:
                return {
                    ...baseData,
                    customFields: {
                        firstName: item.data.firstName || '',
                        lastName: item.data.lastName || '',
                        email: item.data.email || '',
                        phone: item.data.phone || '',
                        address: item.data.address || '',
                        city: item.data.city || '',
                        state: item.data.state || '',
                        postalCode: item.data.postalCode || '',
                        country: item.data.country || '',
                        passportNumber: item.data.passportNumber || '',
                        driverLicenseNumber: item.data.driverLicenseNumber || '',
                        socialSecurityNumber: item.data.socialSecurityNumber || ''
                    }
                };

            case VaultItemType.CREDIT_CARD:
                return {
                    ...baseData,
                    customFields: {
                        cardholderName: item.data.cardholderName || '',
                        number: item.data.number || '',
                        expiryMonth: item.data.expiryMonth || '',
                        expiryYear: item.data.expiryYear || '',
                        expiryDate: item.data.expiryDate || '',
                        cvv: item.data.cvv || ''
                    }
                };

            default:
                throw new Error(`Unsupported item type: ${item.type}`);
        }
    }

    private incrementSummaryCount(summary: ImportResult['summary'], type: VaultItemType): void {
        switch (type) {
            case VaultItemType.LOGIN:
                summary.logins++;
                break;
            case VaultItemType.SECURE_NOTE:
                summary.secureNotes++;
                break;
            case VaultItemType.IDENTITY:
                summary.identities++;
                break;
            case VaultItemType.CREDIT_CARD:
                summary.creditCards++;
                break;
            case VaultItemType.SSH_KEY:
                summary.sshKeys++;
                break;
            case VaultItemType.API_KEY:
                summary.apiKeys++;
                break;
            case VaultItemType.SOFTWARE_LICENSE:
                summary.softwareLicenses++;
                break;
        }
    }
}

// Internal types
interface ParsedItem {
    type: VaultItemType;
    title: string;
    data: Record<string, any>;
}

export const importService = new ImportService(); 