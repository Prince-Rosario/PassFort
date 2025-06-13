import React from 'react';
import { SecurityLevel, getSecurityLevel } from '../../utils/crypto';

interface SecuritySettingsProps {
    onSecurityLevelChange?: (level: SecurityLevel) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = () => {

    const currentLevel = getSecurityLevel();

    const getSecurityDescription = (level: SecurityLevel) => {
        switch (level) {
            case SecurityLevel.BALANCED:
                return {
                    title: 'Balanced (Fixed)',
                    description: 'Optimal balance of security and performance',
                    recommendation: 'SCRYPT N=16384, ~17MB memory, ~336ms',
                    color: 'text-blue-600 dark:text-blue-400'
                };
            default:
                return {
                    title: 'Balanced (Fixed)',
                    description: 'Optimal balance of security and performance',
                    recommendation: 'SCRYPT N=16384, ~17MB memory, ~336ms',
                    color: 'text-blue-600 dark:text-blue-400'
                };
        }
    };

    const description = getSecurityDescription(currentLevel);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Security Level
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    PassFort uses a fixed security level for optimal protection and consistency.
                </p>
            </div>

            {/* Fixed security level info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <h4 className={`font-medium ${description.color}`}>
                                {description.title}
                            </h4>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">
                            {description.description}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            {description.recommendation}
                        </p>
                    </div>
                </div>
            </div>

            {/* Security benefits */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    🔒 Security Benefits
                </h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>• Consistent encryption across all accounts</li>
                    <li>• Prevents vault decryption issues</li>
                    <li>• OWASP-compliant password hashing</li>
                    <li>• Zero-knowledge architecture maintained</li>
                </ul>
            </div>

            {/* Technical details */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Technical Details
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div><strong>Algorithm:</strong> SCRYPT</div>
                    <div><strong>Cost Parameter (N):</strong> 16,384</div>
                    <div><strong>Block Size (r):</strong> 8</div>
                    <div><strong>Parallelization (p):</strong> 1</div>
                    <div><strong>Memory Usage:</strong> ~17 MB</div>
                    <div><strong>Derivation Time:</strong> ~336ms (varies by device)</div>
                </div>
            </div>

            {/* Info message */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                    ℹ️ Why Fixed Security Level?
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    Multiple security levels previously caused vault decryption issues when users changed levels after creating vaults.
                    The fixed BALANCED level ensures all vaults remain accessible while maintaining strong security.
                </p>
            </div>
        </div>
    );
}; 