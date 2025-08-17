import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CategoryList from '../components/CategoryList';
import * as api from '../services/api';

// Mock the API calls
jest.mock('../services/api');

describe('CategoryList Component', () => {
  const mockCategories = [
    {
      id: 1,
      name: 'Category 1',
      is_public: true,
      placeholder_presigned_url: 'https://example.com/placeholder1.jpg',
      tags: ['tag1', 'tag2'],
      images: []
    },
    {
      id: 2,
      name: 'Category 2',
      is_public: false,
      placeholder_presigned_url: 'https://example.com/placeholder2.jpg',
      tags: ['tag3', 'tag4'],
      images: []
    }
  ];
  
  const mockSelectCategory = jest.fn();
  const mockCategoryDeleted = jest.fn();
  const mockCategoryUpdated = jest.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock toggleCategoryVisibility and deleteCategory
    api.toggleCategoryVisibility.mockResolvedValue({
      id: 1,
      name: 'Category 1',
      is_public: false
    });
    
    api.deleteCategory.mockResolvedValue(true);
  });

  test('renders categories correctly', () => {
    render(
      <CategoryList
        categories={mockCategories}
        selectedCategory=""
        onSelectCategory={mockSelectCategory}
        onCategoryDeleted={mockCategoryDeleted}
        onCategoryUpdated={mockCategoryUpdated}
      />
    );
    
    // Should display category names
    expect(screen.getByText('Category 1')).toBeInTheDocument();
    expect(screen.getByText('Category 2')).toBeInTheDocument();
    
    // Should display tags
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  test('selects a category when clicked', () => {
    render(
      <CategoryList
        categories={mockCategories}
        selectedCategory=""
        onSelectCategory={mockSelectCategory}
        onCategoryDeleted={mockCategoryDeleted}
        onCategoryUpdated={mockCategoryUpdated}
      />
    );
    
    // Click on a category
    fireEvent.click(screen.getByText('Category 1'));
    
    // Should call the onSelectCategory function
    expect(mockSelectCategory).toHaveBeenCalledWith('Category 1');
  });

  test('handles category deletion', async () => {
    render(
      <CategoryList
        categories={mockCategories}
        selectedCategory=""
        onSelectCategory={mockSelectCategory}
        onCategoryDeleted={mockCategoryDeleted}
        onCategoryUpdated={mockCategoryUpdated}
      />
    );
    
    // Open options menu for Category 1
    const optionsButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(optionsButtons[0]);
    
    // Click the delete button
    fireEvent.click(screen.getByText('Delete Collection'));
    
    // Confirm deletion
    fireEvent.click(screen.getByText('Delete'));
    
    // Wait for deletion to complete
    await waitFor(() => {
      expect(api.deleteCategory).toHaveBeenCalledWith(1);
      expect(mockCategoryDeleted).toHaveBeenCalledWith(1);
    });
  });

  test('handles toggling visibility', async () => {
    render(
      <CategoryList
        categories={mockCategories}
        selectedCategory=""
        onSelectCategory={mockSelectCategory}
        onCategoryDeleted={mockCategoryDeleted}
        onCategoryUpdated={mockCategoryUpdated}
      />
    );
    
    // Open options menu for Category 1
    const optionsButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(optionsButtons[0]);
    
    // Click the visibility toggle button (Category 1 is public)
    fireEvent.click(screen.getByText('Make Private'));
    
    // Wait for toggle to complete
    await waitFor(() => {
      expect(api.toggleCategoryVisibility).toHaveBeenCalledWith(1);
      expect(mockCategoryUpdated).toHaveBeenCalledWith(1);
    });
  });

  test('displays empty state when no categories', () => {
    render(
      <CategoryList
        categories={[]}
        selectedCategory=""
        onSelectCategory={mockSelectCategory}
        onCategoryDeleted={mockCategoryDeleted}
        onCategoryUpdated={mockCategoryUpdated}
      />
    );
    
    // Should display no categories message
    expect(screen.getByText(/No collections available/i)).toBeInTheDocument();
  });
});