import { forwardRef, useState } from 'react';
import { FactCard } from './FactCard';
import type { FactState } from '../../types';
import type { FactStack as FactStackType } from '../../utils/factStackUtils';
import './FactStack.css';

type ViewContext = 'project' | 'corpus' | 'fact';

interface FactStackProps {
  stack: FactStackType;
  onUpdate: (
    id: string,
    data: { statement?: string; state?: FactState }
  ) => Promise<void>;
  viewContext?: ViewContext;
  onNavigateToBasis?: (basisId: string) => void;
  onNavigateToDependents?: (factId: string) => void;
  dependentsCount?: number;
  onExpand?: (stack: FactStackType) => void;
  onCollapse?: (stack: FactStackType) => void;
  initialExpanded?: boolean;
}

export const FactStack = forwardRef<HTMLDivElement, FactStackProps>(
  ({ stack, onUpdate, viewContext, onNavigateToBasis, onNavigateToDependents, dependentsCount = 0, onExpand, onCollapse, initialExpanded = false }, ref) => {
    const { topFact, linkedCount, facts } = stack;
    const isStack = linkedCount > 0;
    const [isExpanded, setIsExpanded] = useState(initialExpanded);

    const handleBadgeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isExpanded) {
        setIsExpanded(true);
        onExpand?.(stack);
      }
    };

    const handleBackgroundClick = () => {
      if (isExpanded) {
        setIsExpanded(false);
        onCollapse?.(stack);
      }
    };

    const handleExpandedContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Only collapse if the click was directly on the expandedContent container,
      // not on any of its children (FactCards)
      if (e.target === e.currentTarget && isExpanded) {
        setIsExpanded(false);
        onCollapse?.(stack);
      }
    };

    if (!isStack) {
      // Render as a single FactCard if there are no linked facts
      return (
        <FactCard
          ref={ref}
          fact={topFact}
          onUpdate={onUpdate}
          viewContext={viewContext}
          onNavigateToBasis={onNavigateToBasis}
          onNavigateToDependents={onNavigateToDependents}
          dependentsCount={dependentsCount}
        />
      );
    }

    return (
      <div ref={ref} className={`factStack ${isExpanded ? 'factStack--expanded' : ''}`}>
        {/* Expanded background overlay - clickable to collapse */}
        {isExpanded && (
          <div
            className="factStack__expandedBackground"
            onClick={handleBackgroundClick}
            aria-label="Click to collapse stack"
          />
        )}

        {/* Background card layers (only visible when collapsed) */}
        {!isExpanded && (
          <>
            <div className="factStack__layer factStack__layer--bottom" aria-hidden="true">
              <div className="factStack__layerCard" />
            </div>
            <div className="factStack__layer factStack__layer--middle" aria-hidden="true">
              <div className="factStack__layerCard" />
            </div>
          </>
        )}

        {/* Expanded state - render all facts in the stack */}
        {isExpanded ? (
          <div
            className="factStack__expandedContent"
            onClick={handleExpandedContentClick}
          >
            {facts.map((fact, index) => (
              <div key={fact.id} className="factStack__expandedCard">
                <FactCard
                  fact={fact}
                  onUpdate={onUpdate}
                  viewContext={viewContext}
                  onNavigateToBasis={onNavigateToBasis}
                  onNavigateToDependents={onNavigateToDependents}
                  dependentsCount={index === 0 ? dependentsCount : undefined}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Collapsed state - render only top card */
          <div className="factStack__layer factStack__layer--top">
            <FactCard
              fact={topFact}
              onUpdate={onUpdate}
              viewContext={viewContext}
              onNavigateToBasis={onNavigateToBasis}
              onNavigateToDependents={onNavigateToDependents}
              dependentsCount={dependentsCount}
            />
          </div>
        )}

        {/* Stack count badge showing number of linked facts - clickable to expand */}
        {!isExpanded && (
          <div
            className="factStack__badge"
            title={`${linkedCount} linked fact${linkedCount !== 1 ? 's' : ''} - Click to expand`}
            onClick={handleBadgeClick}
          >
            {linkedCount}
          </div>
        )}
      </div>
    );
  }
);

FactStack.displayName = 'FactStack';
