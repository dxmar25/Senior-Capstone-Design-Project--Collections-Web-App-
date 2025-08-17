import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import UserProfile from './components/UserProfile';
import AuthUserProfile from './components/AuthUserProfile';
import FinancialEval from './components/FinancialEval';
import { useUser } from './context/UserContext';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/profile" element={<AuthUserProfile />} />
        <Route 
          path="/financialEval" 
          element={
            <ProtectedRoute>
              <FinancialEval />
            </ProtectedRoute>
          } />
        <Route 
          path="/profile/:userId" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;