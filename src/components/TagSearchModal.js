import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { searchByTag } from "../services/api";
import "./Modal.css";
import "./FollowList.css";

const TagSearchModal = ({ tag, onClose }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Log the tag value for debugging
    console.log("TagSearchModal received tag:", tag);
    
    const loadResults = async () => {
      try {
        // Only search if we have a valid tag
        if (!tag || typeof tag !== 'string' || tag.trim() === '') {
          setError("No valid tag provided");
          setLoading(false);
          return;
        }
        
        setLoading(true);
        const data = await searchByTag(tag);
        setResults(data);
        setLoading(false);
      } catch (err) {
        console.error(`Error searching for tag "${tag}":`, err);
        setError(`Failed to search for tag "${tag}". Please try again later.`);
        setLoading(false);
      }
    };
    
    if (tag) {
      loadResults();
    }
  }, [tag]);
  
  // Handle closing by clicking outside the modal
  const handleOverlayClick = (e) => {
    if (e.target.className === "modal-overlay") {
      onClose();
    }
  };
  
  const modalContent = () => {
    if (loading) {
      return <div className="loading">Searching for "{tag}"...</div>;
    }
    
    if (error) {
      return <div className="error">{error}</div>;
    }
    
    if (results.length === 0) {
      return (
        <div className="empty-follow-list">
          No users found with content tagged "{tag}".
        </div>
      );
    }
    
    return (
      <div className="follow-list-container">
        {results.map((result, index) => (
          <div key={`${result.type}-${result.id}-${index}`} className="follow-item">
            <Link to={`/profile/${result.user.id}`} className="user-link" onClick={onClose}>
              <div className="user-info-wrapper">
                {result.user.profile_picture_url && (
                  <img 
                    src={result.user.profile_picture_url} 
                    alt={result.user.first_name} 
                    className="user-list-avatar"
                  />
                )}
                <div className="user-info">
                  <span className="user-name">
                    {result.user.display_name || `${result.user.first_name} ${result.user.last_name}`}
                  </span>
                  <span className="user-username">@{result.user.username}</span>
                </div>
              </div>
            </Link>
            
            <div className="tag-result-preview">
              {result.image_url && (
                <img 
                  src={result.image_url} 
                  alt={result.title} 
                  className="tag-result-thumbnail"
                />
              )}
              <div className="tag-result-info">
                <div className="tag-result-type">
                  {result.type === 'category' ? 'Collection' : 'Image'}
                </div>
                <div className="tag-result-name" title={result.title}>
                  {result.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content follow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Results for tag: "{tag}"</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {modalContent()}
      </div>
    </div>
  );
};

export default TagSearchModal;