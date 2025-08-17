import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from '../context/UserContext';
import App from '../App';
import * as authApi from '../services/auth';
import * as api from '../services/api';

// Mock the API calls
jest.mock('../services/auth');
jest.mock('../services/api');

describe('App Component', () => {
  beforeEach(() => {
    // Mock the checkUserAuth function
    authApi.checkUserAuth.mockResolvedValue({
      is_authenticated: false
    });
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders login screen when user is not authenticated', async () => {
    render(
      <UserProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UserProvider>
    );
    
    // Wait for authentication check to complete
    await waitFor(() => {
      expect(authApi.checkUserAuth).toHaveBeenCalled();
    });
    
    // Should display login screen
    expect(screen.getByText(/sign in to view and manage your collections/i)).toBeInTheDocument();
  });

  test('renders main app when user is authenticated', async () => {
    // Mock authenticated user
    authApi.checkUserAuth.mockResolvedValue({
      is_authenticated: true,
      id: 1,
      user_id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });
    
    // Mock empty categories list
    api.fetchCategories.mockResolvedValue([]);
    api.getFollowers.mockResolvedValue([]);
    api.getFollowing.mockResolvedValue([]);
    
    render(
      <UserProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UserProvider>
    );
    
    // Wait for authentication and data fetching to complete
    await waitFor(() => {
      expect(authApi.checkUserAuth).toHaveBeenCalled();
      expect(api.fetchCategories).toHaveBeenCalled();
    });
    
    // Should display the main app header
    expect(screen.getByText(/my collections/i)).toBeInTheDocument();
  });
});