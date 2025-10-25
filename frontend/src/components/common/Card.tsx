import { type ReactNode, forwardRef } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  width?: string;
  onClick?: () => void;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', width, onClick }, ref) => {
    const cardClasses = `card ${onClick ? 'card--clickable' : ''} ${className}`.trim();

    return (
      <div
        ref={ref}
        className={cardClasses}
        style={{ width }}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
