import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getUserProfile, getUserCategories, followUser, unfollowUser } from "../services/api";
import CategoryList from "./CategoryList";
import ImageGrid from "./ImageGrid";
import FollowListModal from "./FollowListModal";
import "./UserProfile.css";
import WishlistGrid from "./WishlistGrid";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const user = {}; // Replace with actual user object or context if available
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryData, setSelectedCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user profile
        const profileData = await getUserProfile(userId);
        setProfile(profileData);
        setFollowing(profileData.is_following);
        
        // Fetch user's categories
        const categoriesData = await getUserCategories(userId, userId !== user?.id);
        setCategories(categoriesData);
        
        // Select first category if exists
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].name);
          setSelectedCategoryData(categoriesData[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Failed to load profile. Please try again later.");
        setLoading(false);
      }
    };

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
    const selected = categories.find((cat) => cat.name === categoryName);
    if (selected) {
      setSelectedCategoryData(selected);
    }
  };

  const handleFollowToggle = async () => {
    try {
      setFollowLoading(true);
      
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        // Update follower count immediately
        setProfile(prev => ({
          ...prev,
          follower_count: Math.max(0, prev.follower_count - 1)
        }));
      } else {
        await followUser(userId);
        setFollowing(true);
        // Update follower count immediately
        setProfile(prev => ({
          ...prev,
          follower_count: prev.follower_count + 1
        }));
      }
      
      setFollowLoading(false);
    } catch (err) {
      console.error("Failed to update follow status:", err);
      setFollowLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!profile) {
    return <div className="error">User not found</div>;
  }

  return (
    <div className="user-profile">
      <header className="profile-header">
        <button className="back-button" onClick={handleBack}>
          &larr; Back
        </button>
        
        <div className="profile-info">
          {profile.profile_picture_url && (
            <div className="profile-picture">
              <img 
                src={profile.profile_picture_url} 
                alt={profile.first_name} 
                style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover" }}
              />
            </div>
          )}
          
          <h1>{profile.display_name || `${profile.first_name} ${profile.last_name}`}</h1>
          <p className="username">@{profile.username}</p>
          
          {profile.bio && (
            <p className="user-bio">{profile.bio}</p>
          )}
          
          <div className="follow-stats">
            <button 
              className="stat-item" 
              onClick={() => setShowFollowersModal(true)}
            >
              <strong>{profile.follower_count}</strong> followers
            </button>
            <button 
              className="stat-item" 
              onClick={() => setShowFollowingModal(true)}
            >
              <strong>{profile.following_count}</strong> following
            </button>
          </div>
          
          <button 
            className={`follow-button ${following ? 'following' : ''}`}
            onClick={handleFollowToggle}
            disabled={followLoading}
          >
            {followLoading ? "Processing..." : (following ? "Unfollow" : "Follow")}
          </button>
        </div>
      </header>

      <h2>Collections</h2>
      
      {categories.length === 0 ? (
        <div className="no-collections">
          <p>This user has no public collections.</p>
        </div>
      ) : (
        <>
          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            viewOnly={true}
          />

          <ImageGrid 
            categoryId={selectedCategoryData?.id}
            images={selectedCategoryData?.images || []}
            categoryPlaceholder={selectedCategoryData?.placeholder_presigned_url}
            viewOnly={true}
          />
        </>
      )}

      {selectedCategoryData && (
        <WishlistGrid 
          categoryId={selectedCategoryData?.id}
          images={selectedCategoryData?.images || []}
          categoryPlaceholder={selectedCategoryData?.placeholder_presigned_url}
          viewOnly={true}
        />
      )}
      
      {/* Followers Modal */}
      {showFollowersModal && (
        <FollowListModal 
          type="followers" 
          userId={userId}
          onClose={() => setShowFollowersModal(false)} 
        />
      )}
      
      {/* Following Modal */}
      {showFollowingModal && (
        <FollowListModal 
          type="following" 
          userId={userId}
          onClose={() => setShowFollowingModal(false)} 
        />
      )}
    </div>
  );
};

export default UserProfile;