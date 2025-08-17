// Create a new file: src/components/EditProfileForm.js
import React, { useState, useEffect } from "react";
import { updateUserProfile } from "../services/api";
import "./Modal.css";

const EditProfileForm = ({ user, onClose, onSuccess }) => {
    console.log("User in EditProfileForm:", user);
  const [formData, setFormData] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    display_name: user.display_name || "",
    bio: user.bio || "",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(user.profile_picture_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Use user_id instead of id
    const userId = user.user_id || user.id;
    
    if (!userId) {
      setError("User information is missing. Please try again or reload the page.");
      console.error("User ID is missing:", user);
      return;
    }
    
    try {
      setLoading(true);
      setError("");
  
      // Create form data
      const data = new FormData();
      data.append("first_name", formData.first_name);
      data.append("last_name", formData.last_name);
      data.append("display_name", formData.display_name);
      data.append("bio", formData.bio);

      console.log("Sending data:", {
        first_name: formData.first_name,
        last_name: formData.last_name,
        display_name: formData.display_name,
        bio: formData.bio
      });
      
      if (profilePicture) {
        data.append("profile_picture", profilePicture);
      }
  
      console.log("Submitting profile update for user ID:", userId);
      const response = await updateUserProfile(userId, data);
      console.log("Profile updated:", response);
      
      setLoading(false);
      onSuccess(response);
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Profile</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="profile-picture">Profile Picture</label>
            <input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            
            {preview && (
              <div className="image-preview">
                <img 
                  src={preview} 
                  alt="Profile Preview" 
                  // style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "50%" }} 
                  
                />
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="display-name">Display Name</label>
            <input
              id="display-name"
              name="display_name"
              type="text"
              value={formData.display_name}
              onChange={handleChange}
              placeholder="Enter display name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="first-name">First Name</label>
            <input
              id="first-name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="last-name">Last Name</label>
            <input
              id="last-name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Enter last name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
              rows={4}
              style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
            />
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
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileForm;