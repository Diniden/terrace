import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { userEmail } = useAuth();

  return (
    <div className="app-layout">
      {userEmail && (
        <div className="app-layout__user-email">
          {userEmail}
        </div>
      )}
      <div className="app-layout__content">
        {children}
      </div>
    </div>
  );
};
