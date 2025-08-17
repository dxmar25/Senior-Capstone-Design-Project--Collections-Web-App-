import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProvider } from '../context/UserContext';
import SetGoalModal from '../components/SetGoalModal';
import * as api from '../services/api';

// Mock the API calls
jest.mock('../services/api');

// Mock the UserContext
jest.mock('../context/UserContext', () => ({
  UserProvider: ({ children }) => children,
  useUser: () => ({
    user: { id: 1, user_id: 1 }
  })
}));

describe('SetGoalModal Component', () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock saveGoal API
    api.saveGoal.mockResolvedValue({
      id: 1,
      monthly_spending: 500,
      spending_cushion: true,
      cushion_amount: 50
    });
  });

  test('renders the goal setting form', () => {
    render(
      <UserProvider>
        <SetGoalModal isOpen={true} onClose={mockOnClose} />
      </UserProvider>
    );
    
    // Check form elements
    expect(screen.getByText('Setting New Goal')).toBeInTheDocument();
    expect(screen.getByText('Planned Monthly Spending:')).toBeInTheDocument();
    expect(screen.getByText('Spending Cushion?')).toBeInTheDocument();
    expect(screen.getByText('Cushion Amount:')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    render(
      <UserProvider>
        <SetGoalModal isOpen={true} onClose={mockOnClose} />
      </UserProvider>
    );
    
    // Fill in form fields
    fireEvent.change(screen.getByPlaceholderText('$400.00'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText('$25.00'), { target: { value: '50' } });
    
    // Submit form
    fireEvent.click(screen.getByText('Save New Goal'));
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(api.saveGoal).toHaveBeenCalledWith(
        expect.any(Number),
        {
          monthly_spending: 500,
          spending_cushion: true,
          cushion_amount: 50
        }
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  test('closes modal when cancel is clicked', () => {
    render(
      <UserProvider>
        <SetGoalModal isOpen={true} onClose={mockOnClose} />
      </UserProvider>
    );
    
    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check onClose was called
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('is not rendered when isOpen is false', () => {
    render(
      <UserProvider>
        <SetGoalModal isOpen={false} onClose={mockOnClose} />
      </UserProvider>
    );
    
    // Modal should not be in the document
    expect(screen.queryByText('Setting New Goal')).not.toBeInTheDocument();
  });
});