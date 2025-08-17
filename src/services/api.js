const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const fetchCategories = async () => {
  try {
    const response = await fetch(`${API_URL}/categories/`, {
      method: 'GET',
      credentials: 'include',  // Important: This sends cookies with the request
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

export const createCategory = async (categoryData) => {
  try {
    // First, get the CSRF token
    const csrfResponse = await fetch(`${API_URL}/get-csrf-token/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!csrfResponse.ok) {
      console.error("Failed to get CSRF token:", csrfResponse.status);
    }
    
    // Extract the CSRF token from the cookie
    const csrfToken = document.cookie.split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';
    
    const response = await fetch(`${API_URL}/categories/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(categoryData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};

export const createCategoryWithImage = async (formData) => {
  try {
    // First, get the CSRF token
    const csrfResponse = await fetch(`${API_URL}/get-csrf-token/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!csrfResponse.ok) {
      console.error("Failed to get CSRF token:", csrfResponse.status);
    }
    
    // Extract the CSRF token from the cookie
    const csrfToken = document.cookie.split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';
    
    console.log("DEBUG: Sending category with image to API");
    console.log("DEBUG: FormData contents:");
    for (let pair of formData.entries()) {
      console.log(`   ${pair[0]}: ${pair[1]}`);
    }
    
    console.log("DEBUG: Using CSRF token:", csrfToken);
    
    const response = await fetch(`${API_URL}/upload-category-with-image/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData, // FormData for file upload
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating category with image:", error);
    throw error;
  }
};

export const uploadImage = async (formData) => {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    console.log("DEBUG: Sending image upload to API");
    console.log("DEBUG: FormData contents:");
    for (let pair of formData.entries()) {
      console.log(`   ${pair[0]}: ${pair[1]}`);
    }
    
    // Try the primary endpoint
    try {
      const response = await fetch(`${API_URL}/upload-image/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorText = await response.text();
      console.error('Server response from primary endpoint:', errorText);
      console.log('Trying alternate endpoint...');
      
      // If primary endpoint fails, try the alternate endpoint
      const altResponse = await fetch(`${API_URL}/images/upload/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      });
      
      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.error('Server response from alternate endpoint:', altErrorText);
        throw new Error(`HTTP error! Status: ${altResponse.status}`);
      }
      
      return await altResponse.json();
    } catch (fetchError) {
      throw fetchError;
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/categories/${categoryId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

export const deleteImage = async (imageId) => {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/images/${imageId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

export const bulkDeleteImages = async (imageIds) => {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/bulk-delete-images/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ image_ids: imageIds }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error bulk deleting images:", error);
    throw error;
  }
};

export const getUserStats = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/profiles/${userId}/stats/`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw error;
  }
};

// User profile functions
export const searchUsers = async (query) => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`${API_URL}/profiles/?search=${encodedQuery}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/profiles/${userId}/`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const getUserCategories = async (userId, publicOnly = false) => {
  try {
    const url = publicOnly ? 
      `${API_URL}/profiles/${userId}/categories/?public_only=true` : 
      `${API_URL}/profiles/${userId}/categories/`;
      
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching user categories:", error);
    throw error;
  }
};

export const followUser = async (userId) => {
  try {
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/follows/follow/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
};

export const unfollowUser = async (userId) => {
  try {
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/follows/unfollow/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};

export const getFollowers = async (userId = null) => {
  try {
    // If userId is provided, get followers for that user, otherwise get current user's followers
    const endpoint = userId ? 
      `${API_URL}/profiles/${userId}/followers/` : 
      `${API_URL}/follows/followers/`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching followers:", error);
    throw error;
  }
};

export const getFollowing = async (userId = null) => {
  try {
    // If userId is provided, get following for that user, otherwise get current user's following
    const endpoint = userId ? 
      `${API_URL}/profiles/${userId}/following/` : 
      `${API_URL}/follows/following/`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching following:", error);
    throw error;
  }
};

// Utility function to get CSRF token
const getCsrfToken = async () => {
  try {
    // First, ensure the CSRF cookie is set
    await fetch(`${API_URL}/get-csrf-token/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    // Extract the token from the cookie
    return document.cookie.split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';
  } catch (error) {
    console.error("Error getting CSRF token:", error);
    return '';
  }
};

export const toggleCategoryVisibility = async (categoryId) => {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/categories/${categoryId}/toggle-visibility/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error toggling category visibility:", error);
    throw error;
  }
};

export const updateUserProfile = async (userId, formData) => {
  try {
    // Debug
    console.log("updateUserProfile called with userId:", userId);
    console.log("FormData contents:");
    for (let pair of formData.entries()) {
      console.log(`${pair[0]}: ${pair[1]}`);
    }
    
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/profiles/${userId}/update/`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    });
    
    // Debug
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Profile update response:", data);
    return data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const updateCategoryTags = async (categoryId, tags) => {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/categories/${categoryId}/update-tags/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ tags }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating category tags:", error);
    throw error;
  }
};

export const updateImageDetails = async (imageId, imageData) => {
  try {
    // Get CSRF token first
    const csrfToken = await getCsrfToken();
    
    // Try sending as form data instead of JSON
    const formData = new FormData();
    for (const key in imageData) {
      if (key === 'tags' && Array.isArray(imageData[key])) {
        formData.append(key, JSON.stringify(imageData[key]));
      } else {
        formData.append(key, imageData[key]);
      }
    }
    
    const response = await fetch(`${API_URL}/images/${imageId}/update-details/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
        // Don't set Content-Type here, let the browser set it with the boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating image details:", error);
    throw error;
  }
};

export const createCategoryWithTags = async (categoryData) => {
  try {
    // First, get the CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/categories/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(categoryData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating category with tags:", error);
    throw error;
  }
};

export const createCategoryWithImageAndTags = async (formData) => {
  try {
    // First, get the CSRF token
    const csrfResponse = await fetch(`${API_URL}/get-csrf-token/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!csrfResponse.ok) {
      console.error("Failed to get CSRF token:", csrfResponse.status);
    }
    
    // Extract the CSRF token from the cookie
    const csrfToken = document.cookie.split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';
    
    console.log("DEBUG: Sending category with image and tags to API");
    console.log("DEBUG: FormData contents:");
    for (let pair of formData.entries()) {
      console.log(`   ${pair[0]}: ${pair[1]}`);
    }
    
    console.log("DEBUG: Using CSRF token:", csrfToken);
    
    const response = await fetch(`${API_URL}/upload-category-with-image/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData, // FormData for file upload
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating category with image and tags:", error);
    throw error;
  }
};

export const transferToCollection = async (imageId) => {
  try {
    // Get CSRF token
    const csrfToken = await getCsrfToken();
    
    const response = await fetch(`${API_URL}/images/${imageId}/transfer-to-collection/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error transferring wishlist item:", error);
    throw error;
  }
};

export const fetchProfileStats = async () => {
  try {
      const response = await fetch(`${API_URL}/profiles/stats/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.json();
  } catch (error) {
      console.error("Error fetching profile stats:", error);
      throw error;
  }
};

export const fetchFinancialData = async () => {
  try {
      const response = await fetch(`${API_URL}/financial-data/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      // // Optionally format `monthlySpending` if needed
      const monthlySpending = data.monthlySpending
          ? data.monthlySpending.map(item => ({
                ...item,
                amount: parseFloat(item.amount).toFixed(2), // Format amounts
            }))
          : [];

      return {
          totalSpending: data.totalSpending,
          collections: data.collections,
          monthlySpending,  // Ensure monthlySpending is passed along
      };
  } catch (error) {
      console.error("Error fetching financial data:", error);
      throw error;
  }
};

export const saveGoal = async (userId, goalData) => {
  try {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_URL}/profiles/${userId}/goals/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(goalData),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error saving goal:", error);
    throw error;
  }
};

export const getUserGoals = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/profiles/${userId}/goals/`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user goals:", error);
    throw error;
  }
};

export const searchByTag = async (tag) => {
  try {
    const encodedTag = encodeURIComponent(tag);
    const response = await fetch(`${API_URL}/search/by-tag/?tag=${encodedTag}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error searching by tag:", error);
    throw error;
  }
};

