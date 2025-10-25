import { useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../common/Card";
import type { Fact, FactState } from "../../types";
import "./FactCard.css";

type ViewContext = "project" | "corpus" | "fact";

interface FactCardProps {
  fact: Fact;
  onUpdate: (
    id: string,
    data: { statement?: string; state?: FactState }
  ) => Promise<void>;
  viewContext?: ViewContext;
  onNavigateToBasis?: (basisId: string) => void;
  onNavigateToDependents?: (factId: string) => void;
  dependentsCount?: number;
}

export const FactCard = forwardRef<HTMLDivElement, FactCardProps>(
  ({ fact, onUpdate, viewContext, onNavigateToBasis, onNavigateToDependents, dependentsCount = 0 }, ref) => {
  const navigate = useNavigate();
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
  const shouldShowBasisButton = viewContext === "project" && !!fact.basisId;
  const shouldShowDependentsButton = viewContext === "project" && dependentsCount > 0;

  const handleNavigateToBasis = () => {
    if (fact.basisId && onNavigateToBasis) {
      onNavigateToBasis(fact.basisId);
    }
  };

  const handleNavigateToDependents = () => {
    if (onNavigateToDependents) {
      onNavigateToDependents(fact.id);
    }
  };

  return (
    <Card ref={ref} className="factCard">
      <div
        className="factCard__stateIndicator"
        style={{ backgroundColor: getStateColor(fact.state) }}
      >
        {getStateIcon(fact.state)}
      </div>

      {isEditing || shouldShowInput ? (
        <textarea
          className="factCard__input"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Enter fact statement..."
          autoFocus
          disabled={loading}
          rows={5}
        />
      ) : (
        <>
          <div className="factCard__content">
            <div className="factCard__statement">{fact.statement}</div>
          </div>
          <div className="factCard__footer">
            {shouldShowBasisButton && (
              <button
                className="factCard__actionButton"
                onClick={handleNavigateToBasis}
                title="Navigate to basis fact"
                aria-label="Navigate to basis fact"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 15L1 8L8 1M15 8H1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {shouldShowDependentsButton && (
              <button
                className="factCard__actionButton"
                onClick={handleNavigateToDependents}
                title="Show dependent facts"
                aria-label="Show dependent facts"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2"
                    y="2"
                    width="12"
                    height="3"
                    rx="0.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <rect
                    x="2"
                    y="6.5"
                    width="12"
                    height="3"
                    rx="0.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <rect
                    x="2"
                    y="11"
                    width="12"
                    height="3"
                    rx="0.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </button>
            )}
            <button
              className="factCard__actionButton"
              onClick={() => setIsEditing(true)}
              title="Edit fact statement"
              aria-label="Edit fact statement"
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
                navigate(`/corpus/${fact.corpusId}/fact/${fact.id}`);
              }}
              title="View fact details"
              aria-label="View fact details"
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
});

FactCard.displayName = "FactCard";
