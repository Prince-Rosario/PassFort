import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { IOSInstallInstructions } from './IOSInstallInstructions';
import { MacInstallInstructions } from './MacInstallInstructions';

export const PWAInstallBanner = () => {
    const { canInstall, installApp, isInstalled, isIOS, isMac } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [showMacInstructions, setShowMacInstructions] = useState(false);

    useEffect(() => {
        // Check if user has previously dismissed the banner
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            setIsDismissed(true);
            return;
        }

        // Show banner after 3 seconds if installable
        if (canInstall && !isInstalled) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [canInstall, isInstalled]);

    const handleInstall = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
        } else if (isMac) {
            setShowMacInstructions(true);
        } else {
            await installApp();
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    if (!isVisible || isDismissed || !canInstall || isInstalled) {
        return null;
    }

    return (
        <>
            <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
                <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 border border-blue-500">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <ArrowDownTrayIcon className="h-6 w-6 text-blue-200" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium">Install PassFort</h3>
                                <p className="text-xs text-blue-100 mt-1">
                                    {isIOS
                                        ? "Add PassFort to your iPhone's home screen for quick access"
                                        : isMac
                                            ? "Add PassFort to your Mac's Dock for quick access"
                                            : "Add PassFort to your home screen for quick access and better experience"
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="flex-shrink-0 ml-2 text-blue-200 hover:text-white"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-3 flex space-x-2">
                        <button
                            onClick={handleInstall}
                            className="flex-1 bg-white text-blue-600 text-sm font-medium py-2 px-3 rounded hover:bg-blue-50 transition-colors"
                        >
                            {(isIOS || isMac) ? "Show Instructions" : "Install"}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-blue-200 text-sm font-medium py-2 px-3 hover:text-white transition-colors"
                        >
                            Not now
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Install Instructions Modal */}
            {showIOSInstructions && (
                <IOSInstallInstructions
                    onClose={() => {
                        setShowIOSInstructions(false);
                        setIsVisible(false);
                    }}
                />
            )}

            {/* Mac Install Instructions Modal */}
            {showMacInstructions && (
                <MacInstallInstructions
                    onClose={() => {
                        setShowMacInstructions(false);
                        setIsVisible(false);
                    }}
                />
            )}
        </>
    );
};

export default PWAInstallBanner; 