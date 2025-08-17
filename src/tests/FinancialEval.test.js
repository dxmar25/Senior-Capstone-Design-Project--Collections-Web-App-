import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from '../context/UserContext';
import FinancialEval from '../components/FinancialEval';
import * as api from '../services/api';

// Mock the API calls
jest.mock('../services/api');

describe('FinancialEval Component', () => {
  const mockFinancialData = {
    totalSpending: 1000,
    collections: [
      { collectionName: 'Collection 1', price: 500 },
      { collectionName: 'Collection 2', price: 500 }
    ],
    monthlySpending: [
      { month: '2025-01', amount: 300 },
      { month: '2025-02', amount: 200 },
      { month: '2025-03', amount: 500 }
    ]
  };
  
  const mockGoal = {
    id: 1,
    monthly_spending: 400,
    spending_cushion: true,
    cushion_amount: 50
  };
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock API responses
    api.fetchFinancialData.mockResolvedValue(mockFinancialData);
    api.getUserGoals.mockResolvedValue([mockGoal]);
  });

  test('renders financial data correctly', async () => {
    render(
      <UserProvider>
        <BrowserRouter>
          <FinancialEval />
        </BrowserRouter>
      </UserProvider>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(api.fetchFinancialData).toHaveBeenCalled();
      expect(api.getUserGoals).toHaveBeenCalled();
    });
    
    // Check financial summary
    expect(screen.getByText(/Total Account Spending:/i)).toBeInTheDocument();
    expect(screen.getByText(/\$1000/)).toBeInTheDocument();
    
    // Check current goal
    expect(screen.getByText(/Current Monthly Goal:/i)).toBeInTheDocument();
    expect(screen.getByText(/\$400/)).toBeInTheDocument();
    
    // Check charts
    expect(screen.getByText('Collection Prices')).toBeInTheDocument();
    expect(screen.getByText('Monthly Spending')).toBeInTheDocument();
  });

  test('opens goal modal when button is clicked', async () => {
    render(
      <UserProvider>
        <BrowserRouter>
          <FinancialEval />
        </BrowserRouter>
      </UserProvider>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(api.fetchFinancialData).toHaveBeenCalled();
    });
    
    // Click the set goal button
    fireEvent.click(screen.getByText('Set New Goal'));
    
    // Modal should be open
    expect(screen.getByText('Setting New Goal')).toBeInTheDocument();
  });
});