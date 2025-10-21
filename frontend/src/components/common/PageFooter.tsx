import React from "react";
import "./PageFooter.css";

export interface PageFooterProps {
  /**
   * Current value of the LLM chat input
   */
  llmInput: string;
  /**
   * Handler for input changes
   */
  onLlmInputChange: (value: string) => void;
  /**
   * Whether voice recognition is currently active
   */
  isListening: boolean;
  /**
   * Handler for toggling voice recognition
   */
  onToggleListening: () => void;
  /**
   * Ref for the LLM input element (for keyboard shortcuts)
   */
  llmInputRef?: React.RefObject<HTMLInputElement | null>;
  /**
   * Optional placeholder text for the input
   */
  placeholder?: string;
  /**
   * Optional disabled state
   */
  disabled?: boolean;
}

/**
 * PageFooter component - Reusable footer with LLM chat input and voice recognition
 *
 * Features:
 * - LLM chat input field
 * - Voice recognition button with visual feedback
 * - Keyboard shortcut support (press 'l' to focus, 'k' for voice)
 * - Configurable placeholder and disabled state
 */
export const PageFooter: React.FC<PageFooterProps> = ({
  llmInput,
  onLlmInputChange,
  isListening,
  onToggleListening,
  llmInputRef,
  placeholder = "Chat with LLM... (Press 'l' to focus, 'k' for voice)",
  disabled = false,
}) => {
  return (
    <footer className="page-footer">
      <div className="llm-chat-container">
        <input
          ref={llmInputRef}
          type="text"
          className="llm-chat-input"
          placeholder={placeholder}
          value={llmInput}
          onChange={(e) => onLlmInputChange(e.target.value)}
          disabled={disabled}
        />
        <button
          className={`voice-button ${isListening ? "listening" : ""}`}
          onClick={onToggleListening}
          title={
            isListening
              ? "Stop listening (or wait 2s)"
              : "Start voice input (or press k)"
          }
          disabled={disabled}
        >
          🎤
        </button>
      </div>
    </footer>
  );
};
