import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import CategoryList from "./components/CategoryList";
import ImageGrid from "./components/ImageGrid";
import AddCategoryForm from "./components/AddCategoryForm";
import AddImageForm from "./components/AddImageForm";
import ConfirmationModal from "./components/ConfirmationModal";
import Login from "./components/Login";
import UserSearch from "./components/UserSearch";
import DeleteAccountModal from "./components/DeleteAccountModal";
import { fetchCategories } from "./services/api";
import { logout, deleteUserAccount } from "./services/auth";
import { useUser } from "./context/UserContext";
import { getFollowers, getFollowing, getUserProfile } from "./services/api";
import FollowListModal from "./components/FollowListModal";
import EditProfileForm from "./components/EditProfileForm";
import WishlistGrid from "./components/WishlistGrid";
import TagSearchModal from "./components/TagSearchModal";
import "./App.css";

const App = () => {
  const navigate = useNavigate();
  const refreshedProfile = useRef(false); 
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { user, loginUser, logoutUser, loading: authLoading } = useUser();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [imageCache, setImageCache] = useState({});
  const [images, setImages] = useState([]);
  const [selectedCategoryData, setSelectedCategoryData] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [tagSearchModalOpen, setTagSearchModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");

  const handleProfileUpdated = (updatedProfile) => {
    setShowEditProfile(false);
    loginUser(updatedProfile); // Update user context with new data
  };

  const handleTagClick = (tag) => {
    console.log("handleTagClick in App.js called with tag:", tag); // Debug logging
  
    // Only open modal if we have a valid tag
    if (tag && typeof tag === 'string' && tag.trim() !== '') {
      setSelectedTag(tag);
      setTagSearchModalOpen(true);
    } else {
      console.error("Invalid tag received:", tag);
    }
  };

  const loadCategories = async () => {
    if (!user) return; // Don't load if not logged in
    
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
      
      // Initialize or update cache with fetched data
      const newCache = { ...imageCache };
      data.forEach(category => {
        if (category.images) {
          newCache[category.id] = category.images;
        }
      });
      setImageCache(newCache);
      
      // Select first category if needed
      if (data.length > 0) {
        if (!selectedCategory || !data.some(cat => cat.name === selectedCategory)) {
          setSelectedCategory(data[0].name);
          setSelectedCategoryData(data[0]);
        } else {
          // Update the selected category data
          const selected = data.find(cat => cat.name === selectedCategory);
          if (selected) {
            setSelectedCategoryData(selected);
          }
        }
      } else {
        setSelectedCategory("");
        setSelectedCategoryData(null);
      }
      
      setLoading(false);
    } catch (err) {
      setError("Failed to load collections. Please try again later.");
      setLoading(false);
      console.error(err);
    }
  };

  // Load user follower and following counts
  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      // Get followers count
      const followers = await getFollowers();
      console.log("Followers data:", followers);
      setFollowerCount(followers.length);
      
      // Get following count
      const following = await getFollowing();
      console.log("Following data:", following);
      setFollowingCount(following.length);
    } catch (err) {
      console.error("Failed to load user stats:", err);
    }
  };

  const loadFreshUserProfile = async () => {
    try {
      const freshUser = await getUserProfile(user.id || user.user_id);
      loginUser(freshUser); 
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };

  useEffect(() => {
    // re-loading only if it's refreshed 
    if (user && !refreshedProfile.current) {
      refreshedProfile.current = true; 
      loadFreshUserProfile();
      loadCategories();
      loadUserStats();
    }
}, [user]);

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
    const selected = categories.find((cat) => cat.name === categoryName);
    if (selected) {
      setSelectedCategoryData(selected);
    }
  };

  const handleCategoryAdded = () => {
    setShowAddCategory(false);
    loadCategories();
  };

  const handleImageAdded = () => {
    setShowAddImage(false);
    loadCategories();
  };
  
  const handleCategoryDeleted = (categoryId) => {
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    setCategories(updatedCategories);
    
    if (selectedCategoryData && selectedCategoryData.id === categoryId) {
      if (updatedCategories.length > 0) {
        setSelectedCategory(updatedCategories[0].name);
        setSelectedCategoryData(updatedCategories[0]);
        setImages(updatedCategories[0].images || []);
      } else {
        setSelectedCategory("");
        setSelectedCategoryData(null);
        setImages([]);
      }
    }
  };
  
  const handleImagesDeleted = (deletedImageIds) => {
    if (selectedCategoryData && imageCache[selectedCategoryData.id]) {
      setImageCache(prevCache => ({
        ...prevCache,
        [selectedCategoryData.id]: prevCache[selectedCategoryData.id].filter(img => !deletedImageIds.includes(img.id))
      }));
    }
    
    loadCategories();
  };

  const handleLogout = async () => {
    try {
      await logout();
      logoutUser();
      setCategories([]);
      setSelectedCategory("");
      setSelectedCategoryData(null);
      setImageCache({});
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if the server request fails, log the user out on the client side
      logoutUser();
      setCategories([]);
      setSelectedCategory("");
      setSelectedCategoryData(null);
      setImageCache({});
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      const result = await deleteUserAccount();
      console.log("Account deletion result:", result);
      
      // Log the user out
      logoutUser();
      setCategories([]);
      setSelectedCategory("");
      setSelectedCategoryData(null);
      setImageCache({});
      
      // Close the modal
      setShowDeleteAccountModal(false);
      setIsDeletingAccount(false);
      
      // Could add a success message or redirect here
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeletingAccount(false);
      // Handle error (maybe show an error message)
      alert("Failed to delete your account. Please try again.");
    }
  };

  const handleCategoryUpdated = (categoryId) => {
    // Refresh categories
    loadCategories();
  };
  
  const handleUserDropdownToggle = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const handleWishlistTransfer = (transferredItemIds) => {
    // Refresh categories to update both main collection and wishlist
    loadCategories();
  };

  // If still checking authentication or not logged in, show login screen
  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  // If not logged in, show login screen
  if (!user) {
    return <Login onLoginSuccess={loginUser} />;
  }

  if (loading && categories.length === 0) {
    return <div className="loading">Loading collections...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>My Collections</h1>
          <UserSearch />
        </div>
        
        <div className="header-right">
          <div className="user-section">
            <div className="user-stats">
              <button 
                className="stat-button" 
                onClick={() => setShowFollowersModal(true)}
              >
                <strong>{followerCount}</strong> followers
              </button>
              <button 
                className="stat-button" 
                onClick={() => setShowFollowingModal(true)}
              >
                <strong>{followingCount}</strong> following
              </button>
            </div>
            <div className="user-info" onClick={handleUserDropdownToggle}>
              {user.profile_picture_url && (
                <img 
                  src={user.profile_picture_url} 
                  alt={user.first_name} 
                  className="user-avatar"
                />
              )}
              <span className="welcome-message">
                {user.display_name || user.first_name || user.email.split('@')[0]}
              </span>
              <div className="dropdown-arrow">▼</div>
            </div>
            
            {showUserDropdown && (
              <div className="user-dropdown">
                <div className="dropdown-user-info" onClick={() => navigate("/profile")}>
                  <div className="dropdown-name">{user.first_name} {user.last_name}</div>
                  <div className="dropdown-email">{user.email}</div>
                </div>
                <div className="dropdown-divider"></div>
                
                {/* Add this option */}
                <button className="dropdown-item" onClick={() => setShowEditProfile(true)}>
                  Edit Profile
                </button>
                
                <button className="dropdown-item" onClick={handleLogout}>
                  Logout
                </button>
                <button className="dropdown-item delete" onClick={() => setShowDeleteAccountModal(true)}>
                  Delete Account
                </button>
              </div>
            )}
          </div>
          
          <div className="action-buttons">
            <button 
              className="action-button" 
              onClick={() => setShowAddCategory(true)}
            >
              Add New Collection
            </button>
            {categories.length > 0 && (
              <button 
                className="action-button" 
                onClick={() => setShowAddImage(true)}
              >
                Add to Collection
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Category List Component */}
      <CategoryList
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        onCategoryDeleted={handleCategoryDeleted}
        onCategoryUpdated={handleCategoryUpdated}
        onTagClick={handleTagClick}
      />

      {/* Image Grid Component */}
      <ImageGrid 
        categoryId={selectedCategoryData?.id}
        images={selectedCategoryData ? imageCache[selectedCategoryData.id] || [] : []}
        categoryPlaceholder={selectedCategoryData?.placeholder_presigned_url}
        onImagesDeleted={handleImagesDeleted} 
        onTagClick={handleTagClick}
      />

      {selectedCategoryData && (
        <WishlistGrid 
          categoryId={selectedCategoryData?.id}
          images={selectedCategoryData ? imageCache[selectedCategoryData.id] || [] : []}
          onImagesDeleted={handleImagesDeleted}
          onImagesUpdated={() => loadCategories()}
          onTransferToCollection={handleWishlistTransfer}
          onTagClick={handleTagClick}
        />
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <AddCategoryForm 
          onClose={() => setShowAddCategory(false)}
          onSuccess={handleCategoryAdded}
        />
      )}

      {/* Add Image Modal */}
      {showAddImage && (
        <AddImageForm 
          categories={categories}
          selectedCategory={selectedCategory}
          onClose={() => setShowAddImage(false)}
          onSuccess={handleImageAdded}
        />
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <DeleteAccountModal 
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteAccountModal(false)}
          isLoading={isDeletingAccount}
        />
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

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileForm 
          user={user}
          onClose={() => setShowEditProfile(false)}
          onSuccess={handleProfileUpdated}
        />
      )}

      {/* Tag Search Modal */}
      {tagSearchModalOpen && (
        <TagSearchModal
          tag={selectedTag}
          onClose={() => setTagSearchModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;