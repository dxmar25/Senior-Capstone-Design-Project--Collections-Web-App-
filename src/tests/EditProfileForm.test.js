import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditProfileForm from '../components/EditProfileForm';
import * as api from '../services/api';

// Mock the API calls
jest.mock('../services/api');

describe('EditProfileForm Component', () => {
  const mockUser = {
    id: 1,
    user_id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    display_name: 'Test User',
    bio: 'Original bio',
    profile_picture_url: 'https://example.com/profile.jpg'
  };
  
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock updateUserProfile API
    api.updateUserProfile.mockResolvedValue({
      ...mockUser,
      first_name: 'Updated',
      last_name: 'Name',
      display_name: 'Updated Name',
      bio: 'Updated bio'
    });
  });

  test('renders form with user data', () => {
    render(
      <EditProfileForm
        user={mockUser}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    // Check form fields have correct initial values
    expect(screen.getByLabelText('First Name')).toHaveValue('Test');
    expect(screen.getByLabelText('Last Name')).toHaveValue('User');
    expect(screen.getByLabelText('Display Name')).toHaveValue('Test User');
    expect(screen.getByLabelText('Bio')).toHaveValue('Original bio');
  });

  test('handles form submission', async () => {
    render(
      <EditProfileForm
        user={mockUser}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    // Change form values
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Updated' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Name' } });
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Updated Name' } });
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Updated bio' } });
    
    // Submit form
    fireEvent.click(screen.getByText('Save Profile'));
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(api.updateUserProfile).toHaveBeenCalledWith(
        1,
        expect.any(FormData)
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('cancels editing', () => {
    render(
      <EditProfileForm
        user={mockUser}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );
    
    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check onClose was called
    expect(mockOnClose).toHaveBeenCalled();
  });
});