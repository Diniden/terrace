import React, { type ReactNode } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  width?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', width, onClick }) => {
  const cardClasses = `card ${onClick ? 'card--clickable' : ''} ${className}`.trim();

  return (
    <div
      className={cardClasses}
      style={{ width }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
