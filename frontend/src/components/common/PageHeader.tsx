import React from "react";
import "./PageHeader.css";

interface PageHeaderProps {
  title: string;
  userEmail?: string | null;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  userEmail,
  actions,
}) => {
  return (
    <header className="pageHeader">
      {userEmail && <span className="pageHeader__userEmail">{userEmail}</span>}
      <h1 className="pageHeader__title">{title}</h1>
      {actions && <div className="pageHeader__actions">{actions}</div>}
    </header>
  );
};
