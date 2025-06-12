import React, { useState, useEffect } from 'react';
import {
    SecurityLevel,
    getSecurityLevel,
    setSecurityLevel,
    getSecurityLevels,
    detectOptimalSecurityLevel
} from '../../utils/crypto';
import { ChangeSecurityLevel } from './ChangeSecurityLevel';
import { useAuthStore } from '../../store/authStore';

interface SecuritySettingsProps {
    onSecurityLevelChange?: (level: SecurityLevel) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onSecurityLevelChange }) => {
    const { user } = useAuthStore();
    const [currentLevel, setCurrentLevel] = useState<SecurityLevel>(getSecurityLevel());
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectedLevel, setDetectedLevel] = useState<SecurityLevel | null>(null);
    const [showChangeSecurityLevel, setShowChangeSecurityLevel] = useState(false);

    const securityLevels = getSecurityLevels();

    // Use user's actual security level if available
    const userSecurityLevel = user?.securityLevel as SecurityLevel || currentLevel;

    useEffect(() => {
        // Auto-detect optimal security level on component mount
        detectOptimal();
    }, []);

    const detectOptimal = async () => {
        setIsDetecting(true);
        try {
            const optimal = await detectOptimalSecurityLevel();
            setDetectedLevel(optimal);
        } catch (error) {
            console.error('Failed to detect optimal security level:', error);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleLevelChange = (level: SecurityLevel) => {
        setSecurityLevel(level);
        setCurrentLevel(level);
        onSecurityLevelChange?.(level);
    };

    const getSecurityDescription = (level: SecurityLevel) => {
        switch (level) {
            case SecurityLevel.FAST:
                return {
                    title: 'Fast',
                    description: 'Optimized for low-end devices and quick logins',
                    recommendation: 'Good for mobile devices or frequent logins',
                    color: 'text-yellow-600 dark:text-yellow-400'
                };
            case SecurityLevel.BALANCED:
                return {
                    title: 'Balanced',
                    description: 'Good balance of security and performance',
                    recommendation: 'Recommended for most users',
                    color: 'text-blue-600 dark:text-blue-400'
                };
            case SecurityLevel.STRONG:
                return {
                    title: 'Strong',
                    description: 'Enhanced security with moderate performance impact',
                    recommendation: 'Good for security-conscious users',
                    color: 'text-green-600 dark:text-green-400'
                };
            case SecurityLevel.MAXIMUM:
                return {
                    title: 'Maximum',
                    description: 'OWASP-compliant maximum security',
                    recommendation: 'Best for high-security environments',
                    color: 'text-purple-600 dark:text-purple-400'
                };
        }
    };

    if (showChangeSecurityLevel) {
        return (
            <ChangeSecurityLevel
                currentSecurityLevel={userSecurityLevel}
                onSecurityLevelChanged={(newLevel) => {
                    setCurrentLevel(newLevel);
                    setShowChangeSecurityLevel(false);
                    onSecurityLevelChange?.(newLevel);
                }}
                onCancel={() => setShowChangeSecurityLevel(false)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Security Level Configuration
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Your account security level affects login time and protection strength.
                    </p>
                </div>
                <button
                    onClick={() => setShowChangeSecurityLevel(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Change Security Level
                </button>
            </div>

            {/* Auto-detection section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        Device Optimization
                    </h4>
                    <button
                        onClick={detectOptimal}
                        disabled={isDetecting}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isDetecting ? 'Detecting...' : 'Auto-Detect'}
                    </button>
                </div>
                {detectedLevel && (
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        Recommended for your device: <strong>{getSecurityDescription(detectedLevel).title}</strong>
                        {detectedLevel !== currentLevel && (
                            <button
                                onClick={() => handleLevelChange(detectedLevel)}
                                className="ml-2 text-blue-600 dark:text-blue-400 underline hover:no-underline"
                            >
                                Apply
                            </button>
                        )}
                    </p>
                )}
            </div>

            {/* Security level options */}
            <div className="space-y-3">
                {Object.entries(securityLevels).map(([level, config]) => {
                    const levelKey = level as SecurityLevel;
                    const description = getSecurityDescription(levelKey);
                    const isSelected = currentLevel === levelKey;
                    const isDetectedOptimal = detectedLevel === levelKey;

                    return (
                        <div
                            key={level}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            onClick={() => handleLevelChange(levelKey)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <input
                                            type="radio"
                                            checked={isSelected}
                                            onChange={() => handleLevelChange(levelKey)}
                                            className="text-blue-600"
                                        />
                                        <h4 className={`font-medium ${description.color}`}>
                                            {description.title}
                                            {isDetectedOptimal && (
                                                <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                                                    Recommended
                                                </span>
                                            )}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {description.description}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        {description.recommendation}
                                    </p>
                                </div>
                                <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4">
                                    <div>{config.memoryMiB} MiB</div>
                                    <div>~{config.estimatedMs}ms</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Current selection info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Your Account Security Level
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>Security Level: <strong>{getSecurityDescription(userSecurityLevel).title}</strong></div>
                    <div>Memory Usage: <strong>{securityLevels[userSecurityLevel].memoryMiB} MiB</strong></div>
                    <div>Estimated Login Time: <strong>~{securityLevels[userSecurityLevel].estimatedMs}ms</strong></div>
                    <div>Scrypt Parameters: <strong>N={securityLevels[userSecurityLevel].N.toLocaleString()}, r={securityLevels[userSecurityLevel].r}, p={securityLevels[userSecurityLevel].p}</strong></div>
                </div>
            </div>

            {/* Security explanation */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                    🔐 How This Protects You
                </h4>
                <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                    <p>
                        Higher security levels use more memory and CPU time, making it exponentially
                        more expensive for attackers to crack your password if they gain access to our servers.
                    </p>
                    <p>
                        <strong>Zero-Knowledge Architecture:</strong> Your master password never leaves your device.
                        Only a cryptographically derived hash is sent to our servers for authentication.
                    </p>
                </div>
            </div>
        </div>
    );
}; 