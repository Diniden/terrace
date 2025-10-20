import React, { type ReactNode } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  width?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', width, onClick }) => {
  return (
    <div
      className={`card ${className}`}
      style={{ width }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
