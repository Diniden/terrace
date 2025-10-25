import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { FactStack } from "../components/user/FactStack";
import { computeFactStacks } from "../utils/factStackUtils";
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
  const [columnCountByCorpus, setColumnCountByCorpus] = useState<Record<string, number>>({});
  const [stackViewByCorpus, setStackViewByCorpus] = useState<Record<string, boolean>>({});

  const llmInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const corpusColumnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const factCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
    // Update the fact via API and get the updated fact in response
    const updatedFact = await factsApi.update(id, data);

    // Update local state with the response data instead of reloading all data
    setFactsByCorpus(prevFactsByCorpus => {
      const newFactsByCorpus = { ...prevFactsByCorpus };

      // Find which corpus contains this fact and update it
      for (const corpusId in newFactsByCorpus) {
        const facts = newFactsByCorpus[corpusId];
        const factIndex = facts.findIndex(f => f.id === id);

        if (factIndex !== -1) {
          newFactsByCorpus[corpusId] = [
            ...facts.slice(0, factIndex),
            updatedFact,
            ...facts.slice(factIndex + 1)
          ];
          break;
        }
      }

      return newFactsByCorpus;
    });
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

  const handleNavigateToBasis = useCallback((basisId: string) => {
    // Find which corpus contains the basis fact
    let targetCorpusId: string | null = null;
    let basisFact: Fact | null = null;

    for (const [corpusId, facts] of Object.entries(factsByCorpus)) {
      const found = facts.find(f => f.id === basisId);
      if (found) {
        targetCorpusId = corpusId;
        basisFact = found;
        break;
      }
    }

    if (!targetCorpusId || !basisFact) {
      console.warn('Could not find corpus containing basis fact:', basisId);
      return;
    }

    // Scroll corpus column into view
    const corpusColumnElement = corpusColumnRefs.current[targetCorpusId];
    if (corpusColumnElement) {
      corpusColumnElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }

    // Wait for corpus scroll to complete, then scroll to the fact card
    setTimeout(() => {
      const factCardElement = factCardRefs.current[basisId];
      if (factCardElement) {
        factCardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Add highlight class
        factCardElement.classList.add('factCard--highlighted');

        // Remove highlight class after animation completes (5 seconds)
        setTimeout(() => {
          factCardElement.classList.remove('factCard--highlighted');
        }, 5000);
      }
    }, 500);
  }, [factsByCorpus]);

  const handleNavigateToDependents = useCallback((factId: string) => {
    // Highlight the source card immediately
    const sourceFactCardElement = factCardRefs.current[factId];
    if (sourceFactCardElement) {
      sourceFactCardElement.classList.add('factCard--highlighted');

      // Remove highlight class after animation completes (5 seconds)
      setTimeout(() => {
        sourceFactCardElement.classList.remove('factCard--highlighted');
      }, 5000);
    }

    // Find the corpus containing the source fact
    let sourceCorpusId: string | null = null;

    for (const [corpusId, facts] of Object.entries(factsByCorpus)) {
      const found = facts.find(f => f.id === factId);
      if (found) {
        sourceCorpusId = corpusId;
        break;
      }
    }

    if (!sourceCorpusId) {
      console.warn('Could not find corpus containing source fact:', factId);
      return;
    }

    // Find the child corpus (corpus that has sourceCorpusId as its basisCorpusId)
    const childCorpus = corpuses.find(c => c.basisCorpusId === sourceCorpusId);

    if (!childCorpus) {
      console.warn('No child corpus found for corpus:', sourceCorpusId);
      return;
    }

    // Find all facts in child corpus that have this fact as their basis
    const dependentFacts = (factsByCorpus[childCorpus.id] || [])
      .filter(f => f.basisId === factId && f.context === FactContextEnum.CORPUS_KNOWLEDGE);

    if (dependentFacts.length === 0) {
      console.warn('No dependent facts found for fact:', factId);
      return;
    }

    // Store dependent fact IDs for highlighting (not references that might become stale)
    const dependentFactIds = dependentFacts.map(f => f.id);

    // Sort the child corpus to put dependent facts at the top
    setFactsByCorpus(prevFactsByCorpus => {
      const newFactsByCorpus = { ...prevFactsByCorpus };
      const childFacts = newFactsByCorpus[childCorpus.id] || [];

      // Separate dependent facts from others by ID
      const dependents = childFacts.filter(f => dependentFactIds.includes(f.id));
      const others = childFacts.filter(f => !dependentFactIds.includes(f.id));

      // Put dependent facts first
      newFactsByCorpus[childCorpus.id] = [...dependents, ...others];

      return newFactsByCorpus;
    });

    // Scroll child corpus column into view
    const corpusColumnElement = corpusColumnRefs.current[childCorpus.id];
    if (corpusColumnElement) {
      corpusColumnElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }

    // Wait for corpus scroll to complete, then scroll to top and highlight dependents
    setTimeout(() => {
      // Scroll to the top of the child corpus
      if (corpusColumnElement) {
        const firstFactElement = corpusColumnElement.querySelector('.projectDetailPage__factsList');
        if (firstFactElement) {
          firstFactElement.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }

      // Highlight all dependent facts using IDs (not stale references)
      dependentFactIds.forEach(factId => {
        const factCardElement = factCardRefs.current[factId];
        if (factCardElement) {
          factCardElement.classList.add('factCard--highlighted');

          // Remove highlight class after animation completes (5 seconds)
          setTimeout(() => {
            factCardElement.classList.remove('factCard--highlighted');
          }, 5000);
        }
      });
    }, 500);
  }, [factsByCorpus, corpuses]);

  // Helper function to calculate number of dependent facts for a given fact
  const getDependentsCount = useCallback((factId: string): number => {
    // Find the corpus containing the source fact
    let sourceCorpusId: string | null = null;

    for (const [corpusId, facts] of Object.entries(factsByCorpus)) {
      const found = facts.find(f => f.id === factId);
      if (found) {
        sourceCorpusId = corpusId;
        break;
      }
    }

    if (!sourceCorpusId) {
      return 0;
    }

    // Find the child corpus (corpus that has sourceCorpusId as its basisCorpusId)
    const childCorpus = corpuses.find(c => c.basisCorpusId === sourceCorpusId);

    if (!childCorpus) {
      return 0;
    }

    // Count all facts in child corpus that have this fact as their basis
    const dependentCount = (factsByCorpus[childCorpus.id] || [])
      .filter(f => f.basisId === factId && f.context === FactContextEnum.CORPUS_KNOWLEDGE)
      .length;

    return dependentCount;
  }, [factsByCorpus, corpuses]);

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

  // Helper function to expand columns (increment count with loop)
  const handleExpandColumns = (corpusId: string) => {
    setColumnCountByCorpus(prev => {
      const currentCount = prev[corpusId] || 1;
      const facts = factsByCorpus[corpusId]?.filter(f => f.context === FactContextEnum.CORPUS_KNOWLEDGE) || [];
      const maxColumns = Math.min(5, facts.length);

      // Loop: if at max, go to 1; otherwise increment
      const nextCount = currentCount >= maxColumns ? 1 : currentCount + 1;
      return { ...prev, [corpusId]: nextCount };
    });
  };

  // Helper function to shrink columns (decrement count with loop)
  const handleShrinkColumns = (corpusId: string) => {
    setColumnCountByCorpus(prev => {
      const currentCount = prev[corpusId] || 1;
      const facts = factsByCorpus[corpusId]?.filter(f => f.context === FactContextEnum.CORPUS_KNOWLEDGE) || [];
      const maxColumns = Math.min(5, facts.length);

      // Loop: if at 1, go to max; otherwise decrement
      const nextCount = currentCount <= 1 ? maxColumns : currentCount - 1;
      return { ...prev, [corpusId]: nextCount };
    });
  };

  // Helper function to get column count for a corpus
  const getColumnCount = (corpusId: string): number => {
    return columnCountByCorpus[corpusId] || 1;
  };

  // Helper function to toggle stack view for a specific corpus
  const handleToggleStackView = (corpusId: string) => {
    setStackViewByCorpus(prev => ({ ...prev, [corpusId]: !prev[corpusId] }));
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
            <Button variant="outline" onClick={() => navigate("/projects")} title="Back to Projects">
              ← Projects
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
              <div
                key={corpus.id}
                className="projectDetailPage__corpusColumn"
                ref={(el) => { corpusColumnRefs.current[corpus.id] = el; }}
                style={{
                  width: `calc(var(--corpus-column-width) * ${getColumnCount(corpus.id)})`
                }}
              >
                <div className="projectDetailPage__corpusColumnInner">
                  <div className="projectDetailPage__corpusFacts">
                    {!factsByCorpus[corpus.id] ||
                    factsByCorpus[corpus.id].length === 0 ? (
                      <div className="projectDetailPage__emptyCorpus">
                        <p>No facts yet</p>
                      </div>
                    ) : stackViewByCorpus[corpus.id] ? (
                      <div
                        className="projectDetailPage__factsList"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${getColumnCount(corpus.id)}, 1fr)`,
                          gap: 'var(--spacing-lg)',
                          alignItems: 'start'
                        }}
                      >
                        {computeFactStacks(
                          factsByCorpus[corpus.id].filter((fact) => fact.context === FactContextEnum.CORPUS_KNOWLEDGE)
                        ).map((stack) => (
                          <FactStack
                            key={stack.topFact.id}
                            ref={(el) => { factCardRefs.current[stack.topFact.id] = el; }}
                            stack={stack}
                            onUpdate={handleUpdateFact}
                            viewContext="project"
                            onNavigateToBasis={handleNavigateToBasis}
                            onNavigateToDependents={handleNavigateToDependents}
                            dependentsCount={getDependentsCount(stack.topFact.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="projectDetailPage__factsList"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${getColumnCount(corpus.id)}, 1fr)`,
                          gap: 'var(--spacing-lg)',
                          alignItems: 'start'
                        }}
                      >
                        {factsByCorpus[corpus.id]
                          .filter((fact) => fact.context === FactContextEnum.CORPUS_KNOWLEDGE)
                          .map((fact) => (
                            <FactCard
                              key={fact.id}
                              ref={(el) => { factCardRefs.current[fact.id] = el; }}
                              fact={fact}
                              onUpdate={handleUpdateFact}
                              viewContext="project"
                              onNavigateToBasis={handleNavigateToBasis}
                              onNavigateToDependents={handleNavigateToDependents}
                              dependentsCount={getDependentsCount(fact.id)}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="projectDetailPage__corpusActions">
                    <Button
                      className="projectDetailPage__stackViewButton"
                      variant="secondary"
                      onClick={() => handleToggleStackView(corpus.id)}
                      title={stackViewByCorpus[corpus.id] ? "Disable stack view" : "Enable stack view"}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Overlapped boxes icon */}
                        <rect x="2" y="6" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <rect x="6" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill={stackViewByCorpus[corpus.id] ? "currentColor" : "none"} fillOpacity={stackViewByCorpus[corpus.id] ? "0.2" : "0"}/>
                      </svg>
                    </Button>
                    <Button
                      className="projectDetailPage__expandColumnsButton"
                      variant="secondary"
                      onClick={() => handleExpandColumns(corpus.id)}
                      title={`Expand columns (${getColumnCount(corpus.id)} of ${Math.min(5, factsByCorpus[corpus.id]?.filter(f => f.context === FactContextEnum.CORPUS_KNOWLEDGE).length || 0)})`}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M3 6L1 8L3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 8H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M13 6L15 8L13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                    <Button
                      className="projectDetailPage__shrinkColumnsButton"
                      variant="secondary"
                      onClick={() => handleShrinkColumns(corpus.id)}
                      title={`Shrink columns (${getColumnCount(corpus.id)} of ${Math.min(5, factsByCorpus[corpus.id]?.filter(f => f.context === FactContextEnum.CORPUS_KNOWLEDGE).length || 0)})`}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 8H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M4 6L6 8L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M12 6L10 8L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
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
