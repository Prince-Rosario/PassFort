import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        // Detect platform and browser
        const detectPlatform = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const platform = window.navigator.platform.toLowerCase();

            // iOS Detection
            const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
            const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
            setIsIOS(isIOSDevice && isSafari);

            // Mac Detection  
            const isMacDevice = /mac/.test(platform) || /macintosh/.test(userAgent);
            const isMacSafari = isMacDevice && isSafari && !isIOSDevice;
            setIsMac(isMacSafari);
        };

        // Check if app is already installed
        const checkIfInstalled = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
            const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
            const isPWA = isStandalone || isFullscreen || isMinimalUI;

            // Check for iOS Safari PWA
            const isIOSPWA = (window.navigator as any).standalone === true;

            setIsInstalled(isPWA || isIOSPWA);
        };

        detectPlatform();
        checkIfInstalled();

        // Listen for the beforeinstallprompt event (not available on iOS)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        // For iOS/Mac Safari, check if PWA is installable (not already installed and in Safari)
        if ((isIOS || isMac) && !isInstalled) {
            setIsInstallable(true);
        }

        // Listen for app installed event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === 'accepted') {
                console.log('💾 PWA installed successfully');
            } else {
                console.log('❌ PWA installation dismissed');
            }

            setDeferredPrompt(null);
            setIsInstallable(false);
        } catch (error) {
            console.error('❌ PWA installation failed:', error);
        }
    };

    return {
        isInstallable,
        isInstalled,
        installApp,
        canInstall: isInstallable && !isInstalled,
        isIOS,
        isMac
    };
}; 