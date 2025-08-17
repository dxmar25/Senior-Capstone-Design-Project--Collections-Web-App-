import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UserProfile from '../components/UserProfile';
import * as api from '../services/api';

// Mock the API calls
jest.mock('../services/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ userId: '2' }),
  useNavigate: () => jest.fn()
}));

describe('UserProfile Component', () => {
  const mockProfile = {
    id: 2,
    username: 'otheruser',
    email: 'other@example.com',
    first_name: 'Other',
    last_name: 'User',
    display_name: 'Other User',
    bio: 'This is a bio',
    profile_picture_url: 'https://example.com/profile.jpg',
    follower_count: 5,
    following_count: 10,
    is_following: false
  };
  
  const mockCategories = [
    {
      id: 3,
      name: 'Other Category',
      is_public: true,
      placeholder_presigned_url: 'https://example.com/placeholder.jpg',
      images: []
    }
  ];
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock API responses
    api.getUserProfile.mockResolvedValue(mockProfile);
    api.getUserCategories.mockResolvedValue(mockCategories);
    api.followUser.mockResolvedValue({ id: 1, follower: 1, followed: 2 });
    api.unfollowUser.mockResolvedValue(true);
  });

  test('renders user profile correctly', async () => {
    render(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(api.getUserProfile).toHaveBeenCalledWith('2');
      expect(api.getUserCategories).toHaveBeenCalledWith('2', true);
    });
    
    // Check profile information
    expect(screen.getByText('Other User')).toBeInTheDocument();
    expect(screen.getByText('@otheruser')).toBeInTheDocument();
    expect(screen.getByText('This is a bio')).toBeInTheDocument();
    
    // Check follow stats
    expect(screen.getByText('5')).toBeInTheDocument(); // followers
    expect(screen.getByText('10')).toBeInTheDocument(); // following
    
    // Check categories
    expect(screen.getByText('Other Category')).toBeInTheDocument();
  });

  test('handles follow/unfollow actions', async () => {
    render(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(api.getUserProfile).toHaveBeenCalled();
    });
    
    // Check initial follow button state
    const followButton = screen.getByText('Follow');
    expect(followButton).toBeInTheDocument();
    
    // Click follow button
    fireEvent.click(followButton);
    
    // Wait for follow action to complete
    await waitFor(() => {
      expect(api.followUser).toHaveBeenCalledWith('2');
    });
    
    // Button should now show "Unfollow"
    expect(screen.getByText('Unfollow')).toBeInTheDocument();
    
    // Click unfollow
    fireEvent.click(screen.getByText('Unfollow'));
    
    // Wait for unfollow action to complete
    await waitFor(() => {
      expect(api.unfollowUser).toHaveBeenCalledWith('2');
    });
  });

  test('shows no collections message when user has no categories', async () => {
    // Mock empty categories
    api.getUserCategories.mockResolvedValue([]);
    
    render(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(api.getUserCategories).toHaveBeenCalled();
    });
    
    // Check for no collections message
    expect(screen.getByText('This user has no public collections.')).toBeInTheDocument();
  });
});