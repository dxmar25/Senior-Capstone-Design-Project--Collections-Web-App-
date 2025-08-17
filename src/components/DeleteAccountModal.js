import React from "react";
import "./Modal.css";

const DeleteAccountModal = ({ 
  onConfirm, 
  onCancel, 
  isLoading = false 
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content confirmation-modal">
        <h2>Delete Your Account?</h2>
        <p className="confirmation-message">
          This will permanently delete your account and ALL your collections and images. 
          This action cannot be undone.
        </p>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="delete-button" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting Account..." : "Delete My Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;