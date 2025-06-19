import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner = () => {
    const { canInstall, installApp, isInstalled } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

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
        await installApp();
        setIsVisible(false);
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
                                Add PassFort to your home screen for quick access and better experience
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
                        Install
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
    );
};

export default PWAInstallBanner; 