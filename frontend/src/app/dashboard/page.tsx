'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Task, TaskStatus, PaginatedTasks } from '@/types';
import { apiClient } from '@/lib/api';
import TaskCreateModal from '@/components/TaskCreateModal';
import TaskEditModal from '@/components/TaskEditModal';
import TaskDeleteModal from '@/components/TaskDeleteModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { ToastContainer, useToast } from '@/components/Toast';

interface DashboardError {
  message: string;
  code?: string;
}

export default function DashboardPage() {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<DashboardError | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Undo state for deletions
  const [recentlyDeleted, setRecentlyDeleted] = useState<{task: Task, timeoutId: NodeJS.Timeout} | null>(null);

  // Filter and search state
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load tasks when authenticated or filters change
  useEffect(() => {
    if (isAuthenticated) {
      loadTasks();
    }
  }, [isAuthenticated, debouncedSearchTerm, statusFilter, pagination.page]);

  const loadTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setTasksError(null);
      
      const query: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      // Add status filter if not 'ALL'
      if (statusFilter !== 'ALL') {
        query.status = statusFilter;
      }

      // Add search term if provided
      if (debouncedSearchTerm.trim()) {
        query.search = debouncedSearchTerm.trim();
      }
      
      const response: PaginatedTasks = await apiClient.tasks.getAll(query);
      
      setTasks(response.tasks);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      setTasksError({
        message: error.response?.data?.error?.message || 'Failed to load tasks',
        code: error.response?.data?.error?.code
      });
    } finally {
      setTasksLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, debouncedSearchTerm]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleStatusFilterChange = (status: TaskStatus | 'ALL') => {
    setStatusFilter(status);
    // Reset to first page when filter changes
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Reset to first page when search changes
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTaskCreated = (newTask: Task) => {
    // Add the new task to the beginning of the list
    setTasks(prev => [newTask, ...prev]);
    
    // Update pagination total
    setPagination(prev => ({ 
      ...prev, 
      total: prev.total + 1,
      totalPages: Math.ceil((prev.total + 1) / prev.limit)
    }));
    
    // Show success notification
    showSuccess('Task Created', `"${newTask.title}" has been created successfully.`);
  };

  const handleCreateTask = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    // Optimistic update: immediately update the task in the list
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    
    // Show success notification
    showSuccess('Task Updated', `"${updatedTask.title}" has been updated successfully.`);
  };

  const handleToggleTask = async (task: Task) => {
    // Optimistic update: immediately toggle the status
    const optimisticTask = {
      ...task,
      status: task.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED,
      updatedAt: new Date().toISOString()
    };
    
    setTasks(prev => prev.map(t => 
      t.id === task.id ? optimisticTask : t
    ));

    try {
      const updatedTask = await apiClient.tasks.toggle(task.id);
      
      // Update with actual server response
      setTasks(prev => prev.map(t => 
        t.id === task.id ? updatedTask : t
      ));
      
      // Show success notification
      const statusText = updatedTask.status === TaskStatus.COMPLETED ? 'completed' : 'pending';
      showSuccess('Task Updated', `"${updatedTask.title}" marked as ${statusText}.`);
    } catch (error: any) {
      console.error('Failed to toggle task:', error);
      
      // Rollback optimistic update
      setTasks(prev => prev.map(t => 
        t.id === task.id ? task : t
      ));
      
      // Show error notification
      showError('Update Failed', 
        error.response?.data?.error?.message || 'Failed to update task status. Please try again.'
      );
    }
  };

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task);
    setIsDeleteModalOpen(true);
  };

  const handleViewTask = (task: Task) => {
    setDetailTaskId(task.id);
    setIsDetailModalOpen(true);
  };

  const handleTaskDeleted = (deletedTask: Task) => {
    // Clear any existing undo timeout
    if (recentlyDeleted) {
      clearTimeout(recentlyDeleted.timeoutId);
    }

    // Remove task from list immediately
    setTasks(prev => prev.filter(task => task.id !== deletedTask.id));
    
    // Update pagination total
    setPagination(prev => ({ 
      ...prev, 
      total: Math.max(0, prev.total - 1),
      totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.limit)
    }));

    // Set up undo functionality with 10 second timeout
    const timeoutId = setTimeout(() => {
      setRecentlyDeleted(null);
    }, 10000);

    setRecentlyDeleted({ task: deletedTask, timeoutId });
    
    // Show success notification with undo option
    showSuccess(
      'Task Deleted', 
      `"${deletedTask.title}" has been deleted.`,
      {
        action: {
          label: 'Undo',
          onClick: () => handleUndoDelete(deletedTask)
        }
      }
    );
  };

  const handleUndoDelete = async (deletedTask: Task) => {
    if (!recentlyDeleted) return;

    try {
      // Clear the undo timeout
      clearTimeout(recentlyDeleted.timeoutId);
      setRecentlyDeleted(null);

      // Recreate the task
      const recreatedTask = await apiClient.tasks.create({
        title: deletedTask.title,
        description: deletedTask.description
      });

      // Add back to the list
      setTasks(prev => [recreatedTask, ...prev]);
      
      // Update pagination total
      setPagination(prev => ({ 
        ...prev, 
        total: prev.total + 1,
        totalPages: Math.ceil((prev.total + 1) / prev.limit)
      }));

      showSuccess('Task Restored', `"${recreatedTask.title}" has been restored.`);
    } catch (error: any) {
      console.error('Failed to restore task:', error);
      showError('Restore Failed', 'Failed to restore the task. Please recreate it manually.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: TaskStatus) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    if (status === TaskStatus.COMPLETED) {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-yellow-100 text-yellow-800`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Task Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">My Tasks</h2>
                <p className="text-gray-600">
                  Manage your tasks efficiently. You have {pagination.total} task{pagination.total !== 1 ? 's' : ''} total.
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={handleCreateTask}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Task
                </button>
              </div>
            </div>
          </div>

          {/* Task List Container */}
          <div className="bg-white shadow rounded-lg">
            {/* Filters and Search */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-medium text-gray-900">Task List</h3>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value as TaskStatus | 'ALL')}
                    className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value={TaskStatus.PENDING}>Pending</option>
                    <option value={TaskStatus.COMPLETED}>Completed</option>
                  </select>

                  {/* Clear Filters Button */}
                  {(statusFilter !== 'ALL' || searchTerm.trim()) && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              {(statusFilter !== 'ALL' || debouncedSearchTerm.trim()) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusFilter !== 'ALL' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Status: {statusFilter.toLowerCase()}
                      <button
                        onClick={() => handleStatusFilterChange('ALL')}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                      >
                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                          <path fillRule="evenodd" d="M5.354 4L8 6.646 6.646 8 4 5.354 1.354 8 0 6.646 2.646 4 0 1.354 1.354 0 4 2.646 6.646 0 8 1.354 5.354 4z" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {debouncedSearchTerm.trim() && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Search: "{debouncedSearchTerm}"
                      <button
                        onClick={() => handleSearchChange('')}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-600 focus:outline-none"
                      >
                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                          <path fillRule="evenodd" d="M5.354 4L8 6.646 6.646 8 4 5.354 1.354 8 0 6.646 2.646 4 0 1.354 1.354 0 4 2.646 6.646 0 8 1.354 5.354 4z" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Loading State */}
            {tasksLoading && (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading tasks...</p>
              </div>
            )}

            {/* Error State */}
            {tasksError && (
              <div className="px-6 py-12 text-center">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error loading tasks</h3>
                      <p className="mt-1 text-sm text-red-700">{tasksError.message}</p>
                      <button
                        onClick={loadTasks}
                        className="mt-2 text-sm text-red-800 hover:text-red-900 font-medium"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!tasksLoading && !tasksError && tasks.length === 0 && (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                {(statusFilter !== 'ALL' || debouncedSearchTerm.trim()) ? (
                  <>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No matching tasks</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No tasks found matching your current filters. Try adjusting your search or filter criteria.
                    </p>
                    <button
                      onClick={clearFilters}
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Clear all filters
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first task.</p>
                  </>
                )}
              </div>
            )}

            {/* Task List */}
            {!tasksLoading && !tasksError && tasks.length > 0 && (
              <div className="divide-y divide-gray-200">
                {tasks.map((task) => (
                  <div key={task.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          {/* Status Toggle Button */}
                          <button
                            onClick={() => handleToggleTask(task)}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              task.status === TaskStatus.COMPLETED
                                ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            title={task.status === TaskStatus.COMPLETED ? 'Mark as pending' : 'Mark as completed'}
                          >
                            {task.status === TaskStatus.COMPLETED && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleViewTask(task)}
                            className={`text-sm font-medium truncate text-left hover:underline focus:outline-none ${
                              task.status === TaskStatus.COMPLETED 
                                ? 'text-gray-500 line-through' 
                                : 'text-gray-900'
                            }`}
                          >
                            {task.title}
                          </button>
                          <span className={getStatusBadge(task.status)}>
                            {task.status.toLowerCase()}
                          </span>
                        </div>
                        {task.description && (
                          <p className={`mt-1 text-sm truncate ml-8 ${
                            task.status === TaskStatus.COMPLETED 
                              ? 'text-gray-400' 
                              : 'text-gray-600'
                          }`}>
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4 ml-8">
                          <span>Created: {formatDate(task.createdAt)}</span>
                          {task.updatedAt !== task.createdAt && (
                            <span>Updated: {formatDate(task.updatedAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditTask(task)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!tasksLoading && !tasksError && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {pagination.page} of {pagination.totalPages} 
                    ({pagination.total} total tasks)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                              pageNum === pagination.page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Task Creation Modal */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        isOpen={isEditModalOpen}
        task={editingTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Task Delete Modal */}
      <TaskDeleteModal
        isOpen={isDeleteModalOpen}
        task={deletingTask}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTask(null);
        }}
        onTaskDeleted={handleTaskDeleted}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        taskId={detailTaskId}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailTaskId(null);
        }}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        onToggle={handleToggleTask}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}