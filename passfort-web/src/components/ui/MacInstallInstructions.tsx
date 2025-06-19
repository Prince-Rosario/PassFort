import { XMarkIcon, ComputerDesktopIcon, Bars3Icon } from '@heroicons/react/24/outline';

interface MacInstallInstructionsProps {
    onClose: () => void;
}

export const MacInstallInstructions: React.FC<MacInstallInstructionsProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Install PassFort on Mac</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Add PassFort to your Mac's Dock for quick access and a native app experience.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">Method 1: Address Bar (Recommended)</h4>
                                <div className="space-y-2">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                            1
                                        </div>
                                        <p className="text-sm text-gray-700">Look for the install icon (📱) in Safari's address bar</p>
                                    </div>

                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                            2
                                        </div>
                                        <p className="text-sm text-gray-700">Click the install icon and select "Add to Dock"</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Method 2: File Menu</h4>
                                <div className="space-y-2">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                            1
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <p className="text-sm text-gray-700">Click</p>
                                            <div className="flex items-center space-x-1 px-2 py-1 bg-gray-200 rounded text-xs">
                                                <Bars3Icon className="h-3 w-3" />
                                                <span>File</span>
                                            </div>
                                            <p className="text-sm text-gray-700">in Safari's menu bar</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                            2
                                        </div>
                                        <p className="text-sm text-gray-700">Select "Add to Dock..." from the menu</p>
                                    </div>

                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                            3
                                        </div>
                                        <p className="text-sm text-gray-700">Click "Add" to install PassFort</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3 mt-4">
                            <div className="flex items-center space-x-2">
                                <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                                <p className="text-xs text-blue-800">
                                    <strong>Note:</strong> This only works in Safari browser on macOS
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={onClose}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MacInstallInstructions; 