// src/services/auth.js
const API_URL = process.env.REACT_APP_API_URL || 'https://aup06hbs63.execute-api.us-east-2.amazonaws.com/dev/api';

// Login with Google - simplified to just pass the ID token
export const loginWithGoogle = async (idToken) => {
  try {
    console.log("Attempting Google login with token:", idToken.substring(0, 10) + "...");
    const response = await fetch(`${API_URL}/auth/google/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: idToken }),
    });
    
    console.log("Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login error response:', errorText);
      throw new Error(`Login failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Check if user is authenticated
export const checkUserAuth = async () => {
  try {
    await getCsrfToken();

    console.log("Checking user auth status...");
    const response = await fetch(`${API_URL}/auth/user/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': document.cookie.split('; '),
      },
    });
    
    console.log("Auth check response status:", response.status);
    
    if (!response.ok) {
      console.error("Auth check failed with status:", response.status);
      return { is_authenticated: false };
    }
    
    const userData = await response.json();
    console.log("Auth check result:", userData);
    return userData;
  } catch (error) {
    console.error("Auth check error:", error);
    return { is_authenticated: false };
  }
};

// Update your logout function in auth.js
export const logout = async () => {
  try {
    // Get CSRF token first
    await getCsrfToken();
    
    const response = await fetch(`${API_URL}/auth/logout/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.cookie.split('; ')
          .find(row => row.startsWith('csrftoken='))
          ?.split('=')[1] || '',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Logout error response:', errorText);
      throw new Error(`Logout failed: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

// Add this function at the top of the file
const getCsrfToken = async () => {
  try {
    const response = await fetch(`${API_URL}/get-csrf-token/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error("Failed to get CSRF token:", response.status);
      return null;
    }
    
    // The token is set in the cookie by the server
    // We don't need to extract it manually
    return true;
  } catch (error) {
    console.error("Error getting CSRF token:", error);
    return null;
  }
};

export const deleteUserAccount = async () => {
  try {
    // Get CSRF token first
    await getCsrfToken();
    
    const response = await fetch(`${API_URL}/auth/delete-account/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.cookie.split('; ')
          .find(row => row.startsWith('csrftoken='))
          ?.split('=')[1] || '',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete account error response:', errorText);
      throw new Error(`Delete account failed: ${response.status}`);
    }
    
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    return await response.json();
  } catch (error) {
    console.error("Delete account error:", error);
    throw error;
  }
};
