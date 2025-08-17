import React from 'react';
import './Modal.css'; 
import { useState } from 'react';
import TagSearchModal from './TagSearchModal';

const WishlistModal = ({ image, onClose, onTagClick }) => {
  const {public_url, title, category_name, description, valuation} = image;
//   const [tagSearchModalOpen, setTagSearchModalOpen] = useState(false);
//   const [selectedTag, setSelectedTag] = useState("");

    const handleTagClick = (e, tag) => {
        // e.stopPropagation(); // Prevent modal closing
        console.log("Tag clicked in WishlistModal:", tag); 
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
                <img 
                src={public_url || image.presigned_url || `https://csce482-collections-bucket.s3.amazonaws.com/${image.path}`} 
                alt={title}
                className="image-modal-image"
                />
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
                    <p><strong>Purchase Link:</strong></p>
                    {image.purchase_url && (
                        <a 
                        href={image.purchase_url} 
                        className="purchase-link" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        >
                        Link
                        </a>
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

export default WishlistModal;