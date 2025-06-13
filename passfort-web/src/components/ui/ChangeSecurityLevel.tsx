import React from 'react';
import { SecurityLevel } from '../../utils/crypto';

interface ChangeSecurityLevelProps {
    currentSecurityLevel: SecurityLevel;
    onSecurityLevelChanged: (newLevel: SecurityLevel) => void;
    onCancel: () => void;
}

export const ChangeSecurityLevel: React.FC<ChangeSecurityLevelProps> = ({
    onCancel
}) => {


    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Security Level Configuration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    PassFort now uses a fixed security level for optimal protection and consistency.
                </p>
            </div>

            {/* Fixed Security Level Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl text-white">🔒</span>
                    </div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Security Level: Balanced (Fixed)
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                        All accounts now use the optimal BALANCED security level for consistency and reliability.
                    </p>
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <div>SCRYPT N=16,384 | Memory: ~17MB | Time: ~336ms</div>
                    </div>
                </div>
            </div>

            {/* Benefits */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    ✅ Benefits of Fixed Security Level
                </h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>• Prevents vault decryption issues</li>
                    <li>• Consistent encryption across all devices</li>
                    <li>• OWASP-compliant security standards</li>
                    <li>• Simplified user experience</li>
                </ul>
            </div>

            {/* Explanation */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                    ℹ️ Why This Change?
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    Multiple security levels previously caused critical issues where users couldn't decrypt their vaults
                    after changing security levels. The fixed BALANCED level ensures all vaults remain accessible while
                    maintaining strong cryptographic protection.
                </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                    Back to Settings
                </button>
            </div>
        </div>
    );
}; 