import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsApi } from "../api/projects";
import { corpusesApi } from "../api/corpuses";
import { factsApi } from "../api/facts";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { Spinner } from "../components/common/Spinner";
import { Modal } from "../components/common/Modal";
import { TextInput } from "../components/common/TextInput";
import { PageHeader } from "../components/common/PageHeader";
import { PageFooter } from "../components/common/PageFooter";
import { FactCard } from "../components/user/FactCard";
import type { Project, Corpus, Fact, FactState } from "../types";
import "./ProjectDetailPage.css";

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [corpuses, setCorpuses] = useState<Corpus[]>([]);
  const [factsByCorpus, setFactsByCorpus] = useState<Record<string, Fact[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [showNewCorpusModal, setShowNewCorpusModal] = useState(false);
  const [newCorpusName, setNewCorpusName] = useState("");
  const [creating, setCreating] = useState(false);
  const [llmInput, setLlmInput] = useState("");
  const [isListening, setIsListening] = useState(false);

  const llmInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        setLlmInput(finalTranscript + interimTranscript);

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Stop after 2 seconds of silence
        silenceTimerRef.current = window.setTimeout(() => {
          stopListening();
        }, 2000);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      recognitionRef.current = recognition;
    }

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if user is already focusing an input element
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      if (isInputFocused) return;

      if (e.key === "l") {
        e.preventDefault();
        llmInputRef.current?.focus();
      } else if (e.key === "k") {
        e.preventDefault();
        startListening();
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

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
      const factsPromises = corpusesData.data.map((corpus) =>
        factsApi.getAll(corpus.id)
      );
      const factsResults = await Promise.all(factsPromises);

      const factsByCorpusMap: Record<string, Fact[]> = {};
      corpusesData.data.forEach((corpus, index) => {
        factsByCorpusMap[corpus.id] = factsResults[index].data;
      });

      setFactsByCorpus(factsByCorpusMap);
    } catch (err) {
      console.error("Failed to load project data:", err);
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
      setNewCorpusName("");
      await loadProjectData();
    } catch (err) {
      console.error("Failed to create corpus:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateFact = async (corpusId: string) => {
    try {
      await factsApi.create({ corpusId });
      await loadProjectData();
    } catch (err) {
      console.error("Failed to create fact:", err);
    }
  };

  const handleUpdateFact = async (
    id: string,
    data: { statement?: string; state?: FactState }
  ) => {
    await factsApi.update(id, data);
    await loadProjectData();
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      llmInputRef.current?.focus();
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Helper function to order corpuses from root (no parent) to leaves (left to right)
  const orderCorpusesLeftToRight = (corpuses: Corpus[]): Corpus[] => {
    if (corpuses.length === 0) return [];

    const ordered: Corpus[] = [];

    // Find the root corpus (no basisCorpusId)
    let current = corpuses.find((c) => !c.basisCorpusId);

    // Traverse the chain from root to leaves
    while (current) {
      ordered.push(current);
      // Find the child of current corpus
      const child = corpuses.find((c) => c.basisCorpusId === current!.id);
      current = child;
    }

    return ordered;
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
      <PageHeader
        title={project.name}
        userEmail={userEmail}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/projects")}>
              ← Back
            </Button>
            <Button onClick={() => setShowNewCorpusModal(true)}>
              New Corpus
            </Button>
          </>
        }
      />

      <main className="project-main">
        {corpuses.length === 0 ? (
          <div className="empty-state">
            <p>Create a corpus to begin adding facts</p>
          </div>
        ) : (
          <div className="corpus-columns">
            {orderCorpusesLeftToRight(corpuses).map((corpus) => (
              <div key={corpus.id} className="corpus-column">
                <div className="corpus-column-inner">
                  <div className="corpus-facts">
                    {!factsByCorpus[corpus.id] ||
                    factsByCorpus[corpus.id].length === 0 ? (
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
                  </div>
                  <div className="corpus-actions">
                    <Button
                      className="add-fact-button"
                      onClick={() => handleCreateFact(corpus.id)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PageFooter
        llmInput={llmInput}
        onLlmInputChange={setLlmInput}
        isListening={isListening}
        onToggleListening={toggleListening}
        llmInputRef={llmInputRef}
      />

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
              {creating ? "Creating..." : "Create Corpus"}
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
