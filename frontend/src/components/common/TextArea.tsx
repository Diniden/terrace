import React, { type TextareaHTMLAttributes } from 'react';
import './TextArea.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  id,
  disabled,
  ...textareaProps
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`text-area ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="text-area__label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        disabled={disabled}
        className={`text-area__field ${error ? 'text-area__field--error' : ''}`}
        {...textareaProps}
      />
      {error && <span className="text-area__error">{error}</span>}
    </div>
  );
};
