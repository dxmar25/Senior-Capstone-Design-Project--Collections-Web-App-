import React, { useState } from "react";
import "./Modal.css";
import "./Tags.css";
import { updateCategoryTags } from "../services/api";

const EditTagsForm = ({ category, onClose, onSuccess }) => {
  const [tags, setTags] = useState(category.tags || []);
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError("");
      
      await updateCategoryTags(category.id, tags);
      onSuccess(tags);
    } catch (err) {
      setError("Failed to update tags. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Tags for {category.name}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
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
              {loading ? "Saving..." : "Save Tags"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTagsForm;