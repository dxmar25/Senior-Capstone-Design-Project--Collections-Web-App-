import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFollowers, getFollowing, followUser, unfollowUser } from "../services/api";
import "./Modal.css";
import "./FollowList.css";

const FollowListModal = ({ type, onClose, userId = null }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        
        let data;
        if (type === "followers") {
          data = await getFollowers(userId);
        } else {
          data = await getFollowing(userId);
        }
        
        setUsers(data);
        setLoading(false);
      } catch (err) {
        console.error(`Error loading ${type}:`, err);
        setError(`Failed to load ${type}. Please try again later.`);
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [type, userId]);
  
  const handleFollowToggle = async (userId, currentlyFollowing) => {
    try {
      if (currentlyFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      
      // Update local state
      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, is_following: !currentlyFollowing };
        }
        return user;
      }));
    } catch (err) {
      console.error("Failed to update follow status:", err);
    }
  };
  
  const modalContent = () => {
    if (loading) {
      return <div className="loading">Loading {type}...</div>;
    }
    
    if (error) {
      return <div className="error">{error}</div>;
    }
    
    if (users.length === 0) {
      return (
        <div className="empty-follow-list">
          {type === "followers" 
            ? "No followers yet." 
            : "Not following anyone yet."}
        </div>
      );
    }
    
    return (
      <div className="follow-list-container">
        {users.map(user => (
          <div key={user.id} className="follow-item">
            <Link to={`/profile/${user.id}`} className="user-link" onClick={onClose}>
              <div className="user-info-wrapper">
                {user.profile_picture_url && (
                  <img 
                    src={user.profile_picture_url} 
                    alt={user.first_name} 
                    className="user-list-avatar"
                  />
                )}
                <div className="user-info">
                  <span className="user-name">
                    {user.display_name || `${user.first_name} ${user.last_name}`}
                  </span>
                  <span className="user-username">@{user.username}</span>
                </div>
              </div>
            </Link>
            
            {type === "followers" && (
              <button 
                className={`follow-button ${user.is_following ? 'following' : ''}`}
                onClick={() => handleFollowToggle(user.id, user.is_following)}
              >
                {user.is_following ? "Following" : "Follow"}
              </button>
            )}
            
            {type === "following" && (
              <button 
                className="unfollow-button"
                onClick={() => handleFollowToggle(user.id, true)}
              >
                Unfollow
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-content follow-modal">
        <div className="modal-header">
          <h2>{type === "followers" ? "Followers" : "Following"}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {modalContent()}
      </div>
    </div>
  );
};

export default FollowListModal;