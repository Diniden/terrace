import React, { type InputHTMLAttributes } from 'react';
import './TextInput.css';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  type = 'text',
  className = '',
  id,
  disabled,
  ...inputProps
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`text-input ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-input__label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        disabled={disabled}
        className={`text-input__field ${error ? 'text-input__field--error' : ''}`}
        {...inputProps}
      />
      {error && <span className="text-input__error">{error}</span>}
    </div>
  );
};
