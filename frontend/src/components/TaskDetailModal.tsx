'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types';
import { apiClient } from '@/lib/api';

interface TaskDetailModalProps {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onToggle?: (task: Task) => void;
}

export default function TaskDetailModal({ 
  isOpen, 
  taskId, 
  onClose, 
  onEdit, 
  onDelete, 
  onToggle 
}: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTask();
    } else {
      setTask(null);
      setError(null);
    }
  }, [isOpen, taskId]);

  const loadTask = async () => {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const taskData = await apiClient.tasks.getById(taskId);
      setTask(taskData);
    } catch (error: any) {
      console.error('Failed to load task:', error);
      setError(error.response?.data?.error?.message || 'Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTask(null);
    setError(null);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: TaskStatus) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
    if (status === TaskStatus.COMPLETED) {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-yellow-100 text-yellow-800`;
  };

  const handleEdit = () => {
    if (task && onEdit) {
      onEdit(task);
      handleClose();
    }
  };

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task);
      handleClose();
    }
  };

  const handleToggle = () => {
    if (task && onToggle) {
      onToggle(task);
      // Update local state optimistically
      setTask(prev => prev ? {
        ...prev,
        status: prev.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED,
        updatedAt: new Date().toISOString()
      } : null);
    }
  };

  if (!isOpen) {
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Task Details
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading task details...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading task</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                    <button
                      onClick={loadTask}
                      className="mt-2 text-sm text-red-800 hover:text-red-900 font-medium"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {task && !loading && !error && (
              <div className="space-y-6">
                {/* Title and Status */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h4 className={`text-xl font-semibold ${
                      task.status === TaskStatus.COMPLETED 
                        ? 'text-gray-500 line-through' 
                        : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h4>
                    <span className={getStatusBadge(task.status)}>
                      {task.status.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Description</h5>
                  {task.description ? (
                    <div className={`bg-gray-50 rounded-md p-4 ${
                      task.status === TaskStatus.COMPLETED ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No description provided</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-1">Created</h5>
                    <p className="text-sm text-gray-600">{formatDate(task.createdAt)}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-1">Last Updated</h5>
                    <p className="text-sm text-gray-600">
                      {task.updatedAt !== task.createdAt 
                        ? formatDate(task.updatedAt)
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                {/* Task ID (for debugging/support) */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-1">Task ID</h5>
                  <p className="text-xs text-gray-500 font-mono bg-gray-50 rounded px-2 py-1 inline-block">
                    {task.id}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {task && !loading && !error && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <div className="flex space-x-3">
                {onToggle && (
                  <button
                    onClick={handleToggle}
                    className={`inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm ${
                      task.status === TaskStatus.COMPLETED
                        ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                        : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    }`}
                  >
                    Mark as {task.status === TaskStatus.COMPLETED ? 'Pending' : 'Completed'}
                  </button>
                )}
                
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                  >
                    Edit Task
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                  >
                    Delete Task
                  </button>
                )}
              </div>
              
              <button
                onClick={handleClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}