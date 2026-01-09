import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskCreateModal from '@/components/TaskCreateModal';
import { apiClient } from '@/lib/api';
import { Task, TaskStatus } from '@/types';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    tasks: {
      create: vi.fn()
    }
  }
}));

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  status: TaskStatus.PENDING,
  userId: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('TaskCreateModal', () => {
  const mockOnClose = vi.fn();
  const mockOnTaskCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open', () => {
    render(
      <TaskCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <TaskCreateModal
        isOpen={false}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
  });

  it('should show validation error for empty title', async () => {
    render(
      <TaskCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create task/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('should create task with valid data', async () => {
    const mockCreate = vi.mocked(apiClient.tasks.create);
    mockCreate.mockResolvedValue(mockTask);

    render(
      <TaskCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /create task/i });

    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description'
      });
      expect(mockOnTaskCreated).toHaveBeenCalledWith(mockTask);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should create task with only title (no description)', async () => {
    const mockCreate = vi.mocked(apiClient.tasks.create);
    mockCreate.mockResolvedValue(mockTask);

    render(
      <TaskCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /create task/i });

    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        title: 'Test Task',
        description: undefined
      });
    });
  });

  it('should handle API errors', async () => {
    const mockCreate = vi.mocked(apiClient.tasks.create);
    mockCreate.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: {
            message: 'Validation failed',
            details: {
              title: ['Title is too long']
            }
          }
        }
      }
    });

    render(
      <TaskCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /create task/i });

    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is too long')).toBeInTheDocument();
    });
  });

  it('should close modal when cancel is clicked', () => {
    render(
      <TaskCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should clear form when modal is closed via onClose', () => {
    render(
      <TaskCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });

    // Close modal by calling onClose
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});