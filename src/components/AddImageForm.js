import React, { useState } from "react";
import { uploadImage } from "../services/api";
import "./Modal.css";
import "./Tags.css";
import { useEffect } from "react"; // Required for dynamic updates if needed


const AddImageForm = ({ categories, selectedCategory, onClose, onSuccess }) => {
  const [itemId, setItemId] = useState(null); //bonnie
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(
    categories.find(cat => cat.name === selectedCategory)?.id || ""
  );
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  // Add these new states
  const [description, setDescription] = useState("");
  const [valuation, setValuation] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [isWishlist, setIsWishlist] = useState(false);
  const [purchaseUrl, setPurchaseUrl] = useState("");

  const fetchAiGeneratedData = async (title, collection) => {
    try {
      // URL for your API endpoint, replace this with the correct URL
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/generate-ai-fields/';

       // Making a POST request instead of GET
       const response = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, name: collection }) // Send data in the body
      });
  
      if (response.ok) {
        // If the request is successful, parse the response as JSON
        const data = await response.json();
  
        // Update the UI (state) with the received values
        setDescription(description); // Update description
        setValuation(valuation);     // Update valuation
        setTags(tags);               // Update tags
      } else {
        const errorText = await response.text();
        console.error('Error fetching AI data:', errorText);
        throw new Error('Failed to fetch AI data');
      }
    } catch (error) {
      console.error('Error in fetchAiGeneratedData:', error);
      throw error;
    }
  };
  

  const handleGenerateAI = async () => {
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    const API_URL = `${API_BASE}/generate-ai-fields/`;
        // const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/';

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        collection: selectedCategory,
        is_wishlist: isWishlist
      })
    });

    const data = await response.json();

    console.log("API response:", data); // Log the response to check the data

    if (response.ok) {
      setDescription(data.description);
      setValuation(data.valuation);
      setTags(data.tags);
      if (data.purchase_url) setPurchaseUrl(data.purchase_url);
    } else {
      console.error("AI error:", data.error);
    }
};


  
  
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add these functions for tag handling
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
    
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    
    if (!categoryId) {
      setError("Please select a collection");
      return;
    }
    
    if (!imageFile) {
      setError("Please select an image to upload");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("Form submission data:");
      console.log("- Title:", title);
      console.log("- Category ID:", categoryId);
      console.log("- Image file:", imageFile, "Type:", imageFile.type, "Size:", imageFile.size);

      // Validate image file
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
      if (!validImageTypes.includes(imageFile.type)) {
        setError(`Unsupported file type: ${imageFile.type}. Please use JPEG, PNG, GIF or WebP.`);
        setLoading(false);
        return;
      }

      if (imageFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError("File is too large. Maximum size is 10MB.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", categoryId);
      formData.append("file", imageFile);
      
      // Add new fields
      if (description) {
        formData.append("description", description);
      }
      
      if (valuation) {
        formData.append("valuation", valuation);
      }
      
      if (showTags && tags.length > 0) {
        formData.append("tags", JSON.stringify(tags));
      }

      if (isWishlist) {
        formData.append("is_wishlist", true);
        if (purchaseUrl) {
          formData.append("purchase_url", purchaseUrl);
        }
      }

      // Verify form data before sending
      console.log("Form data check:");
      console.log("- Title value:", formData.get("title"));
      console.log("- Category value:", formData.get("category"));
      console.log("- File value:", formData.get("file"), 
                 "File name:", formData.get("file")?.name, 
                 "File type:", formData.get("file")?.type);

      const response = await uploadImage(formData);
      console.log("Upload successful:", response);
      
      // Show success message briefly before closing
      setError("");
      setLoading(false);
      
      // Delay the close slightly to show success state
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err) {
      let errorMessage = `Upload failed: ${err.message}`;
      
      // Try to extract more specific error information
      if (err.message.includes("400")) {
        errorMessage = "The server rejected the upload. Please check file format and size.";
      } else if (err.message.includes("500")) {
        errorMessage = "Server error during upload. Please try again later.";
      } else if (err.message.includes("network")) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      setError(errorMessage);
      console.error("Upload error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add to Collection</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="image-title">Title</label>
            <input
              id="image-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter image title"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category-select">Collection</label>
            <select
              id="category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Select a collection</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="image-file">Image</label>
            <input
              id="image-file"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
          </div>
          
          {/* Add new fields here */}

          <div className="form-group">
            <button 
              type="button" 
              className="generate-ai-button"
              onClick={handleGenerateAI}
              disabled={!title || !categoryId}
            >
              Generate AI
            </button>
          </div>

          <div className="form-group">

            <label htmlFor="image-description">Description (Optional)</label>
            <textarea
              id="image-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter image description"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="image-valuation">Valuation ($) (Optional)</label>
            <input
              id="image-valuation"
              type="number"
              value={valuation}
              onChange={(e) => setValuation(e.target.value)}
              placeholder="Enter value (if applicable)"
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

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isWishlist}
                onChange={(e) => setIsWishlist(e.target.checked)}
              />
              Add to Wishlist
            </label>
          </div>

          {isWishlist && (
            <div className="form-group">
              <label htmlFor="purchase-url">Purchase URL (Optional)</label>
              <input
                id="purchase-url"
                type="url"
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
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
          {/* End of new fields */}
          
          {preview && (
            <div className="image-preview">
              <h3>Preview</h3>
              <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px" }} />
            </div>
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
              {loading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddImageForm;