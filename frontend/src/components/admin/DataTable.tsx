import React, { useState } from 'react';
import type { ModelMetadata, FieldMetadata } from '../../api/admin';
import './DataTable.css';

interface DataTableProps {
  metadata: ModelMetadata;
  data: any[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onRelationClick: (modelName: string, id: string) => void;
  onFilterChange: (filters: Record<string, any>) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  metadata,
  data,
  onEdit,
  onDelete,
  onCreate,
  onRelationClick,
  onFilterChange,
}) => {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleFilterChange = (fieldName: string, value: string) => {
    const newFilters = { ...filters, [fieldName]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const renderCellValue = (item: any, field: FieldMetadata) => {
    const value = item[field.name];

    if (value === null || value === undefined) {
      return <span className="null-value">null</span>;
    }

    // Handle dates
    if (field.type === 'timestamp' || field.name.includes('At')) {
      return new Date(value).toLocaleString();
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Handle objects/JSON
    if (typeof value === 'object') {
      return <pre className="json-value">{JSON.stringify(value, null, 2)}</pre>;
    }

    return String(value);
  };

  const renderRelationValue = (item: any, relation: any) => {
    const value = item[relation.name];

    if (!value) {
      return <span className="null-value">null</span>;
    }

    if (Array.isArray(value)) {
      return (
        <div className="relation-array">
          {value.map((v, idx) => (
            <button
              key={idx}
              className="relation-link"
              onClick={() => onRelationClick(relation.relatedModel, v.id)}
            >
              {v.name || v.email || v.id.slice(0, 8)}
            </button>
          ))}
        </div>
      );
    }

    return (
      <button
        className="relation-link"
        onClick={() => onRelationClick(relation.relatedModel, value.id)}
      >
        {value.name || value.email || value.id.slice(0, 8)}
      </button>
    );
  };

  const displayFields = metadata.fields.filter(
    (f) => !f.name.endsWith('Id') && f.name !== 'password'
  );

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h2>{metadata.displayName}</h2>
        <div className="data-table-actions">
          {hasActiveFilters && (
            <button className="clear-filters-button" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
          <button className="create-button" onClick={onCreate}>
            Create New
          </button>
        </div>
      </div>

      <div className="data-table-filters">
        {displayFields.map((field) => (
          <div key={field.name} className="filter-input-group">
            <label htmlFor={`filter-${field.name}`}>{field.name}</label>
            <input
              id={`filter-${field.name}`}
              type="text"
              value={filters[field.name] || ''}
              onChange={(e) => handleFilterChange(field.name, e.target.value)}
              placeholder={`Filter by ${field.name}`}
              className="filter-input"
            />
          </div>
        ))}
      </div>

      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {displayFields.map((field) => (
                <th key={field.name}>{field.name}</th>
              ))}
              {metadata.relations.map((relation) => (
                <th key={relation.name}>{relation.name}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={displayFields.length + metadata.relations.length + 1} className="empty-message">
                  No records found
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  {displayFields.map((field) => (
                    <td key={field.name}>{renderCellValue(item, field)}</td>
                  ))}
                  {metadata.relations.map((relation) => (
                    <td key={relation.name}>{renderRelationValue(item, relation)}</td>
                  ))}
                  <td>
                    <div className="row-actions">
                      <button
                        className="edit-button"
                        onClick={() => onEdit(item.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => {
                          if (confirm(`Delete this ${metadata.displayName}?`)) {
                            onDelete(item.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
