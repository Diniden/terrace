import React, { useState } from 'react';
import { Card } from '../common/Card';
import type { Fact, FactState } from '../../types';
import './FactCard.css';

interface FactCardProps {
  fact: Fact;
  onUpdate: (id: string, data: { statement?: string; state?: FactState }) => Promise<void>;
}

export const FactCard: React.FC<FactCardProps> = ({ fact, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [statement, setStatement] = useState(fact.statement || '');
  const [loading, setLoading] = useState(false);

  const getStateColor = (state: FactState) => {
    const colors = {
      clarify: 'var(--color-clarify)',
      conflict: 'var(--color-conflict)',
      ready: 'var(--color-ready)',
      rejected: 'var(--color-rejected)',
      confirmed: 'var(--color-confirmed)',
    };
    return colors[state];
  };

  const getStateIcon = (state: FactState) => {
    if (state === 'rejected') return '×';
    return '';
  };

  const handleSubmit = async () => {
    if (statement.trim() === fact.statement?.trim()) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onUpdate(fact.id, { statement: statement.trim() || undefined });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update fact:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    if (!loading) {
      handleSubmit();
    }
  };

  const shouldShowInput = !fact.statement || fact.statement.trim() === '';

  return (
    <Card className="fact-card" width="var(--card-width-fact)">
      <div
        className="fact-state-indicator"
        style={{ backgroundColor: getStateColor(fact.state) }}
      >
        {getStateIcon(fact.state)}
      </div>

      {isEditing || shouldShowInput ? (
        <input
          type="text"
          className="fact-input"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          placeholder="Enter fact statement..."
          autoFocus
          disabled={loading}
        />
      ) : (
        <div
          className="fact-statement"
          onClick={() => setIsEditing(true)}
        >
          {fact.statement}
        </div>
      )}
    </Card>
  );
};
