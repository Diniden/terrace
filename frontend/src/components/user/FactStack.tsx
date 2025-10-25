import { forwardRef } from 'react';
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
}

export const FactStack = forwardRef<HTMLDivElement, FactStackProps>(
  ({ stack, onUpdate, viewContext, onNavigateToBasis, onNavigateToDependents, dependentsCount = 0 }, ref) => {
    const { topFact, supportCount } = stack;
    const isStack = supportCount > 0;

    if (!isStack) {
      // Render as a single FactCard if there are no supporting facts
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
      <div ref={ref} className="factStack">
        {/* Background card layers (only visible corners) */}
        <div className="factStack__layer factStack__layer--bottom" aria-hidden="true">
          <div className="factStack__layerCard" />
        </div>
        <div className="factStack__layer factStack__layer--middle" aria-hidden="true">
          <div className="factStack__layerCard" />
        </div>

        {/* Top card - full FactCard */}
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

        {/* Stack count badge showing number of supporting facts */}
        <div className="factStack__badge" title={`${supportCount} supporting fact${supportCount !== 1 ? 's' : ''}`}>
          {supportCount}
        </div>
      </div>
    );
  }
);

FactStack.displayName = 'FactStack';
