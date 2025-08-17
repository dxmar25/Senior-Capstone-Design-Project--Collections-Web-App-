import React, { useState } from "react";
import "./Modal.css";
import "./Tags.css";
import { updateImageDetails } from "../services/api";

const EditImageDetailsForm = ({ image, onClose, onSuccess, isWishlistItem = false }) => {
  const [formData, setFormData] = useState({
    title: image.title || "",
    description: image.description || "",
    valuation: image.valuation || "",
    purchase_url: image.purchase_url || "",
  });
  const [tags, setTags] = useState(image.tags || []);
  const [newTag, setNewTag] = useState("");
  const [showTags, setShowTags] = useState(tags.length > 0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

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
    
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const imageData = {
        ...formData,
        tags: showTags ? tags : []
      };
      
      const response = await updateImageDetails(image.id, imageData);
      onSuccess(response);
    } catch (err) {
      setError("Failed to update image details. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Image Details</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="image-title">Title</label>
            <input
              id="image-title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter image title"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="image-description">Description</label>
            <textarea
              id="image-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter image description"
              rows={4}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="image-valuation">Valuation ($)</label>
            <input
              id="image-valuation"
              type="number"
              name="valuation"
              value={formData.valuation}
              onChange={handleChange}
              placeholder="Enter image value"
              step="0.01"
              min="0"
            />
          </div>
          
          <div className="form-group tags-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showTags}
                onChange={() => setShowTags(!showTags)}
              />
              Add tags to this image
            </label>
          </div>

          {isWishlistItem && (
            <div className="form-group">
              <label htmlFor="purchase-url">Purchase URL</label>
              <input
                id="purchase-url"
                type="url"
                name="purchase_url"
                value={formData.purchase_url}
                onChange={handleChange}
                placeholder="Enter URL where item can be purchased"
              />
            </div>
          )}
          
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
              {loading ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditImageDetailsForm;