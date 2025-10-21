import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ModelMetadata } from '../../api/admin';
import './AdminSidebar.css';

interface AdminSidebarProps {
  models: ModelMetadata[];
  selectedModel: string | null;
  onModelSelect: (modelName: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  models,
  selectedModel,
  onModelSelect,
}) => {
  const { logout } = useAuth();

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>Admin Panel</h2>
      </div>
      <nav className="admin-sidebar-nav">
        {models.map((model) => (
          <button
            key={model.name}
            className={`admin-sidebar-item ${selectedModel === model.name ? 'active' : ''}`}
            onClick={() => onModelSelect(model.name)}
          >
            {model.displayName}
          </button>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <button className="admin-logout-button" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
};
