import React, { useState } from "react";
import { Card } from "../common/Card";
import type { Fact, FactState, FactContext } from "../../types";
import "./FactCard.css";

interface FactCardProps {
  fact: Fact;
  onUpdate: (
    id: string,
    data: { statement?: string; state?: FactState }
  ) => Promise<void>;
}

export const FactCard: React.FC<FactCardProps> = ({ fact, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [statement, setStatement] = useState(fact.statement || "");
  const [loading, setLoading] = useState(false);

  const getStateColor = (state: FactState) => {
    const colors = {
      clarify: "var(--color-clarify)",
      conflict: "var(--color-conflict)",
      ready: "var(--color-ready)",
      rejected: "var(--color-rejected)",
      confirmed: "var(--color-confirmed)",
    };
    return colors[state];
  };

  const getStateIcon = (state: FactState) => {
    if (state === "rejected") return "×";
    return "";
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
      console.error("Failed to update fact:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = () => {
    if (!loading) {
      handleSubmit();
    }
  };

  const shouldShowInput = !fact.statement || fact.statement.trim() === "";

  return (
    <Card className="factCard">
      <div
        className="factCard__stateIndicator"
        style={{ backgroundColor: getStateColor(fact.state) }}
      >
        {getStateIcon(fact.state)}
      </div>

      {isEditing || shouldShowInput ? (
        <input
          type="text"
          className="factCard__input"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          placeholder="Enter fact statement..."
          autoFocus
          disabled={loading}
        />
      ) : (
        <>
          <div className="factCard__content">
            <div className="factCard__statement">{fact.statement}</div>
          </div>
          <div className="factCard__footer">
            <button
              className="factCard__actionButton"
              onClick={() => setIsEditing(true)}
              title="Edit fact statement"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.334 2.00004C11.5091 1.82494 11.7169 1.68605 11.9457 1.59129C12.1745 1.49653 12.4197 1.44775 12.6673 1.44775C12.9149 1.44775 13.1601 1.49653 13.3889 1.59129C13.6177 1.68605 13.8256 1.82494 14.0007 2.00004C14.1758 2.17513 14.3147 2.383 14.4094 2.61178C14.5042 2.84055 14.553 3.08575 14.553 3.33337C14.553 3.58099 14.5042 3.82619 14.4094 4.05497C14.3147 4.28374 14.1758 4.49161 14.0007 4.66671L5.00065 13.6667L1.33398 14.6667L2.33398 11L11.334 2.00004Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="factCard__actionButton"
              onClick={() => {
                /* TODO: View fact details */
              }}
              title="View fact details"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 8C1 8 3.54545 3 8 3C12.4545 3 15 8 15 8C15 8 12.4545 13 8 13C3.54545 13 1 8 1 8Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 7C6 8.10457 6.89543 10 8 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </Card>
  );
};
