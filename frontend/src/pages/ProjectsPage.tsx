import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import { TextInput } from '../components/common/TextInput';
import { TextArea } from '../components/common/TextArea';
import { PageHeader } from '../components/common/PageHeader';
import type { Project } from '../types';
import './ProjectsPage.css';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { logout, isAdmin, userEmail } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await projectsApi.create({
        name: newProjectName,
        description: newProjectDescription || undefined,
      });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      await loadProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="projectsPage">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="projectsPage">
      <PageHeader
        title="My Projects"
        userEmail={userEmail}
        actions={
          <>
            {isAdmin && (
              <Button variant="secondary" onClick={() => navigate('/admin')}>
                Admin Panel
              </Button>
            )}
            <Button onClick={() => setShowCreateModal(true)}>
              New Project
            </Button>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </>
        }
      />

      <div className="projectsPage__container">
        {projects.length === 0 ? (
          <div className="projectsPage__emptyState">
            <p>Click New Project to begin</p>
          </div>
        ) : (
          <div className="projectsPage__grid">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="projectsPage__projectCard"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <h3 className="projectsPage__projectTitle">{project.name}</h3>
                {project.description && <p className="projectsPage__projectDescription">{project.description}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject}>
          <TextInput
            label="Project Name"
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            required
            disabled={creating}
            placeholder="Enter project name"
          />
          <TextArea
            label="Description (Optional)"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            disabled={creating}
            rows={3}
            placeholder="Enter project description"
          />
          {error && <div className="loginPage__error">{error}</div>}
          <div className="loginPage__modalActions">
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
