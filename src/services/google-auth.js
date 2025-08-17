// src/services/google-auth.js
import { loginWithGoogle } from './auth';

export const initiateGoogleLogin = (callback) => {
  if (!window.google) {
    console.error("Google API not loaded");
    return;
  }
  
  console.log("Using client ID:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
  
  window.google.accounts.id.initialize({
    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    callback: async (response) => {
      if (response.credential) {
        try {
          console.log("Received credential from Google");
          // Send the ID token to your backend
          const userData = await loginWithGoogle(response.credential);
          callback(userData);
        } catch (error) {
          console.error("Google auth error:", error);
          if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
          }
        }
      } else {
        console.error("No credential received from Google");
      }
    },
    error_callback: (error) => {
      console.error("Google Sign In Error:", error);
    }
  });
  
  window.google.accounts.id.prompt((notification) => {
    console.log("Google prompt notification:", notification);
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      console.log("Google prompt not displayed or skipped. Reason:", notification.getNotDisplayedReason() || notification.getSkippedReason());
    }
  });
};

// This function will be called by the Google library when a user signs in
export function handleCredentialResponse(response) {
  console.log("Received Google credential response");
  
  if (response && response.credential) {
    // Pass the token to your backend
    loginWithGoogle(response.credential)
      .then(userData => {
        // Dispatch a custom event that Login.js can listen for
        const event = new CustomEvent('googleLoginSuccess', { detail: userData });
        window.dispatchEvent(event);
      })
      .catch(error => {
        console.error("Error during backend authentication:", error);
      });
  }
}

// Initialize Google Sign-in
export function initializeGoogleSignIn() {
  console.log("Initializing Google Sign-In with client ID:", 
              process.env.REACT_APP_GOOGLE_CLIENT_ID);
              
  // Make the callback function available globally so Google can call it
  window.handleCredentialResponse = handleCredentialResponse;
}