import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFollowers, getFollowing, followUser, unfollowUser } from "../services/api";
import "./FollowList.css";

const FollowList = ({ type }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        
        let data;
        if (type === "followers") {
          data = await getFollowers();
        } else {
          data = await getFollowing();
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
  }, [type]);
  
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
          ? "You don't have any followers yet." 
          : "You're not following anyone yet."}
      </div>
    );
  }
  
  return (
    <div className="follow-list">
      <h2>{type === "followers" ? "Your Followers" : "People You Follow"}</h2>
      
      <div className="follow-list-container">
        {users.map(user => (
          <div key={user.id} className="follow-item">
            <Link to={`/profile/${user.id}`} className="user-link">
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
    </div>
  );
};

export default FollowList;