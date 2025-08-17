import React from "react";
import "./Modal.css";

const ConfirmationModal = ({ 
  title, 
  message, 
  confirmLabel = "Delete", 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel, 
  isLoading = false 
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content confirmation-modal">
        <h2>{title}</h2>
        <p className="confirmation-message">{message}</p>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button 
            type="button" 
            className="delete-button" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;