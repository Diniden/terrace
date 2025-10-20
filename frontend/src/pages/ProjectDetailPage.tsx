import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { corpusesApi } from '../api/corpuses';
import { factsApi } from '../api/facts';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import { TextInput } from '../components/common/TextInput';
import { FactCard } from '../components/user/FactCard';
import type { Project, Corpus, Fact, FactState } from '../types';
import './ProjectDetailPage.css';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [corpuses, setCorpuses] = useState<Corpus[]>([]);
  const [factsByCorpus, setFactsByCorpus] = useState<Record<string, Fact[]>>({});
  const [loading, setLoading] = useState(true);
  const [showNewCorpusModal, setShowNewCorpusModal] = useState(false);
  const [newCorpusName, setNewCorpusName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const [projectData, corpusesData] = await Promise.all([
        projectsApi.getOne(projectId),
        corpusesApi.getAll(projectId),
      ]);

      setProject(projectData);
      setCorpuses(corpusesData.data);

      // Load facts for each corpus
      const factsPromises = corpusesData.data.map(corpus =>
        factsApi.getAll(corpus.id)
      );
      const factsResults = await Promise.all(factsPromises);

      const factsByCorpusMap: Record<string, Fact[]> = {};
      corpusesData.data.forEach((corpus, index) => {
        factsByCorpusMap[corpus.id] = factsResults[index].data;
      });

      setFactsByCorpus(factsByCorpusMap);
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCorpus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setCreating(true);
    try {
      await corpusesApi.create({
        name: newCorpusName,
        projectId,
      });
      setShowNewCorpusModal(false);
      setNewCorpusName('');
      await loadProjectData();
    } catch (err) {
      console.error('Failed to create corpus:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateFact = async (corpusId: string) => {
    try {
      await factsApi.create({ corpusId });
      await loadProjectData();
    } catch (err) {
      console.error('Failed to create fact:', err);
    }
  };

  const handleUpdateFact = async (
    id: string,
    data: { statement?: string; state?: FactState }
  ) => {
    await factsApi.update(id, data);
    await loadProjectData();
  };

  if (loading) {
    return (
      <div className="project-detail-page">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <p>Project not found</p>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <header className="page-header">
        <div className="header-left">
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            ← Back
          </Button>
          <h1>{project.name}</h1>
        </div>
        <div className="header-actions">
          <Button onClick={() => setShowNewCorpusModal(true)}>
            New Corpus
          </Button>
        </div>
      </header>

      <footer className="page-footer">
        <div className="llm-chat-container">
          <input
            type="text"
            className="llm-chat-input"
            placeholder="Chat with LLM (not functional yet)..."
            disabled
          />
          <button className="voice-button" disabled title="Voice input (not functional yet)">
            🎤
          </button>
        </div>
      </footer>

      <main className="project-main">
        {corpuses.length === 0 ? (
          <div className="empty-state">
            <p>Create a corpus to begin adding facts</p>
          </div>
        ) : (
          <div className="corpus-columns">
            {corpuses.map((corpus) => (
              <div key={corpus.id} className="corpus-column">
                <div className="corpus-facts">
                  {(!factsByCorpus[corpus.id] || factsByCorpus[corpus.id].length === 0) ? (
                    <div className="empty-corpus">
                      <p>No facts yet</p>
                    </div>
                  ) : (
                    <div className="facts-list">
                      {factsByCorpus[corpus.id].map((fact) => (
                        <FactCard
                          key={fact.id}
                          fact={fact}
                          onUpdate={handleUpdateFact}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    className="add-fact-button"
                    onClick={() => handleCreateFact(corpus.id)}
                    title="Add new fact"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal
        isOpen={showNewCorpusModal}
        onClose={() => setShowNewCorpusModal(false)}
        title="Create New Corpus"
      >
        <form onSubmit={handleCreateCorpus}>
          <TextInput
            label="Corpus Name"
            type="text"
            value={newCorpusName}
            onChange={(e) => setNewCorpusName(e.target.value)}
            required
            disabled={creating}
            placeholder="Enter corpus name"
          />
          <div className="modal-actions">
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Corpus'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowNewCorpusModal(false)}
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
