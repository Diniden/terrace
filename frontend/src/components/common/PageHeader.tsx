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
    <header className="page-header">
      {userEmail && <span className="user-email">{userEmail}</span>}
      <h1>{title}</h1>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
};
