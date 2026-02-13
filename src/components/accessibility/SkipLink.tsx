import React from 'react';
import './SkipLink.css';

interface SkipLinkProps {
  /**
   * Target element ID to skip to
   */
  targetId: string;

  /**
   * Text to display in the skip link
   */
  text?: string;
}

/**
 * SkipLink component for accessibility
 * Allows keyboard users to skip navigation and jump to main content
 */
export const SkipLink: React.FC<SkipLinkProps> = ({ targetId, text = 'Skip to main content' }) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);

    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a href={`#${targetId}`} className="skip-link" onClick={handleClick}>
      {text}
    </a>
  );
};
