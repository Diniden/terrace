import React, { useEffect, useState, useRef } from "react";
import "./Pagination.css";

export interface PaginationProps {
  /**
   * Array of corpus IDs to track
   */
  corpusIds: string[];
  /**
   * Refs to the corpus column elements
   */
  corpusRefs: Record<string, HTMLDivElement | null>;
}

interface VisibilityState {
  [corpusId: string]: number; // 0 to 1, representing visibility percentage
}

/**
 * Pagination component - Displays dots representing corpus visibility
 *
 * Features:
 * - Renders a dot for each corpus
 * - Dot size changes based on viewport visibility (0-100%)
 * - Uses Intersection Observer API for efficient scroll detection
 * - Smooth transitions between dot sizes
 */
export const Pagination: React.FC<PaginationProps> = ({
  corpusIds,
  corpusRefs,
}) => {
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the scroll container (the element with overflow-x: auto)
    // It should be the .projectDetailPage__corpusColumns element
    const findScrollContainer = (): HTMLElement | null => {
      // Get any corpus element to find its scroll container
      const firstCorpusId = corpusIds[0];
      if (!firstCorpusId || !corpusRefs[firstCorpusId]) {
        return null;
      }

      let element = corpusRefs[firstCorpusId]?.parentElement;
      while (element) {
        const overflowX = window.getComputedStyle(element).overflowX;
        if (overflowX === "auto" || overflowX === "scroll") {
          return element;
        }
        element = element.parentElement;
      }
      return null;
    };

    const scrollContainer = findScrollContainer();
    scrollContainerRef.current = scrollContainer;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new intersection observer with threshold array for granular visibility tracking
    const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);

    const observer = new IntersectionObserver(
      (entries) => {
        // Use functional state update to avoid stale closure
        setVisibilityState((prevState) => {
          const newVisibilityState: VisibilityState = { ...prevState };

          entries.forEach((entry) => {
            const corpusId = entry.target.getAttribute("data-corpus-id");
            if (corpusId) {
              // Calculate visibility ratio
              // intersectionRatio gives us the percentage of the element that's visible
              newVisibilityState[corpusId] = entry.intersectionRatio;
            }
          });

          return newVisibilityState;
        });
      },
      {
        root: scrollContainer, // Use the scroll container as root, not viewport
        threshold: thresholds,
        rootMargin: "0px", // No margin adjustments
      }
    );

    observerRef.current = observer;

    // Observe all corpus elements
    corpusIds.forEach((corpusId) => {
      const element = corpusRefs[corpusId];
      if (element) {
        // Add data attribute for identification
        element.setAttribute("data-corpus-id", corpusId);
        observer.observe(element);
      }
    });

    // Cleanup on unmount
    return () => {
      observer.disconnect();
    };
  }, [corpusIds, corpusRefs]);

  const getDotSize = (visibility: number): number => {
    // Min size: 6px, Max size: 12px
    const minSize = 6;
    const maxSize = 12;
    return minSize + (maxSize - minSize) * visibility;
  };

  const getDotOpacity = (visibility: number): number => {
    // Min opacity: 0.3, Max opacity: 1
    const minOpacity = 0.3;
    const maxOpacity = 1;
    return minOpacity + (maxOpacity - minOpacity) * visibility;
  };

  if (corpusIds.length === 0) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Corpus navigation">
      <div className="pagination__dots">
        {corpusIds.map((corpusId) => {
          const visibility = visibilityState[corpusId] ?? 0;
          const size = getDotSize(visibility);
          const opacity = getDotOpacity(visibility);

          return (
            <button
              key={corpusId}
              className="pagination__dot"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                opacity,
              }}
              onClick={() => {
                const element = corpusRefs[corpusId];
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                  });
                }
              }}
              aria-label={`Navigate to corpus ${corpusIds.indexOf(corpusId) + 1}`}
              title={`Corpus ${corpusIds.indexOf(corpusId) + 1}`}
            />
          );
        })}
      </div>
    </nav>
  );
};
