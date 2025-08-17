import React, { useState } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { bulkDeleteImages, transferToCollection } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import EditImageDetailsForm from './EditImageDetailsForm';
import WishlistModal from './WishlistModal';
import { fetchCategories } from '../services/api';
import "./Tags.css";

const WishlistGrid = ({ 
  categoryId,  
  images, 
  onImagesDeleted, 
  onImagesUpdated, 
  onTransferToCollection,
  viewOnly = false,
  onTagClick, // Add this prop
}) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditImageDetails, setShowEditImageDetails] = useState(false);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [wishlistImages, setWishlistImages] = useState([]);
  
  // Filter to only show wishlist items
  useEffect(() => {
    const processedImages = (images || [])
      .filter(img => img.is_wishlist)
      .map(img => {
        const matchedCategory = categories.find(cat => cat.id === img.category);
        return {
          ...img,
          public_url: img.path 
            ? `https://csce482-collections-bucket.s3.amazonaws.com/${img.path}` 
            : null,
          category_name: matchedCategory ? matchedCategory.name : 'Unknown'
        };
      });
  
    setWishlistImages(processedImages);
    setSelectedImages([]);
    setIsSelectionMode(false);
  
    console.log("Processed wishlist images:", processedImages);
  }, [images, categoryId, categories]);

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
  
  if (!wishlistImages || wishlistImages.length === 0) {
    return (
      <div className="no-images">
        <p className="no-items-text">{viewOnly ? "No items in wishlist." : "No items in wishlist. Add an item to your wishlist!"}</p>
      </div>
    );
  }

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
    if (viewOnly) return;
    
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
  
  // Handle editing image details
  const handleEditImageDetails = () => {
    if (selectedImages.length === 1) {
      const imageId = selectedImages[0];
      const image = wishlistImages.find(img => img.id === imageId);
      if (image) {
        setImageToEdit(image);
        setShowEditImageDetails(true);
      }
    }
  };

  const handleImageDetailsUpdated = (updatedImage) => {
    setShowEditImageDetails(false);
    
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
      const response = await bulkDeleteImages(selectedImages);
      
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
    }
  };
  
  // Handle transfer to collection
  const handleTransferToCollection = async () => {
    if (selectedImages.length === 0) return;
    
    try {
      setIsDeleting(true); // Reuse the loading state
      
      // Call the API to transfer wishlist items to collection
      await Promise.all(selectedImages.map(id => 
        transferToCollection(id)
      ));
      
      // Notify parent
      if (onTransferToCollection) {
        onTransferToCollection(selectedImages);
      }
      
      // Reset states
      setSelectedImages([]);
      setIsSelectionMode(false);
      setShowTransferConfirmation(false);
      setIsDeleting(false);
    } catch (error) {
      console.error("Failed to transfer items:", error);
      setIsDeleting(false);
    }
  };

  // Handle canceling delete confirmation
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  // Handle showing each image's information modal 
  const openModal = (image) => {
    console.log("Opening modal for image:", image);
    setModalImage(image);
    setWishlistModalOpen(true);
  };

  const closeModal = () => {
    console.log("Closing modal");
    setModalImage(null);
    setWishlistModalOpen(false);
  };

  return (
    <>
      <h2 className="section-title">Wishlist</h2>
      
      {/* Add a selection mode button only if not in view-only mode */}
      {!viewOnly && wishlistImages.length > 0 && (
        <div className="image-controls">
          {!isSelectionMode ? (
            <button 
              className="selection-mode-button"
              onClick={() => setIsSelectionMode(true)}
            >
              Select Wishlist Items
            </button>
          ) : (
            <div className="selection-active-controls">
              <span className="selection-count">{selectedImages.length} selected</span>
              
              <button 
                className="selection-button edit"
                onClick={handleEditImageDetails}
                disabled={selectedImages.length !== 1}
              >
                Edit Item
              </button>
              
              <button 
                className="selection-button transfer"
                onClick={() => setShowTransferConfirmation(true)}
                disabled={selectedImages.length === 0}
              >
                Transfer to Collection
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
          key={`wishlist-${categoryId}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="image-grid"
        >
          {wishlistImages.map((image, index) => (
            <motion.div
              key={image.id || index}
              className={`image-box wishlist-item ${selectedImages.includes(image.id) ? 'selected' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
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
                  e.target.onerror = null;
                  e.target.src = "/api/placeholder/300/200";
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
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirmation && !viewOnly && (
        <ConfirmationModal 
          title="Delete Wishlist Items?"
          message={`This will permanently delete ${selectedImages.length} selected item${selectedImages.length > 1 ? 's' : ''} from your wishlist. This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isLoading={isDeleting}
        />
      )}
      
      {/* Transfer confirmation modal */}
      {showTransferConfirmation && !viewOnly && (
        <ConfirmationModal 
          title="Transfer to Collection?"
          message={`This will move ${selectedImages.length} selected item${selectedImages.length > 1 ? 's' : ''} from your wishlist to your main collection.`}
          confirmLabel="Transfer"
          onConfirm={handleTransferToCollection}
          onCancel={() => setShowTransferConfirmation(false)}
          isLoading={isDeleting}
        />
      )}
      
      {/* Edit Image Details modal */}
      {showEditImageDetails && imageToEdit && (
        <EditImageDetailsForm 
          image={imageToEdit}
          onClose={() => setShowEditImageDetails(false)}
          onSuccess={handleImageDetailsUpdated}
          isWishlistItem={true}
        />
      )}

      {/* Image information modal */}
      {wishlistModalOpen && modalImage && (
        <WishlistModal 
        image={modalImage} 
        onClose={closeModal} 
        onTagClick={handleTagClick} // Add this prop
      />
      )}
    </>
  );
};

export default WishlistGrid;