import React, { useState } from "react";
import { motion } from "framer-motion";
import ConfirmationModal from "./ConfirmationModal";
import { deleteCategory, toggleCategoryVisibility } from "../services/api";
import EditTagsForm from "./EditTagsForm";
import "./Tags.css";
import TagSearchModal from "./TagSearchModal";

const CategoryList = ({ categories, onSelectCategory, selectedCategory, onCategoryDeleted, onCategoryUpdated, viewOnly = false, onTagClick}) => {  const [optionsOpenFor, setOptionsOpenFor] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  // Add this state for Edit Tags functionality
  const [showEditTags, setShowEditTags] = useState(false);
  const [categoryToEditTags, setCategoryToEditTags] = useState(null);
  // const [tagSearchModalOpen, setTagSearchModalOpen] = useState(false);
  // const [selectedTag, setSelectedTag] = useState("");
  
  if (!categories || categories.length === 0) {
    return (
      <div className="no-categories">
        <p>{viewOnly ? "No collections available." : "No collections available. Create your first collection!"}</p>
      </div>
    );
  }

  const handleTagClick = (e, tag) => {
    e.stopPropagation(); // Prevent category selection
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const handleOptionsClick = (e, categoryId) => {
    if (viewOnly) return; // Disable options in view-only mode
    
    e.stopPropagation(); // Prevent category selection
    setOptionsOpenFor(optionsOpenFor === categoryId ? null : categoryId);
  };

  const handleDeleteClick = (e, category) => {
    if (viewOnly) return; // Disable delete in view-only mode
    
    e.stopPropagation(); // Prevent category selection
    setOptionsOpenFor(null);
    setCategoryToDelete(category);
    setShowDeleteConfirmation(true);
  };

  // Add this function for Edit Tags
  const handleEditTagsClick = (e, category) => {
    if (viewOnly) return; // Disable in view-only mode
    
    e.stopPropagation(); // Prevent category selection
    setOptionsOpenFor(null);
    setCategoryToEditTags(category);
    setShowEditTags(true);
  };

  const handleTagsUpdated = (updatedTags) => {
    setShowEditTags(false);
    if (onCategoryUpdated) {
      onCategoryUpdated(categoryToEditTags.id);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      setIsDeleting(true);
      console.log("Deleting category with ID:", categoryToDelete.id);
      await deleteCategory(categoryToDelete.id);
      console.log("Category deletion successful");
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
      setCategoryToDelete(null);
      if (onCategoryDeleted) {
        onCategoryDeleted(categoryToDelete.id);
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      setIsDeleting(false);
      // Add error handling UI here
      alert("Failed to delete category. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setCategoryToDelete(null);
  };

  // Close dropdown if clicked outside
  const handleOutsideClick = () => {
    if (optionsOpenFor !== null) {
      setOptionsOpenFor(null);
    }
  };

  const handleToggleVisibility = async (e, category) => {
    e.stopPropagation(); // Prevent category selection
    setOptionsOpenFor(null);
    
    try {
      setIsTogglingVisibility(true);
      await toggleCategoryVisibility(category.id);
      if (onCategoryUpdated) {
        onCategoryUpdated(category.id);
      }
      setIsTogglingVisibility(false);
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
      setIsTogglingVisibility(false);
      alert("Failed to update collection visibility. Please try again.");
    }
  };

  return (
    <div className="category-grid" onClick={handleOutsideClick}>
      {categories.map((category, index) => (
        <motion.div
          key={category.id || index}
          className={`category-box ${selectedCategory === category.name ? "selected" : ""}`}
          onClick={() => onSelectCategory(category.name)}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <img 
            src={
              category.placeholder_image ? 
                (category.placeholder_image.startsWith('http') ? 
                  category.placeholder_image : 
                  `https://csce482-collections-bucket.s3.amazonaws.com/${category.placeholder_image}`) : 
                "/api/placeholder/300/200"
            }
            alt={category.name}
            onError={(e) => {
              console.error("Failed to load category image:", e);
              e.target.onerror = null; // Prevent infinite error loop
              e.target.src = "/api/placeholder/300/200"; // Fallback placeholder
            }}
          />
          <div className="category-name">{category.name}</div>
          
          {/* Add this section to display tags */}
          {category.tags && category.tags.length > 0 && (
            <div className="category-tags">
              {category.tags.slice(0, 3).map((tag, idx) => (
                <span 
                  key={idx} 
                  className="tag-badge"
                  onClick={(e) => handleTagClick(e, tag)}
                >
                  {tag}
                </span>
              ))}
              {category.tags.length > 3 && (
                <span className="tag-badge">+{category.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* {tagSearchModalOpen && (
              <TagSearchModal
                tag={selectedTag}
                onClose={() => setTagSearchModalOpen(false)}
              />
          )} */}
          
          {/* Only show options button if not in view-only mode */}
          {!viewOnly && (
            <button 
              className="options-button"
              onClick={(e) => handleOptionsClick(e, category.id)}
            >
              <div className="options-icon">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </button>
          )}
          
          {/* Dropdown menu */}
          {optionsOpenFor === category.id && !viewOnly && (
            <div className="dropdown-menu">
              {/* Add the Edit Tags option */}
              <button 
                className="dropdown-item edit-tags"
                onClick={(e) => handleEditTagsClick(e, category)}
              >
                Edit Tags
              </button>
              <button 
                className="dropdown-item visibility"
                onClick={(e) => handleToggleVisibility(e, category)}
                disabled={isTogglingVisibility}
              >
                {category.is_public ? "Make Private" : "Make Public"}
              </button>
              <button 
                className="dropdown-item delete"
                onClick={(e) => handleDeleteClick(e, category)}
              >
                Delete Collection
              </button>
            </div>
          )}
        </motion.div>
      ))}
      
      {/* Delete confirmation modal */}
      {showDeleteConfirmation && categoryToDelete && (
        <ConfirmationModal 
          title="Delete Collection?"
          message={
            categoryToDelete.images && categoryToDelete.images.length > 0 
              ? `This will permanently delete "${categoryToDelete.name}" and all ${categoryToDelete.images.length} images within it. This action cannot be undone.`
              : `This will permanently delete the "${categoryToDelete.name}" collection. This action cannot be undone.`
          }
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isLoading={isDeleting}
        />
      )}
      
      {/* Edit Tags modal */}
      {showEditTags && categoryToEditTags && (
        <EditTagsForm 
          category={categoryToEditTags}
          onClose={() => setShowEditTags(false)}
          onSuccess={handleTagsUpdated}
        />
      )}
    </div>
  );
};

export default CategoryList;