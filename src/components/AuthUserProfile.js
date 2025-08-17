import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, fetchCategories, fetchProfileStats } from "../services/api";
import { useUser } from "../context/UserContext";
import CategoryList from "./CategoryList";
import ImageGrid from "./ImageGrid";
import FollowListModal from "./FollowListModal";
import "./AuthUserProfile.css";

const AuthUserProfile = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryData, setSelectedCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [profileStats, setProfileStats] = useState({
    totalValue: 0,
    totalCollections: 0,
    totalItems: 0,
  });

  useEffect(() => {
    if (!user || (!user.user_id && !user.id)) return;

    const loadProfile = async () => {
        try {
            setLoading(true);

            const profileData = await getUserProfile(user.user_id || user.id);
            setProfile(profileData);

            const categoryData = await fetchCategories();
            setCategories(categoryData);

            if (categoryData.length > 0) {
                setSelectedCategory(categoryData[0].name);
                setSelectedCategoryData(categoryData[0]);
            }

            // Fetch profile stats
            const profileStats = await fetchProfileStats(user.user_id || user.id);
            setProfileStats(profileStats); // Ensure this state variable exists

        } catch (err) {
            console.error("Failed to load profile:", err);
        } finally {
            setLoading(false);
        }
    };

    loadProfile();
}, [user?.user_id]);

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
    const selected = categories.find((cat) => cat.name === categoryName);
    if (selected) {
      setSelectedCategoryData(selected);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <div className="loading">Loading your profile...</div>;
  }

  if (!profile) {
    return <div className="error">You must be logged in to view this page.</div>;
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

          {profile.bio && <p className="user-bio">{profile.bio}</p>}

          <div className="follow-stats">
            <button className="stat-item" onClick={() => setShowFollowersModal(true)}>
              <strong>{profile.follower_count ?? 0}</strong> followers
            </button>
            <button className="stat-item" onClick={() => setShowFollowingModal(true)}>
              <strong>{profile.following_count ?? 0}</strong> following
            </button>
          </div>
        </div>

        <div className="profile-stats">
            <div className="profile-stat-box">
            <strong>Total Value:</strong> 
              {profileStats.totalValue > 0 
                ? ` $${profileStats.totalValue}` 
                : " No collections yet."}
            </div>
            <div className="profile-stat-box">
                <strong>Total Collections:</strong> {profileStats.totalCollections || "No collections yet."}
            </div>
            <div className="profile-stat-box">
                <strong>Total Items:</strong> {profileStats.totalItems || "No items yet."}
            </div>
        </div>

      </header>

        <div className="profile-action-buttons">
            <button onClick={() => navigate("/financialEval")}>
            Financial Evaluation
            </button>
            <button>
            Achievements
            </button>
            <button>
            Bookmarks
            </button>
        </div>

      <h2>Your Collections</h2>

      {categories.length === 0 ? (
        <div className="no-collections">
          <p>You have no collections yet. Start by adding one!</p>
        </div>
      ) : (
        <>
          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />

          <ImageGrid 
            categoryId={selectedCategoryData?.id}
            images={selectedCategoryData?.images || []}
            categoryPlaceholder={selectedCategoryData?.placeholder_presigned_url}
          />
        </>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <FollowListModal 
          type="followers" 
          onClose={() => setShowFollowersModal(false)} 
        />
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <FollowListModal 
          type="following" 
          onClose={() => setShowFollowingModal(false)} 
        />
      )}
    </div>
  );
};

export default AuthUserProfile;
