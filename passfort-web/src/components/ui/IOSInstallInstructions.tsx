import { useState } from 'react';
import { XMarkIcon, ShareIcon, PlusIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

interface IOSInstallInstructionsProps {
    onClose: () => void;
}

export const IOSInstallInstructions: React.FC<IOSInstallInstructionsProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Install PassFort</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Add PassFort to your iPhone's home screen for quick access and a native app experience.
                        </p>

                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    1
                                </div>
                                <div className="flex items-center space-x-2">
                                    <p className="text-sm text-gray-700">Tap the</p>
                                    <ShareIcon className="h-5 w-5 text-blue-500" />
                                    <p className="text-sm text-gray-700">Share button in Safari</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    2
                                </div>
                                <div className="flex items-center space-x-2">
                                    <p className="text-sm text-gray-700">Select</p>
                                    <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded">
                                        <PlusIcon className="h-4 w-4 text-gray-600" />
                                        <span className="text-xs text-gray-700">Add to Home Screen</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    3
                                </div>
                                <p className="text-sm text-gray-700">Tap "Add" to install PassFort</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3 mt-4">
                            <div className="flex items-center space-x-2">
                                <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
                                <p className="text-xs text-blue-800">
                                    <strong>Note:</strong> This only works in Safari browser on iOS
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

export default IOSInstallInstructions; 