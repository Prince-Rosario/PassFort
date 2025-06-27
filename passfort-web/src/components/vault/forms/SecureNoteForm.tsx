import React from 'react';
import { useForm } from 'react-hook-form';

interface SecureNoteFormData {
    title: string;
    content: string;
    tags?: string;
    notes?: string;
}

interface SecureNoteFormProps {
    initialData?: Partial<SecureNoteFormData>;
    onSubmit: (data: SecureNoteFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const SecureNoteForm: React.FC<SecureNoteFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false
}) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch
    } = useForm<SecureNoteFormData>({
        defaultValues: {
            title: initialData?.title || '',
            content: initialData?.content || '',
            tags: initialData?.tags || '',
            notes: initialData?.notes || ''
        }
    });

    const contentLength = watch('content')?.length || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    {initialData ? 'Edit Secure Note' : 'Add Secure Note'}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Title *
                        </label>
                        <input
                            {...register('title', { required: 'Title is required' })}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Meeting Notes, Important Passwords, Recovery Codes"
                        />
                        {errors.title && (
                            <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                        )}
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Content *
                        </label>
                        <textarea
                            {...register('content', { required: 'Content is required' })}
                            rows={10}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                            placeholder="Enter your secure note content here..."
                        />
                        <div className="flex justify-between items-center mt-2">
                            {errors.content && (
                                <p className="text-red-600 text-sm">{errors.content.message}</p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                                {contentLength} characters
                            </p>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tags
                        </label>
                        <input
                            {...register('tags')}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="work, personal, important (comma separated)"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Add tags to organize and search your notes
                        </p>
                    </div>

                    {/* Additional Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Additional Notes
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Any additional metadata or notes"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

export default SecureNoteForm; 