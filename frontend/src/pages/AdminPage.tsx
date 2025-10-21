import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminApi, type ModelMetadata } from "../api/admin";
import { AdminSidebar } from "../components/admin/AdminSidebar";
import { DataTable } from "../components/admin/DataTable";
import { RecordModal } from "../components/admin/RecordModal";
import { PageHeader } from "../components/common/PageHeader";
import { Button } from "../components/common/Button";
import "./AdminPage.css";

export const AdminPage: React.FC = () => {
  const { isAdmin, userEmail } = useAuth();
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedMetadata, setSelectedMetadata] =
    useState<ModelMetadata | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      loadModelData(selectedModel, filters);
    }
  }, [selectedModel, filters]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const models = await adminApi.getModels();
      setModels(models);
      if (models.length > 0) {
        setSelectedModel(models[0].name);
      }
    } catch (error) {
      console.error("Failed to load models:", error);
      alert("Failed to load models. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  const loadModelData = async (
    modelName: string,
    filters: Record<string, any> = {}
  ) => {
    try {
      setLoading(true);
      const [metadata, records] = await Promise.all([
        adminApi.getModelMetadata(modelName),
        adminApi.findAll(modelName, filters),
      ]);
      setSelectedMetadata(metadata);
      setData(records);
    } catch (error) {
      console.error("Failed to load model data:", error);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName);
    setFilters({});
  };

  const handleCreate = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const handleEdit = async (id: string) => {
    if (!selectedModel) return;
    try {
      const record = await adminApi.findOne(selectedModel, id);
      setEditingRecord(record);
      setModalOpen(true);
    } catch (error) {
      console.error("Failed to load record:", error);
      alert("Failed to load record");
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedModel) return;
    try {
      await adminApi.delete(selectedModel, id);
      loadModelData(selectedModel, filters);
    } catch (error) {
      console.error("Failed to delete record:", error);
      alert("Failed to delete record");
    }
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (!selectedModel) return;
    try {
      if (editingRecord) {
        await adminApi.update(selectedModel, editingRecord.id, formData);
      } else {
        await adminApi.create(selectedModel, formData);
      }
      setModalOpen(false);
      setEditingRecord(null);
      loadModelData(selectedModel, filters);
    } catch (error) {
      console.error("Failed to save record:", error);
      alert("Failed to save record: " + (error as Error).message);
    }
  };

  const handleRelationClick = (modelName: string, id: string) => {
    setSelectedModel(modelName);
    setFilters({ id });
  };

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-unauthorized">
          <h1>Unauthorized</h1>
          <p>You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading && models.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader
        title="Admin Panel"
        userEmail={userEmail}
        actions={
          <Button variant="secondary" onClick={() => navigate("/projects")}>
            ← Back to Projects
          </Button>
        }
      />
      <div className="admin-main">
        <AdminSidebar
          models={models}
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
        />
        <div className="admin-content">
          {selectedMetadata ? (
            <DataTable
              metadata={selectedMetadata}
              data={data}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCreate={handleCreate}
              onRelationClick={handleRelationClick}
              onFilterChange={handleFilterChange}
            />
          ) : (
            <div className="admin-empty">
              <p>Select a model from the sidebar</p>
            </div>
          )}
        </div>
      </div>
      {modalOpen && selectedMetadata && (
        <RecordModal
          metadata={selectedMetadata}
          record={editingRecord}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
};
