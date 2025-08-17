
import { motion } from "framer-motion";
import React, { useEffect } from 'react';
import { checkUserAuth } from '../services/auth';
import { initializeGoogleSignIn } from '../services/google-auth';
import "./Login.css";

const Login = ({ onLoginSuccess }) => {
  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await checkUserAuth();
        if (userData.is_authenticated) {
          onLoginSuccess(userData);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };

    checkAuth();
  }, [onLoginSuccess]);

  // Set up event listener for Google login success
  useEffect(() => {
    const handleGoogleLoginSuccess = (event) => {
      const userData = event.detail;
      console.log("Google login successful:", userData);
      onLoginSuccess(userData);
    };

    // Add event listener
    window.addEventListener('googleLoginSuccess', handleGoogleLoginSuccess);

    // Clean up
    return () => {
      window.removeEventListener('googleLoginSuccess', handleGoogleLoginSuccess);
    };
  }, [onLoginSuccess]);

  // Initialize Google Sign-In
  useEffect(() => {
    // Initialize the function once the component is mounted
    initializeGoogleSignIn();
    
    // Load the Google API script
    const loadGoogleScript = () => {
      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };
    
    loadGoogleScript();
    
    // Clean up
    return () => {
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>My Collections</h1>
        <p>Sign in to view and manage your collections</p>
        
        <div className="login-options">
          {/* This matches the structure from the HTML test file */}
          <div id="g_id_onload"
               data-client_id={process.env.REACT_APP_GOOGLE_CLIENT_ID}
               data-callback="handleCredentialResponse">
          </div>
          <div className="g_id_signin"
               data-type="standard"
               data-size="large"
               data-theme="outline"
               data-text="sign_in_with"
               data-shape="rectangular"
               data-logo_alignment="left">
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;