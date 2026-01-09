import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorProvider } from '@/contexts/ErrorContext';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import DashboardPage from '@/app/dashboard/page';
import { TaskCreateModal } from '@/components/TaskCreateModal';
import { TaskEditModal } from '@/components/TaskEditModal';
import { TaskDeleteModal } from '@/components/TaskDeleteModal';
import { Toast } from '@/components/Toast';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API calls
const mockApiResponse = {
  user: { id: '1', email: 'test@example.com', name: 'Test User' },
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token'
};

const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'First test task',
    status: 'pending',
    userId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Second test task',
    status: 'completed',
    userId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock fetch globally
global.fetch = vi.fn();

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ErrorProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ErrorProvider>
    );
  };
}

describe('Frontend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Authentication Flow Integration', () => {
    it('should handle complete registration flow', async () => {
      const user = userEvent.setup();
      
      // Mock successful registration
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      render(<RegisterPage />, { wrapper: createWrapper() });

      // Fill out registration form
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      
      await user.click(submitButton);

      // Wait for API call and navigation
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/register'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
              name: 'Test User',
              email: 'test@example.com',
              password: 'SecurePassword123!'
            }),
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle complete login flow', async () => {
      const user = userEvent.setup();
      
      // Mock successful login
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      // Fill out login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      
      await user.click(submitButton);

      // Wait for API call and navigation
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/login'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'SecurePassword123!'
            }),
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle authentication errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock failed login
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        }),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      // Fill out login form with invalid credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid@example.com');
      await user.type(passwordInput, 'wrongpassword');
      
      await user.click(submitButton);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Should not navigate on error
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Task Management Integration', () => {
    beforeEach(() => {
      // Mock authenticated state
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tasks: mockTasks,
            pagination: {
              page: 1,
              limit: 10,
              total: 2,
              totalPages: 1
            }
          }),
        });
    });

    it('should display tasks in dashboard', async () => {
      render(<DashboardPage />, { wrapper: createWrapper() });

      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      });

      // Check task statuses are displayed
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should handle task creation flow', async () => {
      const user = userEvent.setup();
      
      // Mock task creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '3',
          title: 'New Task',
          description: 'New task description',
          status: 'pending',
          userId: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
      });

      const mockOnClose = vi.fn();
      const mockOnTaskCreated = vi.fn();

      render(
        <TaskCreateModal 
          isOpen={true} 
          onClose={mockOnClose}
          onTaskCreated={mockOnTaskCreated}
        />, 
        { wrapper: createWrapper() }
      );

      // Fill out task creation form
      const titleInput = screen.getByLabelText(/title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const createButton = screen.getByRole('button', { name: /create task/i });

      await user.type(titleInput, 'New Task');
      await user.type(descriptionInput, 'New task description');
      
      await user.click(createButton);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/tasks'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
              title: 'New Task',
              description: 'New task description'
            }),
          })
        );
      });

      // Check callbacks are called
      await waitFor(() => {
        expect(mockOnTaskCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle task editing flow', async () => {
      const user = userEvent.setup();
      
      // Mock task update
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockTasks[0],
          title: 'Updated Task',
          description: 'Updated description'
        }),
      });

      const mockOnClose = vi.fn();
      const mockOnTaskUpdated = vi.fn();

      render(
        <TaskEditModal 
          isOpen={true} 
          task={mockTasks[0]}
          onClose={mockOnClose}
          onTaskUpdated={mockOnTaskUpdated}
        />, 
        { wrapper: createWrapper() }
      );

      // Update task form
      const titleInput = screen.getByDisplayValue('Test Task 1');
      const descriptionInput = screen.getByDisplayValue('First test task');
      const updateButton = screen.getByRole('button', { name: /update task/i });

      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');
      
      await user.click(updateButton);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/tasks/1'),
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
              title: 'Updated Task',
              description: 'Updated description'
            }),
          })
        );
      });

      // Check callbacks are called
      await waitFor(() => {
        expect(mockOnTaskUpdated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle task deletion flow', async () => {
      const user = userEvent.setup();
      
      // Mock task deletion
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Task deleted successfully' }),
      });

      const mockOnClose = vi.fn();
      const mockOnTaskDeleted = vi.fn();

      render(
        <TaskDeleteModal 
          isOpen={true} 
          task={mockTasks[0]}
          onClose={mockOnClose}
          onTaskDeleted={mockOnTaskDeleted}
        />, 
        { wrapper: createWrapper() }
      );

      // Confirm deletion
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/tasks/1'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      // Check callbacks are called
      await waitFor(() => {
        expect(mockOnTaskDeleted).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and User Feedback', () => {
    it('should display toast notifications correctly', async () => {
      const mockOnClose = vi.fn();

      // Test success toast
      render(
        <Toast 
          message="Task created successfully"
          type="success"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Task created successfully')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-green-50');

      cleanup();

      // Test error toast
      render(
        <Toast 
          message="Failed to create task"
          type="error"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Failed to create task')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />, { wrapper: createWrapper() });

      // Fill out login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      await user.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors in forms', async () => {
      const user = userEvent.setup();
      
      render(<RegisterPage />, { wrapper: createWrapper() });

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Check for validation messages
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Testing', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(<DashboardPage />, { wrapper: createWrapper() });

      // Check that mobile-specific classes are applied
      const container = screen.getByRole('main');
      expect(container).toHaveClass('container');
    });

    it('should adapt to tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<DashboardPage />, { wrapper: createWrapper() });

      // Check that responsive classes work
      const container = screen.getByRole('main');
      expect(container).toBeInTheDocument();
    });

    it('should adapt to desktop viewport', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });

      render(<DashboardPage />, { wrapper: createWrapper() });

      // Check that desktop layout is applied
      const container = screen.getByRole('main');
      expect(container).toBeInTheDocument();
    });
  });

  describe('API Integration Error Scenarios', () => {
    it('should handle 401 unauthorized responses', async () => {
      const user = userEvent.setup();
      
      // Mock 401 response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token expired'
          }
        }),
      });

      const mockOnClose = vi.fn();
      const mockOnTaskCreated = vi.fn();

      render(
        <TaskCreateModal 
          isOpen={true} 
          onClose={mockOnClose}
          onTaskCreated={mockOnTaskCreated}
        />, 
        { wrapper: createWrapper() }
      );

      // Try to create task
      const titleInput = screen.getByLabelText(/title/i);
      const createButton = screen.getByRole('button', { name: /create task/i });

      await user.type(titleInput, 'New Task');
      await user.click(createButton);

      // Should handle unauthorized error
      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
      });
    });

    it('should handle 500 server errors', async () => {
      const user = userEvent.setup();
      
      // Mock 500 response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong'
          }
        }),
      });

      render(<LoginPage />, { wrapper: createWrapper() });

      // Try to login
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should handle server error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });
});