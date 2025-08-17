import React from 'react';
import './Modal.css'; 
import { useState } from 'react';
import TagSearchModal from './TagSearchModal';

const ImageModal = ({ image, onClose, onTagClick  }) => {
  const {public_url, title, category_name, description, valuation} = image;
//   const [tagSearchModalOpen, setTagSearchModalOpen] = useState(false);
//   const [selectedTag, setSelectedTag] = useState("");

    const handleTagClick = (tag) => {
        // e.stopPropagation(); // Prevent modal closing
        console.log("Tag clicked in ImageModal:", tag); 
        if (onTagClick) {
        onTagClick(tag);
        }
    };

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={onClose}> 
                X
            </button>
            <div className="image-modal-body">
                <img src={public_url} alt={title} className="image-modal-image" />
                <div className="image-modal-text">
                    <h2>
                        {title}
                    </h2>
                    <p><strong>Category:</strong> {category_name}</p>
                    <p><strong>Description:</strong> {description || "No description available."}</p>
                    <p><strong>Valuation:</strong> ${valuation}</p>
                    <p><strong>Tags:</strong></p>
                    {/* Tags display */}
                    {image.tags && image.tags.length > 0 && (
                    <div className="image-tags">
                        {image.tags.map((tag, idx) => (
                        <span 
                            key={idx} 
                            className="tag-badge"
                            onClick={() => handleTagClick(tag)}
                        >
                            {tag}
                        </span>
                        ))}
                    </div>
                    )}
                    {/* {tagSearchModalOpen && (
                        <TagSearchModal
                            tag={selectedTag}
                            onClose={() => setTagSearchModalOpen(false)}
                        />
                    )} */}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ImageModal;