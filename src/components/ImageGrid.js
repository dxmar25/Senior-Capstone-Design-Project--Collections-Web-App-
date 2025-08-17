import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { bulkDeleteImages } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import EditImageDetailsForm from './EditImageDetailsForm';
import ImageModal from './ImageModal';
import { fetchCategories } from '../services/api';
import "./Tags.css";
import TagSearchModal from "./TagSearchModal";

const ImageGrid = ({ categoryId, images: initialImages, categoryPlaceholder, onImagesDeleted, onImagesUpdated, viewOnly = false, onTagClick}) => {
  const [images, setImages] = useState(initialImages || []);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditImageDetails, setShowEditImageDetails] = useState(false);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tagSearchModalOpen, setTagSearchModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  
  useEffect(() => {
    // Update images when props change
    const processedImages = (initialImages || [])
      .filter(image => !image.is_wishlist) // Step 1: Exclude wishlist items
      .map(image => {
        const matchedCategory = categories && categories.length > 0 ? 
          categories.find(cat => cat.id === image.category) : null;
        return {
          ...image,
          public_url: image.path ? 
            `https://csce482-collections-bucket.s3.amazonaws.com/${image.path}` : 
            null,
          category_name: matchedCategory ? matchedCategory.name : 'Unknown'
        };
      });
      
    setImages(processedImages);
    // Clear selection when images or category changes
    setSelectedImages([]);
    setIsSelectionMode(false);
      
    console.log("Updated images:", processedImages);
  }, [initialImages, categoryId, categories]);

  // loading category name ahead of time 
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
  
    loadCategories();
  }, []);
  
  // ... existing WebSocket code ...
  const handleTagClick = (e, tag) => {
    // Check if e is an Event object before calling stopPropagation
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation(); // Prevent image selection
    }
    
    if (onTagClick) {
      onTagClick(tag);
    }
  };
  
  // Toggle selection of an image
  const toggleImageSelection = (imageId, e) => {
    if (viewOnly) return; // Disable selection in view-only mode
    
    e.stopPropagation();
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        const newSelection = prev.filter(id => id !== imageId);
        if (newSelection.length === 0) {
          setIsSelectionMode(false);
        }
        return newSelection;
      } else {
        return [...prev, imageId];
      }
    });
  };
  
  // Cancel selection mode
  const cancelSelection = () => {
    setSelectedImages([]);
    setIsSelectionMode(false);
  };
  
  // Show delete confirmation for selected images
  const showDeleteSelected = () => {
    if (selectedImages.length > 0) {
      setShowDeleteConfirmation(true);
    }
  };
  
  // New function to handle editing image details
  const handleEditImageDetails = () => {
    if (selectedImages.length === 1) {
      const imageId = selectedImages[0];
      const image = images.find(img => img.id === imageId);
      if (image) {
        setImageToEdit(image);
        setShowEditImageDetails(true);
      }
    }
  };

  const handleImageDetailsUpdated = (updatedImage) => {
    setShowEditImageDetails(false);
    
    // Update the local state
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === updatedImage.id ? { ...img, ...updatedImage } : img
      )
    );
    
    // Reset selection
    setSelectedImages([]);
    setIsSelectionMode(false);
    
    // Notify parent
    if (onImagesUpdated) {
      onImagesUpdated([updatedImage.id]);
    }
  };
  
  // Handle confirming deletion of selected images
  const handleConfirmDelete = async () => {
    if (selectedImages.length === 0) return;
    
    try {
      setIsDeleting(true);
      console.log("Deleting images with IDs:", selectedImages);
      const response = await bulkDeleteImages(selectedImages);
      console.log("Delete response:", response);
      
      // Optimistically update the UI
      setImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
      
      // Notify parent if needed
      if (onImagesDeleted) {
        onImagesDeleted(selectedImages);
      }
      
      // Reset selection state
      setSelectedImages([]);
      setIsSelectionMode(false);
      setShowDeleteConfirmation(false);
      setIsDeleting(false);
    } catch (error) {
      console.error("Failed to delete images:", error);
      setIsDeleting(false);
      // Could add error handling UI here
    }
  };
  
  // Handle canceling delete confirmation
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  if (!images || images.length === 0) {
    return (
      <div className="no-images">
        {/* Display placeholder image if available */}
        {/* {categoryPlaceholder && (
          <div className="placeholder-image-container">
            <img 
              src={categoryPlaceholder.startsWith('http') ? categoryPlaceholder : `https://${categoryPlaceholder}`} 
              alt="Collection placeholder" 
              className="category-placeholder"
              onError={(e) => {
                console.error("Failed to load placeholder image:", e);
                e.target.onerror = null; // Prevent infinite error loop
                e.target.src = "/api/placeholder/300/200"; // Use a placeholder image
              }}
            />
          </div>
        )} */}
        
        <p className="no-items-text">{viewOnly ? "No images in this collection." : "No images in this collection yet. Add your first image!"}</p>
        
        {!viewOnly && isConnected && (
          <p className="connection-status connected">
            Real-time updates enabled
          </p>
        )}
        {!viewOnly && !isConnected && categoryId && (
          <p className="connection-status disconnected">
            Connecting to real-time updates...
          </p>
        )}
      </div>
    );
  }

  // Handle showing each image's information modal 
  const openModal = (image) => {
    console.log("Opening modal for image:", image);
    setSelectedImage(image);
    setImageModalOpen(true);
  };

  const closeModal = () => {
    console.log("Closing modal");
    setSelectedImage(null);
    setImageModalOpen(false);
  };

  return (
    <>
      {!viewOnly && isConnected ? (
        <div className="connection-indicator connected">
          Real-time updates enabled
        </div>
      ) : !viewOnly && categoryId ? (
        <div className="connection-indicator disconnected">
          Connecting to real-time updates...
        </div>
      ) : null}
      
      {/* Add a selection mode button only if not in view-only mode */}
      {!viewOnly && images.length > 0 && (
        <div className="image-controls">
          {!isSelectionMode ? (
            <button 
              className="selection-mode-button"
              onClick={() => setIsSelectionMode(true)}
            >
              Select Images
            </button>
          ) : (
            <div className="selection-active-controls">
              <span className="selection-count">{selectedImages.length} selected</span>
              
              {/* Add Edit Button here */}
              <button 
                className="selection-button edit"
                onClick={handleEditImageDetails}
                disabled={selectedImages.length !== 1}
              >
                Edit Image
              </button>
              
              <button 
                className="selection-button delete"
                onClick={showDeleteSelected}
                disabled={selectedImages.length === 0}
              >
                Delete Selected
              </button>
              <button 
                className="selection-button cancel"
                onClick={cancelSelection}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={categoryId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="image-grid"
        >
          {images.map((image, index) => (
            <motion.div
              key={image.id || index}
              className={`image-box ${selectedImages.includes(image.id) ? 'selected' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={(e) => isSelectionMode && !viewOnly ? toggleImageSelection(image.id, e) : openModal(image)}
            >
              <img 
                src={image.presigned_url || `https://csce482-collections-bucket.s3.amazonaws.com/${image.path}`}
                alt={image.title}
                onLoad={(e) => e.target.classList.add('loaded')}
                onError={(e) => {
                  console.error("Failed to load image:", e);
                  e.target.onerror = null; // Prevent infinite error loop
                  e.target.src = "/api/placeholder/300/200"; // Fallback placeholder
                }}
              />
              {!viewOnly && <div className="selection-overlay"></div>}
              {isSelectionMode && !viewOnly && (
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    className="selection-checkbox"
                    checked={selectedImages.includes(image.id)}
                    onChange={(e) => toggleImageSelection(image.id, e)}
                  />
                </div>
              )}
              <p>{image.title}</p>
              
              {image.tags && image.tags.length > 0 && (
                <div className="image-tags">
                  {image.tags.slice(0, 2).map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="tag-badge"
                      onClick={(e) => handleTagClick(e, tag)}
                    >
                      {tag}
                    </span>
                  ))}
                  {image.tags.length > 2 && (
                    <span className="tag-badge">+{image.tags.length - 2}</span>
                  )}
                </div>
              )}

              {/* {tagSearchModalOpen && (
                <TagSearchModal
                  tag={selectedTag}
                  onClose={() => setTagSearchModalOpen(false)}
                />
              )} */}
              
              {/* Add the description/valuation indicators here */}
              {/* {(image.description || image.valuation) && (
                <div className="image-details-indicator">
                  {image.description && <span className="detail-icon description-icon" title="Has description">📝</span>}
                  {image.valuation && <span className="detail-icon value-icon" title={`Value: $${image.valuation}`}>💰</span>}
                </div>
              )} */}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {tagSearchModalOpen && (
                <TagSearchModal
                  tag={selectedTag}
                  onClose={() => setTagSearchModalOpen(false)}
                />
      )}
      
      {/* Delete confirmation modal */}
      {showDeleteConfirmation && !viewOnly && (
        <ConfirmationModal 
          title="Delete Images?"
          message={`This will permanently delete ${selectedImages.length} selected image${selectedImages.length > 1 ? 's' : ''}. This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isLoading={isDeleting}
        />
      )}
      
      {/* Edit Image Details modal */}
      {showEditImageDetails && imageToEdit && (
        <EditImageDetailsForm 
          image={imageToEdit}
          onClose={() => setShowEditImageDetails(false)}
          onSuccess={handleImageDetailsUpdated}
        />
      )}

      {/* Image information modal */}
      {imageModalOpen && selectedImage && (
          <ImageModal 
          image={selectedImage} 
          onClose={closeModal} 
          onTagClick={handleTagClick} // Add this prop
        />
      )}
    </>
  );
};

export default ImageGrid;