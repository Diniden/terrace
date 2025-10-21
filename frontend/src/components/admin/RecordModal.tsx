import React, { useState, useEffect } from 'react';
import type { ModelMetadata, FieldMetadata } from '../../api/admin';
import './RecordModal.css';

interface RecordModalProps {
  metadata: ModelMetadata;
  record: any | null;
  onSave: (data: Record<string, any>) => void;
  onClose: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  metadata,
  record,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (record) {
      setFormData(record);
    } else {
      setFormData({});
    }
  }, [record]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (fieldName: string, value: any) => {
    setFormData({ ...formData, [fieldName]: value });
  };

  const renderInput = (field: FieldMetadata) => {
    const value = formData[field.name] || '';

    // Don't render primary key or timestamps
    if (field.isPrimary || field.name.includes('At')) {
      return null;
    }

    // Don't render password field
    if (field.name === 'password') {
      return (
        <div key={field.name} className="form-field">
          <label htmlFor={field.name}>
            {field.name}
            {!field.nullable && <span className="required">*</span>}
          </label>
          <input
            type="password"
            id={field.name}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={!field.nullable}
            placeholder={record ? 'Leave blank to keep current password' : ''}
          />
        </div>
      );
    }

    // Handle enums
    if (field.isEnum && field.enumValues) {
      return (
        <div key={field.name} className="form-field">
          <label htmlFor={field.name}>
            {field.name}
            {!field.nullable && <span className="required">*</span>}
          </label>
          <select
            id={field.name}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={!field.nullable}
          >
            <option value="">Select {field.name}</option>
            {field.enumValues.map((enumValue) => (
              <option key={enumValue} value={enumValue}>
                {enumValue}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Handle booleans
    if (field.type === 'boolean') {
      return (
        <div key={field.name} className="form-field checkbox-field">
          <label htmlFor={field.name}>
            <input
              type="checkbox"
              id={field.name}
              checked={!!value}
              onChange={(e) => handleChange(field.name, e.target.checked)}
            />
            {field.name}
          </label>
        </div>
      );
    }

    // Handle JSON
    if (field.type === 'jsonb') {
      return (
        <div key={field.name} className="form-field">
          <label htmlFor={field.name}>
            {field.name}
            {!field.nullable && <span className="required">*</span>}
          </label>
          <textarea
            id={field.name}
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(field.name, parsed);
              } catch {
                handleChange(field.name, e.target.value);
              }
            }}
            required={!field.nullable}
            rows={5}
            placeholder="{}"
          />
        </div>
      );
    }

    // Handle numbers
    if (field.type === 'integer' || field.type === 'numeric') {
      return (
        <div key={field.name} className="form-field">
          <label htmlFor={field.name}>
            {field.name}
            {!field.nullable && <span className="required">*</span>}
          </label>
          <input
            type="number"
            id={field.name}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.valueAsNumber)}
            required={!field.nullable}
          />
        </div>
      );
    }

    // Default text input
    return (
      <div key={field.name} className="form-field">
        <label htmlFor={field.name}>
          {field.name}
          {!field.nullable && <span className="required">*</span>}
        </label>
        <input
          type="text"
          id={field.name}
          value={value}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={!field.nullable}
        />
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{record ? `Edit ${metadata.displayName}` : `Create ${metadata.displayName}`}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {metadata.fields.map((field) => renderInput(field))}
          </div>
          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
