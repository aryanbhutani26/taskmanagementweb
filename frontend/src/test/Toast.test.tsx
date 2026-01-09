import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastContainer, useToast, ToastMessage } from '@/components/Toast';
import { renderHook, act } from '@testing-library/react';

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ToastContainer', () => {
    it('should render toasts', () => {
      const toasts: ToastMessage[] = [
        {
          id: '1',
          type: 'success',
          title: 'Success',
          message: 'Task created successfully'
        },
        {
          id: '2',
          type: 'error',
          title: 'Error',
          message: 'Failed to create task'
        }
      ];

      const mockOnRemove = vi.fn();

      render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Task created successfully')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to create task')).toBeInTheDocument();
    });

    it('should call onRemove when close button is clicked', () => {
      const toasts: ToastMessage[] = [
        {
          id: '1',
          type: 'success',
          title: 'Success',
          message: 'Task created successfully'
        }
      ];

      const mockOnRemove = vi.fn();

      render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      // Wait for the animation delay
      setTimeout(() => {
        expect(mockOnRemove).toHaveBeenCalledWith('1');
      }, 350);
    });
  });

  describe('useToast hook', () => {
    it('should add and remove toasts', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toHaveLength(0);

      act(() => {
        result.current.showSuccess('Success', 'Task created');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[0].title).toBe('Success');
      expect(result.current.toasts[0].message).toBe('Task created');

      act(() => {
        result.current.removeToast(result.current.toasts[0].id);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should add different types of toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Success');
        result.current.showError('Error');
        result.current.showInfo('Info');
        result.current.showWarning('Warning');
      });

      expect(result.current.toasts).toHaveLength(4);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[1].type).toBe('error');
      expect(result.current.toasts[2].type).toBe('info');
      expect(result.current.toasts[3].type).toBe('warning');
    });

    it('should generate unique IDs for toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Success 1');
        result.current.showSuccess('Success 2');
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
    });
  });
});