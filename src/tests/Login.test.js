import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Login from '../components/Login';
import * as authApi from '../services/auth';
import * as googleAuth from '../services/google-auth';

// Mock the API and Google auth functions
jest.mock('../services/auth');
jest.mock('../services/google-auth', () => ({
  initializeGoogleSignIn: jest.fn(),
}));

describe('Login Component', () => {
  const mockLoginSuccess = jest.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful auth check initially
    authApi.checkUserAuth.mockResolvedValue({
      is_authenticated: false
    });
  });

  test('renders login screen with Google sign-in button', async () => {
    render(<Login onLoginSuccess={mockLoginSuccess} />);
    
    // Should display login heading
    expect(screen.getByText(/my collections/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in to view and manage your collections/i)).toBeInTheDocument();
    
    // Should initialize Google Sign-In
    expect(googleAuth.initializeGoogleSignIn).toHaveBeenCalled();
  });

  test('redirects when already authenticated', async () => {
    // Mock authenticated user
    authApi.checkUserAuth.mockResolvedValue({
      is_authenticated: true,
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    });
    
    render(<Login onLoginSuccess={mockLoginSuccess} />);
    
    // Wait for authentication check to complete
    await waitFor(() => {
      expect(authApi.checkUserAuth).toHaveBeenCalled();
      expect(mockLoginSuccess).toHaveBeenCalled();
    });
  });

  test('handles successful Google login', async () => {
    render(<Login onLoginSuccess={mockLoginSuccess} />);
    
    // Simulate Google login success event
    const userData = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };
    
    // Create and dispatch the custom event
    const loginEvent = new CustomEvent('googleLoginSuccess', { detail: userData });
    window.dispatchEvent(loginEvent);
    
    // Wait for event handler to process
    await waitFor(() => {
      expect(mockLoginSuccess).toHaveBeenCalledWith(userData);
    });
  });
});