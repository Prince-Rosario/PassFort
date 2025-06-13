import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SSHKeyFormData } from '../../../types/vault';

interface SSHKeyFormProps {
    initialData?: Partial<SSHKeyFormData>;
    onSubmit: (data: SSHKeyFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const SSHKeyForm: React.FC<SSHKeyFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false
}) => {
    const [showPrivateKey, setShowPrivateKey] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch
    } = useForm<SSHKeyFormData>({
        defaultValues: {
            title: initialData?.title || '',
            keyName: initialData?.keyName || '',
            publicKey: initialData?.publicKey || '',
            privateKey: initialData?.privateKey || '',
            passphrase: initialData?.passphrase || '',
            keyType: initialData?.keyType || 'rsa',
            keySize: initialData?.keySize || 2048,
            notes: initialData?.notes || ''
        }
    });

    const selectedKeyType = watch('keyType');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {initialData ? 'Edit SSH Key' : 'Add SSH Key'}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name *
                        </label>
                        <input
                            {...register('title', { required: 'Name is required' })}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., GitHub Deploy Key, Production Server"
                        />
                        {errors.title && (
                            <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                        )}
                    </div>

                    {/* Key Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Key Name
                        </label>
                        <input
                            {...register('keyName')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Key identifier or filename"
                        />
                    </div>

                    {/* Key Type and Size */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Key Type
                            </label>
                            <select
                                {...register('keyType')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="rsa">RSA</option>
                                <option value="ed25519">Ed25519</option>
                                <option value="ecdsa">ECDSA</option>
                                <option value="dsa">DSA</option>
                            </select>
                        </div>

                        {selectedKeyType === 'rsa' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Key Size
                                </label>
                                <select
                                    {...register('keySize', { valueAsNumber: true })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value={2048}>2048 bits</option>
                                    <option value={3072}>3072 bits</option>
                                    <option value={4096}>4096 bits</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Public Key */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Public Key
                        </label>
                        <textarea
                            {...register('publicKey')}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                            placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            The public key that can be safely shared
                        </p>
                    </div>

                    {/* Private Key */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Private Key
                        </label>
                        <div className="relative">
                            <textarea
                                {...register('privateKey')}
                                rows={8}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${!showPrivateKey ? 'text-security-disc' : ''}`}
                                placeholder="-----BEGIN PRIVATE KEY-----..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowPrivateKey(!showPrivateKey)}
                                className="absolute top-2 right-2 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded"
                            >
                                {showPrivateKey ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                            ⚠️ Keep this private key secure - never share it
                        </p>
                    </div>

                    {/* Passphrase */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passphrase (if protected)
                        </label>
                        <input
                            {...register('passphrase')}
                            type="password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter passphrase if key is password-protected"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Server details, usage instructions, etc."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : (initialData ? 'Update' : 'Save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SSHKeyForm; 