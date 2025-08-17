import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { searchUsers } from "../services/api";
import "./UserSearch.css";

const UserSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  
  // Handle clicks outside of the search component
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Search users when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    
    try {
      setLoading(true);
      // Ensure the query is properly encoded in the URL
      const encodedQuery = encodeURIComponent(query.trim());
      const data = await searchUsers(encodedQuery);
      setResults(data);
      setShowResults(true);
      setLoading(false);
    } catch (error) {
      console.error("Error searching users:", error);
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };
  
  const handleInputFocus = () => {
    if (query.trim().length >= 2) {
      setShowResults(true);
    }
  };
  
  const handleSelectUser = () => {
    setShowResults(false);
    setQuery("");
  };
  
  return (
    <div className="user-search" ref={searchRef}>
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="search-input"
        />
        {loading && <div className="search-spinner"></div>}
      </div>
      
      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((user) => (
            <Link
              to={`/profile/${user.id}`}
              key={user.id}
              className="search-result-item"
              onClick={handleSelectUser}
            >
              <div className="search-result-content">
                {user.profile_picture_url && (
                  <img 
                    src={user.profile_picture_url} 
                    alt={user.first_name} 
                    className="search-result-avatar"
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
          ))}
        </div>
      )}
      
      {showResults && query.trim().length >= 2 && results.length === 0 && (
        <div className="search-results">
          <div className="no-results">No users found</div>
        </div>
      )}
    </div>
  );
};

export default UserSearch;