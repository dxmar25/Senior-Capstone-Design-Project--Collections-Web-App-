import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageGrid from '../components/ImageGrid';
import * as api from '../services/api';

// Mock the API calls
jest.mock('../services/api');

describe('ImageGrid Component', () => {
  const mockImages = [
    {
      id: 1,
      title: 'Image 1',
      presigned_url: 'https://example.com/image1.jpg',
      description: 'Description 1',
      valuation: 100.00,
      tags: ['tag1', 'tag2'],
      is_wishlist: false
    },
    {
      id: 2,
      title: 'Image 2',
      presigned_url: 'https://example.com/image2.jpg',
      description: 'Description 2',
      valuation: 200.00,
      tags: ['tag3', 'tag4'],
      is_wishlist: false
    }
  ];
  
  const mockImagesDeleted = jest.fn();
  const mockImagesUpdated = jest.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock bulkDeleteImages and updateImageDetails
    api.bulkDeleteImages.mockResolvedValue({
      deleted_count: 2
    });
    
    api.updateImageDetails.mockResolvedValue({
      id: 1,
      title: 'Updated Image',
      description: 'Updated description',
      valuation: 150.00,
      tags: ['updated', 'tags']
    });
  });

  test('renders images correctly', () => {
    render(
      <ImageGrid
        categoryId={1}
        images={mockImages}
        onImagesDeleted={mockImagesDeleted}
        onImagesUpdated={mockImagesUpdated}
      />
    );
    
    // Should display image titles
    expect(screen.getByText('Image 1')).toBeInTheDocument();
    expect(screen.getByText('Image 2')).toBeInTheDocument();
  });

  test('handles selecting and deleting images', async () => {
    render(
      <ImageGrid
        categoryId={1}
        images={mockImages}
        onImagesDeleted={mockImagesDeleted}
        onImagesUpdated={mockImagesUpdated}
      />
    );
    
    // Click the select images button
    fireEvent.click(screen.getByText('Select Images'));
    
    // Select the first image
    const imageBoxes = screen.getAllByRole('img');
    fireEvent.click(imageBoxes[0]);
    
    // Click the delete selected button
    fireEvent.click(screen.getByText('Delete Selected'));
    
// Confirm deletion
    fireEvent.click(screen.getByText('Delete'));
        
    // Wait for deletion to complete
    await waitFor(() => {
    expect(api.bulkDeleteImages).toHaveBeenCalledWith([1]);
    expect(mockImagesDeleted).toHaveBeenCalledWith([1]);
    });
    });

    test('handles editing image details', async () => {
    render(
    <ImageGrid
        categoryId={1}
        images={mockImages}
        onImagesDeleted={mockImagesDeleted}
        onImagesUpdated={mockImagesUpdated}
    />
    );

    // Click the select images button
    fireEvent.click(screen.getByText('Select Images'));

    // Select the first image
    const imageBoxes = screen.getAllByRole('img');
    fireEvent.click(imageBoxes[0]);

    // Click the edit image button
    fireEvent.click(screen.getByText('Edit Image'));

    // Update image details
    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Updated Image' } });

    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

    const valuationInput = screen.getByLabelText('Valuation ($)');
    fireEvent.change(valuationInput, { target: { value: '150' } });

    // Save changes
    fireEvent.click(screen.getByText('Save Details'));

    // Wait for update to complete
    await waitFor(() => {
    expect(api.updateImageDetails).toHaveBeenCalledWith(1, expect.any(Object));
    expect(mockImagesUpdated).toHaveBeenCalledWith([1]);
    });
    });

    test('displays placeholder when no images', () => {
    const mockPlaceholder = 'https://example.com/placeholder.jpg';

    render(
    <ImageGrid
        categoryId={1}
        images={[]}
        categoryPlaceholder={mockPlaceholder}
        onImagesDeleted={mockImagesDeleted}
        onImagesUpdated={mockImagesUpdated}
    />
    );

    // Should display no images message
    expect(screen.getByText(/No images in this collection/i)).toBeInTheDocument();

    // Should display placeholder image
    const placeholderImg = screen.getByRole('img');
    expect(placeholderImg).toHaveAttribute('src', mockPlaceholder);
    });
    });