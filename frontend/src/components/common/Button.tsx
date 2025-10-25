import React, { type ReactNode } from 'react';
import './Button.css';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  title,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`button button--${variant} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};
