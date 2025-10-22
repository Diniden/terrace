import React, { useState, useRef, useEffect } from "react";
import { chatApi } from "../../api/chat";
import type { ChatMessage } from "../../types";
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
   * Handler called when user submits the input (Shift+Enter)
   */
  onConfirm?: (value: string) => void;
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
  llmInputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
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
 * - Fancy floating mode when input is focused with dimmed overlay and smooth FLIP animations
 */
export const PageFooter: React.FC<PageFooterProps> = ({
  llmInput,
  onLlmInputChange,
  onConfirm,
  isListening,
  onToggleListening,
  llmInputRef,
  placeholder = "Chat with LLM... (Press 'l' to focus, 'k' for voice)",
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [currentDraft, setCurrentDraft] = useState("");
  const footerRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const originalBoundsRef = useRef<DOMRect | null>(null);

  // Easing function - easeOutCubic
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Easing function - easeInCubic
  const easeInCubic = (t: number): number => {
    return t * t * t;
  };

  // Linear interpolation
  const lerp = (start: number, end: number, progress: number): number => {
    return start + (end - start) * progress;
  };

  // Fetch chat history on mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const history = await chatApi.getChatHistory(50, 0);
        setChatHistory(history);
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      }
    };
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (!footerRef.current) return;

    const footer = footerRef.current;
    const overlay = overlayRef.current;
    const voiceButton = voiceButtonRef.current;

    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (isFocused) {
      // Opening animation - expand to center

      // Record the original position before switching to fixed
      const originalBounds = footer.getBoundingClientRect();
      originalBoundsRef.current = originalBounds;

      // Target dimensions (centered on viewport)
      const targetWidth = 600;
      const targetHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate target position - CENTER of box should be at CENTER of viewport
      const targetLeft = (viewportWidth - targetWidth) / 2;
      const targetTop = (viewportHeight - targetHeight) / 2;

      // Switch to fixed positioning with original bounds
      footer.classList.add("pageFooter--floating");
      footer.style.position = "fixed";
      footer.style.left = `${originalBounds.left}px`;
      footer.style.top = `${originalBounds.top}px`;
      footer.style.width = `${originalBounds.width}px`;
      footer.style.height = `${originalBounds.height}px`;
      footer.style.transform = "none";

      // Animate to target
      const duration = 400;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        // Interpolate position and size
        const currentLeft = lerp(
          originalBounds.left,
          targetLeft,
          easedProgress
        );
        const currentTop = lerp(originalBounds.top, targetTop, easedProgress);
        const currentWidth = lerp(
          originalBounds.width,
          targetWidth,
          easedProgress
        );
        const currentHeight = lerp(
          originalBounds.height,
          targetHeight,
          easedProgress
        );

        footer.style.left = `${currentLeft}px`;
        footer.style.top = `${currentTop}px`;
        footer.style.width = `${currentWidth}px`;
        footer.style.height = `${currentHeight}px`;

        // Animate overlay opacity
        if (overlay) {
          overlay.style.opacity = `${easedProgress}`;
        }

        // Animate voice button
        if (voiceButton) {
          voiceButton.style.opacity = `${1 - easedProgress}`;
          voiceButton.style.transform = `scale(${lerp(1, 0.8, easedProgress)})`;
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (
      !isFocused &&
      footer.classList.contains("pageFooter--floating")
    ) {
      // Closing animation - shrink back to original position

      const currentBounds = footer.getBoundingClientRect();
      const originalBounds = originalBoundsRef.current;

      if (!originalBounds) {
        // Fallback: just remove the class
        footer.classList.remove("pageFooter--floating");
        footer.style.position = "";
        footer.style.left = "";
        footer.style.top = "";
        footer.style.width = "";
        footer.style.height = "";
        footer.style.transform = "";
        return;
      }

      const duration = 350;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInCubic(progress);

        // Interpolate back to original position and size
        const currentLeft = lerp(
          currentBounds.left,
          originalBounds.left,
          easedProgress
        );
        const currentTop = lerp(
          currentBounds.top,
          originalBounds.top,
          easedProgress
        );
        const currentWidth = lerp(
          currentBounds.width,
          originalBounds.width,
          easedProgress
        );
        const currentHeight = lerp(
          currentBounds.height,
          originalBounds.height,
          easedProgress
        );

        footer.style.left = `${currentLeft}px`;
        footer.style.top = `${currentTop}px`;
        footer.style.width = `${currentWidth}px`;
        footer.style.height = `${currentHeight}px`;

        // Animate overlay opacity
        if (overlay) {
          overlay.style.opacity = `${1 - easedProgress}`;
        }

        // Animate voice button
        if (voiceButton) {
          voiceButton.style.opacity = `${easedProgress}`;
          voiceButton.style.transform = `scale(${lerp(0.8, 1, easedProgress)})`;
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete - clean up
          footer.classList.remove("pageFooter--floating");
          footer.style.position = "";
          footer.style.left = "";
          footer.style.top = "";
          footer.style.width = "";
          footer.style.height = "";
          footer.style.transform = "";

          if (overlay) overlay.style.opacity = "";
          if (voiceButton) {
            voiceButton.style.opacity = "";
            voiceButton.style.transform = "";
          }

          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isFocused]);

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "ArrowUp") {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;

      // Only trigger history navigation if cursor is at the beginning
      if (cursorPosition === 0 && chatHistory.length > 0) {
        e.preventDefault();

        // Save current draft when starting to navigate history
        if (historyIndex === 0) {
          setCurrentDraft(llmInput);
        }

        // Load message from history
        if (historyIndex < chatHistory.length) {
          const message = chatHistory[historyIndex];
          onLlmInputChange(message.content);

          // Increment history index for next UP press
          setHistoryIndex(historyIndex + 1);

          // Set cursor to beginning after a short delay (to let state update)
          setTimeout(() => {
            if (textarea) {
              textarea.setSelectionRange(0, 0);
            }
          }, 0);
        }
      }
    } else if (e.key === "ArrowDown") {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const textLength = textarea.value.length;

      // Only trigger if cursor is at the end and we're in history navigation mode
      if (cursorPosition === textLength && historyIndex > 0) {
        e.preventDefault();

        // Decrement history index to move forward
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);

        if (newIndex === 0) {
          // Back to the current draft (what user was typing originally)
          onLlmInputChange(currentDraft);
          setCurrentDraft(""); // Clear the saved draft
        } else {
          // Load the more recent message from history
          const message = chatHistory[newIndex - 1];
          onLlmInputChange(message.content);
        }

        // Set cursor to end after a short delay (to let state update)
        setTimeout(() => {
          if (textarea) {
            const length = textarea.value.length;
            textarea.setSelectionRange(length, length);
          }
        }, 0);
      }
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();

      // Persist message to backend
      if (llmInput.trim()) {
        try {
          const newMessage = await chatApi.createChatMessage(llmInput);
          // Add to local cache at the beginning (newest first)
          setChatHistory([newMessage, ...chatHistory]);
        } catch (error) {
          console.error("Failed to save chat message:", error);
        }
      }

      // Reset history index and clear draft
      setHistoryIndex(0);
      setCurrentDraft("");

      if (onConfirm) {
        onConfirm(llmInput);
      }

      // Blur the input
      if (llmInputRef?.current) {
        llmInputRef.current.blur();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Just blur without calling onConfirm
      if (llmInputRef?.current) {
        llmInputRef.current.blur();
      }
    }
  };

  const voiceButtonClasses =
    `pageFooter__voiceButton ${isListening ? "pageFooter__voiceButton--listening" : ""}`.trim();
  const chatContainerClasses =
    `pageFooter__chatContainer ${isFocused ? "pageFooter__chatContainer--floating" : ""}`.trim();
  const chatInputClasses =
    `pageFooter__chatInput ${isFocused ? "pageFooter__chatInput--floating" : ""}`.trim();

  return (
    <>
      {isFocused && (
        <div
          ref={overlayRef}
          className="pageFooter__overlay"
          onClick={() => setIsFocused(false)}
          style={{ opacity: 0 }}
        />
      )}
      <footer ref={footerRef} className="pageFooter">
        <div className={chatContainerClasses}>
          <div className="pageFooter__inputWrapper">
            <textarea
              ref={llmInputRef as React.RefObject<HTMLTextAreaElement>}
              className={chatInputClasses}
              placeholder={placeholder}
              value={llmInput}
              onChange={(e) => onLlmInputChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={isFocused ? 10 : 1}
            />
            {isFocused && (
              <span className="pageFooter__helperText">
                Press Shift+Enter to submit
              </span>
            )}
          </div>
          <button
            ref={voiceButtonRef}
            className={voiceButtonClasses}
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
    </>
  );
};
