'use client';

import { useState, useEffect } from 'react';
import { UpdateTaskRequest, Task, TaskStatus } from '@/types';
import { apiClient } from '@/lib/api';

interface TaskEditModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
}

interface FormData {
  title: string;
  description: string;
  status: TaskStatus;
}

interface FormErrors {
  title?: string;
  description?: string;
  general?: string;
}

export default function TaskEditModal({ isOpen, task, onClose, onTaskUpdated }: TaskEditModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    status: TaskStatus.PENDING
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when task changes or modal opens
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status
      });
      setErrors({});
    }
  }, [task, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 1) {
      newErrors.title = 'Title cannot be empty';
    } else if (formData.title.trim().length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }

    // Description validation (optional but has length limit)
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!task || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const updateRequest: UpdateTaskRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status
      };

      const updatedTask = await apiClient.tasks.update(task.id, updateRequest);
      
      // Notify parent component
      onTaskUpdated(updatedTask);
      
      // Close modal
      onClose();
    } catch (error: any) {
      console.error('Failed to update task:', error);
      
      // Handle validation errors from server
      if (error.response?.status === 400 && error.response?.data?.error?.details) {
        const serverErrors: FormErrors = {};
        const details = error.response.data.error.details;
        
        if (details.title) {
          serverErrors.title = details.title[0];
        }
        if (details.description) {
          serverErrors.description = details.description[0];
        }
        
        setErrors(serverErrors);
      } else {
        // General error
        setErrors({
          general: error.response?.data?.error?.message || 'Failed to update task. Please try again.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | TaskStatus) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  if (!isOpen || !task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Edit Task
                  </h3>

                  {/* General error message */}
                  {errors.general && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{errors.general}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Title field */}
                    <div>
                      <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="edit-title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                          errors.title
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Enter task title"
                        disabled={isSubmitting}
                        maxLength={255}
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                      )}
                    </div>

                    {/* Description field */}
                    <div>
                      <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="edit-description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${
                          errors.description
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Enter task description (optional)"
                        disabled={isSubmitting}
                        maxLength={1000}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.description.length}/1000 characters
                      </p>
                    </div>

                    {/* Status field */}
                    <div>
                      <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        id="edit-status"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        disabled={isSubmitting}
                      >
                        <option value={TaskStatus.PENDING}>Pending</option>
                        <option value={TaskStatus.COMPLETED}>Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Task'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}