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
import type { Project, Corpus, Fact, FactState, FactContext } from "../types";
import { FactContext as FactContextEnum } from "../types";
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
      // Redirect to projects page if resource not found
      navigate("/projects", { replace: true });
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
      <div className="projectDetailPage">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    // Redirect to projects page if project not found
    navigate("/projects", { replace: true });
    return null;
  }

  return (
    <div className="projectDetailPage">
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

      <main className="projectDetailPage__main">
        {corpuses.length === 0 ? (
          <div className="projectDetailPage__emptyState">
            <p>Create a corpus to begin adding facts</p>
          </div>
        ) : (
          <div className="projectDetailPage__corpusColumns">
            {orderCorpusesLeftToRight(corpuses).map((corpus) => (
              <div key={corpus.id} className="projectDetailPage__corpusColumn">
                <div className="projectDetailPage__corpusColumnInner">
                  <div className="projectDetailPage__corpusFacts">
                    {!factsByCorpus[corpus.id] ||
                    factsByCorpus[corpus.id].length === 0 ? (
                      <div className="projectDetailPage__emptyCorpus">
                        <p>No facts yet</p>
                      </div>
                    ) : (
                      <div className="projectDetailPage__factsList">
                        {factsByCorpus[corpus.id]
                          .filter((fact) => fact.context === FactContextEnum.CORPUS_KNOWLEDGE)
                          .map((fact) => (
                            <FactCard
                              key={fact.id}
                              fact={fact}
                              onUpdate={handleUpdateFact}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="projectDetailPage__corpusActions">
                    <Button
                      className="projectDetailPage__editCorpusButton"
                      variant="secondary"
                      onClick={() => navigate(`/corpus/${corpus.id}`)}
                      title="Edit corpus"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.334 2.00004C11.5091 1.82494 11.7169 1.68605 11.9457 1.59129C12.1745 1.49653 12.4197 1.44775 12.6673 1.44775C12.9149 1.44775 13.1601 1.49653 13.3889 1.59129C13.6177 1.68605 13.8256 1.82494 14.0007 2.00004C14.1758 2.17513 14.3147 2.383 14.4094 2.61178C14.5042 2.84055 14.553 3.08575 14.553 3.33337C14.553 3.58099 14.5042 3.82619 14.4094 4.05497C14.3147 4.28374 14.1758 4.49161 14.0007 4.66671L5.00065 13.6667L1.33398 14.6667L2.33398 11L11.334 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                    <Button
                      className="projectDetailPage__addFactButton"
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
