import React, { type ReactNode } from 'react';
import './FormGroup.css';

interface FormGroupProps {
  children: ReactNode;
  label?: string;
  error?: string;
  htmlFor?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  label,
  error,
  htmlFor,
}) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={htmlFor} className="form-group__label">
          {label}
        </label>
      )}
      {children}
      {error && <span className="form-group__error">{error}</span>}
    </div>
  );
};
