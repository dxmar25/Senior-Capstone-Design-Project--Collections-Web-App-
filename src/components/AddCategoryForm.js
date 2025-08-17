import React, { useState } from "react";
import { createCategory, createCategoryWithImage } from "../services/api";
import "./Modal.css";
import "./Tags.css";

const AddCategoryForm = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [placeholderImage, setPlaceholderImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    // Check if tag already exists
    if (tags.includes(newTag.trim())) {
      setError("This tag already exists");
      return;
    }
    
    setTags([...tags, newTag.trim()]);
    setNewTag("");
    setError("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && showTags) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Collection name is required");
      return;
    }
  
    try {
      setLoading(true);
      setError("");
  
      if (placeholderImage) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append("name", name);
        formData.append("placeholder_image", placeholderImage);
        
        // Add tags if user added them
        if (showTags && tags.length > 0) {
          formData.append("tags", JSON.stringify(tags));
        }
        
        await createCategoryWithImage(formData);
      } else {
        // No file, use regular JSON endpoint
        const categoryData = { 
          name, 
          placeholder_image: null 
        };
        
        // Add tags if user added them
        if (showTags && tags.length > 0) {
          categoryData.tags = tags;
        }
        
        await createCategory(categoryData);
      }
      
      onSuccess();
    } catch (err) {
      setError("Failed to create collection. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Collection</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category-name">Collection Name</label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter collection name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="placeholder-image">Placeholder Image (Optional)</label>
            <input
              id="placeholder-image"
              type="file"
              accept="image/*"
              onChange={(e) => setPlaceholderImage(e.target.files[0])}
            />
          </div>
          
          {/* Add tags section starts here */}
          <div className="form-group tags-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showTags}
                onChange={() => setShowTags(!showTags)}
              />
              Add tags to this collection
            </label>
          </div>

          {showTags && (
            <>
              <div className="form-group">
                <label htmlFor="new-tag">Add Tag</label>
                <div className="tag-input-container">
                  <input
                    id="new-tag"
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter tag and press Enter"
                  />
                  <button 
                    type="button" 
                    className="add-tag-button"
                    onClick={handleAddTag}
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="tags-container">
                {tags.length > 0 ? (
                  tags.map((tag, index) => (
                    <div key={index} className="tag-item">
                      <span className="tag-text">{tag}</span>
                      <button 
                        type="button" 
                        className="remove-tag-button"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        &times;
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-tags-message">No tags added yet</p>
                )}
              </div>
            </>
          )}
          {/* Add tags section ends here */}

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button" 
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategoryForm;