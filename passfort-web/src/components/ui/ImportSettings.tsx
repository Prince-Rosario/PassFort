// Import Settings Component for PassFort Password Manager

import React, { useState, useRef } from 'react';
import {
    ArrowUpTrayIcon,
    DocumentArrowUpIcon,
    InformationCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Button } from './Button';
import { useAuthStore } from '../../store/authStore';
import { vaultService } from '../../services/vaultService';
import {
    importService,
    ImportFormat,
    IMPORT_FORMAT_CONFIGS,
    type ImportProgress,
    type ImportResult,
    type ImportOptions
} from '../../services/importService';

export const ImportSettings: React.FC = () => {
    const { user } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [detectedFormat, setDetectedFormat] = useState<ImportFormat | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<ImportFormat | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [showFormatInstructions, setShowFormatInstructions] = useState<ImportFormat | null>(null);

    // Import options
    const [importOptions, setImportOptions] = useState<ImportOptions>({
        createNewVault: true,
        vaultName: '',
        vaultId: '',
        skipDuplicates: true,
        mergeStrategy: 'skip'
    });

    const [availableVaults, setAvailableVaults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Load available vaults on component mount
    React.useEffect(() => {
        loadVaults();
    }, []);

    const loadVaults = async () => {
        try {
            const vaults = await vaultService.getVaults();
            setAvailableVaults(vaults);
        } catch (error) {
            console.error('Failed to load vaults:', error);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setImportResult(null);
        setShowResults(false);

        try {
            // Auto-detect format
            const format = await importService.detectFormat(file);
            setDetectedFormat(format);
            setSelectedFormat(format);

            if (format) {
                toast.success(`Detected ${IMPORT_FORMAT_CONFIGS[format].name} format`);
            } else {
                toast('Could not auto-detect format. Please select manually.', {
                    icon: 'ℹ️',
                    duration: 4000
                });
            }
        } catch (error) {
            console.error('Format detection failed:', error);
            toast.error('Failed to read file. Please check the file format.');
            setSelectedFile(null);
        }
    };

    const handleImport = async () => {
        if (!selectedFile || !selectedFormat) {
            toast.error('Please select a file and format');
            return;
        }

        // Validate import options
        if (!importOptions.createNewVault && !importOptions.vaultId) {
            toast.error('Please select a target vault or create a new one');
            return;
        }

        if (importOptions.createNewVault && !importOptions.vaultName?.trim()) {
            setImportOptions(prev => ({
                ...prev,
                vaultName: `Imported ${new Date().toLocaleDateString()}`
            }));
        }

        setIsImporting(true);
        setImportProgress(null);
        setImportResult(null);

        try {
            const result = await importService.importFromFile(
                selectedFile,
                selectedFormat,
                importOptions,
                (progress) => {
                    setImportProgress(progress);
                }
            );

            setImportResult(result);
            setShowResults(true);

            if (result.success && result.importedItems > 0) {
                toast.success(`Import completed! ${result.importedItems} items imported`);
            } else if (result.importedItems === 0) {
                toast('No items were imported. Check the file format or content.', {
                    icon: '⚠️'
                });
            }

            // Refresh vault list
            await loadVaults();

        } catch (error: any) {
            console.error('Import failed:', error);
            toast.error(`Import failed: ${error.message}`);
            setImportResult({
                success: false,
                importedItems: 0,
                skippedItems: 0,
                errors: [error.message],
                summary: {
                    logins: 0,
                    secureNotes: 0,
                    identities: 0,
                    creditCards: 0,
                    sshKeys: 0,
                    apiKeys: 0,
                    softwareLicenses: 0
                }
            });
            setShowResults(true);
        } finally {
            setIsImporting(false);
            setImportProgress(null);
        }
    };

    const resetImport = () => {
        setSelectedFile(null);
        setDetectedFormat(null);
        setSelectedFormat(null);
        setImportResult(null);
        setShowResults(false);
        setImportProgress(null);
        setImportOptions({
            createNewVault: true,
            vaultName: '',
            vaultId: '',
            skipDuplicates: true,
            mergeStrategy: 'skip'
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const renderProgressBar = (progress: ImportProgress | null) => {
        if (!progress) return null;

        return (
            <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {progress.message}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.progress}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                    />
                </div>
                {progress.itemsProcessed !== undefined && progress.totalItems && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Processing item {progress.itemsProcessed + 1} of {progress.totalItems}
                    </p>
                )}
            </div>
        );
    };

    const renderFormatInstructions = (format: ImportFormat) => {
        const config = IMPORT_FORMAT_CONFIGS[format];

        return (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    How to export from {config.name}:
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    {config.instructions}
                </p>
            </div>
        );
    };

    const renderImportResults = () => {
        if (!showResults || !importResult) return null;

        return (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start gap-3">
                    {importResult.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}

                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Import {importResult.success ? 'Completed' : 'Failed'}
                        </h3>

                        <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p>✅ Imported: {importResult.importedItems} items</p>
                            {importResult.skippedItems > 0 && (
                                <p>⏭️ Skipped: {importResult.skippedItems} items</p>
                            )}
                        </div>

                        {/* Summary */}
                        {importResult.importedItems > 0 && (
                            <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Items by type:
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    {importResult.summary.logins > 0 && (
                                        <p>🔑 Logins: {importResult.summary.logins}</p>
                                    )}
                                    {importResult.summary.secureNotes > 0 && (
                                        <p>📝 Notes: {importResult.summary.secureNotes}</p>
                                    )}
                                    {importResult.summary.identities > 0 && (
                                        <p>👤 Identities: {importResult.summary.identities}</p>
                                    )}
                                    {importResult.summary.creditCards > 0 && (
                                        <p>💳 Cards: {importResult.summary.creditCards}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Errors */}
                        {importResult.errors.length > 0 && (
                            <div className="mt-3">
                                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                                    Errors:
                                </p>
                                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                                    {importResult.errors.slice(0, 5).map((error, index) => (
                                        <li key={index}>• {error}</li>
                                    ))}
                                    {importResult.errors.length > 5 && (
                                        <li>• ... and {importResult.errors.length - 5} more errors</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <Button
                            onClick={resetImport}
                            variant="secondary"
                            size="sm"
                            className="mt-4"
                        >
                            Import Another File
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
                <ArrowUpTrayIcon className="h-6 w-6 text-blue-600" />
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Import Data
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Import your passwords and data from other password managers
                    </p>
                </div>
            </div>

            {!showResults && (
                <>
                    {/* File Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Select Import File
                        </label>

                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                            <div className="text-center">
                                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="mt-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json,.csv,.1pux"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="import-file"
                                    />
                                    <label
                                        htmlFor="import-file"
                                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Choose File
                                    </label>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Supports JSON, CSV, and 1PUX files
                                    </p>
                                </div>
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-green-800 dark:text-green-200">
                                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Format Selection */}
                    {selectedFile && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Import Format
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(IMPORT_FORMAT_CONFIGS).map(([format, config]) => (
                                    <div key={format} className="relative">
                                        <input
                                            type="radio"
                                            id={format}
                                            name="import-format"
                                            value={format}
                                            checked={selectedFormat === format}
                                            onChange={(e) => setSelectedFormat(e.target.value as ImportFormat)}
                                            className="sr-only"
                                        />
                                        <label
                                            htmlFor={format}
                                            className={`block p-3 rounded-lg border-2 cursor-pointer transition-colors ${selectedFormat === format
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className="text-lg">{config.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {config.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {config.description}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setShowFormatInstructions(
                                                            showFormatInstructions === format ? null : format as ImportFormat
                                                        );
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                    title="Show export instructions"
                                                >
                                                    <InformationCircleIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                            {detectedFormat === format && (
                                                <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                                                    ✓ Auto-detected
                                                </div>
                                            )}
                                        </label>

                                        {showFormatInstructions === format && renderFormatInstructions(format as ImportFormat)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Import Options */}
                    {selectedFile && selectedFormat && (
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Import Options
                            </h3>

                            {/* Target Vault */}
                            <div className="space-y-3">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="vault-option"
                                        checked={importOptions.createNewVault}
                                        onChange={() => setImportOptions(prev => ({ ...prev, createNewVault: true }))}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Create new vault
                                    </span>
                                </label>

                                {importOptions.createNewVault && (
                                    <input
                                        type="text"
                                        value={importOptions.vaultName}
                                        onChange={(e) => setImportOptions(prev => ({ ...prev, vaultName: e.target.value }))}
                                        placeholder={`Imported ${new Date().toLocaleDateString()}`}
                                        className="ml-6 w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                )}

                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="vault-option"
                                        checked={!importOptions.createNewVault}
                                        onChange={() => setImportOptions(prev => ({ ...prev, createNewVault: false }))}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Import to existing vault
                                    </span>
                                </label>

                                {!importOptions.createNewVault && (
                                    <select
                                        value={importOptions.vaultId}
                                        onChange={(e) => setImportOptions(prev => ({ ...prev, vaultId: e.target.value }))}
                                        className="ml-6 w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select a vault...</option>
                                        {availableVaults.map((vault) => (
                                            <option key={vault.id} value={vault.id}>
                                                {vault.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Import Progress */}
                    {isImporting && renderProgressBar(importProgress)}

                    {/* Import Button */}
                    {selectedFile && selectedFormat && !isImporting && (
                        <div className="flex justify-end">
                            <Button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="min-w-[120px]"
                            >
                                {isImporting ? 'Importing...' : 'Start Import'}
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Import Results */}
            {renderImportResults()}
        </div>
    );
};

export default ImportSettings; 