import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { corpusesApi } from '../api/corpuses';
import { factsApi } from '../api/facts';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/common/PageHeader';
import { PageFooter } from '../components/common/PageFooter';
import { FactCard } from '../components/user/FactCard';
import type { Corpus, Fact, FactState, FactContext } from '../types';
import { FactContext as FactContextEnum, FactState as FactStateEnum } from '../types';
import './CorpusView.css';

export const CorpusView: React.FC = () => {
  const { corpusId } = useParams<{ corpusId: string }>();
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [corpusName, setCorpusName] = useState('');
  const [llmInput, setLlmInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const llmInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (corpusId) {
      loadCorpusData();
    }
  }, [corpusId]);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
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
        console.error('Speech recognition error:', event.error);
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

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const loadCorpusData = async () => {
    if (!corpusId) return;

    setLoading(true);
    try {
      const [corpusData, factsData] = await Promise.all([
        corpusesApi.getOne(corpusId),
        factsApi.getAll(corpusId),
      ]);

      setCorpus(corpusData);
      setCorpusName(corpusData.name);
      setFacts(factsData.data);
    } catch (err) {
      console.error('Failed to load corpus data:', err);
      // Redirect to projects page if resource not found
      navigate('/projects', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCorpusName = async () => {
    if (!corpusId || !corpusName.trim() || corpusName === corpus?.name) {
      setIsEditingName(false);
      setCorpusName(corpus?.name || '');
      return;
    }

    try {
      const updated = await corpusesApi.update(corpusId, { name: corpusName.trim() });
      setCorpus(updated);
      setCorpusName(updated.name);
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update corpus name:', err);
      setCorpusName(corpus?.name || '');
    }
  };

  const handleAddGlobalFact = async () => {
    if (!corpusId) return;
    try {
      await factsApi.create({
        corpusId,
        context: FactContextEnum.CORPUS_GLOBAL,
        state: FactStateEnum.CLARIFY,
      });
      await loadCorpusData();
    } catch (err) {
      console.error('Failed to create global fact:', err);
    }
  };

  const handleAddBuilderFact = async () => {
    if (!corpusId) return;
    try {
      await factsApi.create({
        corpusId,
        context: FactContextEnum.CORPUS_BUILDER,
        state: FactStateEnum.CLARIFY,
      });
      await loadCorpusData();
    } catch (err) {
      console.error('Failed to create builder fact:', err);
    }
  };

  const handleAddKnowledgeFact = async () => {
    if (!corpusId) return;
    try {
      await factsApi.create({
        corpusId,
        context: FactContextEnum.CORPUS_KNOWLEDGE,
        state: FactStateEnum.CLARIFY,
      });
      await loadCorpusData();
    } catch (err) {
      console.error('Failed to create knowledge fact:', err);
    }
  };

  const handleUpdateFact = async (
    id: string,
    data: { statement?: string; state?: FactState }
  ) => {
    await factsApi.update(id, data);
    await loadCorpusData();
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

  const handleBack = () => {
    if (corpus?.projectId) {
      navigate(`/projects/${corpus.projectId}`);
    } else {
      navigate(-1);
    }
  };

  const knowledgeFacts = facts.filter(f => f.context === FactContextEnum.CORPUS_KNOWLEDGE);
  const globalFacts = facts.filter(f => f.context === FactContextEnum.CORPUS_GLOBAL);
  const builderFacts = facts.filter(f => f.context === FactContextEnum.CORPUS_BUILDER);

  if (loading) {
    return (
      <div className="corpusView">
        <Spinner />
      </div>
    );
  }

  if (!corpus) {
    // Redirect to projects page if corpus not found
    navigate('/projects', { replace: true });
    return null;
  }

  return (
    <div className="corpusView">
      <PageHeader
        title={
          isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              className="corpusView__nameInput"
              value={corpusName}
              onChange={(e) => setCorpusName(e.target.value)}
              onBlur={handleUpdateCorpusName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateCorpusName();
                } else if (e.key === 'Escape') {
                  setIsEditingName(false);
                  setCorpusName(corpus.name);
                }
              }}
            />
          ) : (
            <div
              className="corpusView__nameDisplay"
              onClick={() => setIsEditingName(true)}
              title="Click to edit corpus name"
            >
              {corpus.name}
              <svg
                className="corpusView__editIcon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.334 2.00004C11.5091 1.82494 11.7169 1.68605 11.9457 1.59129C12.1745 1.49653 12.4197 1.44775 12.6673 1.44775C12.9149 1.44775 13.1601 1.49653 13.3889 1.59129C13.6177 1.68605 13.8256 1.82494 14.0007 2.00004C14.1758 2.17513 14.3147 2.383 14.4094 2.61178C14.5042 2.84055 14.553 3.08575 14.553 3.33337C14.553 3.58099 14.5042 3.82619 14.4094 4.05497C14.3147 4.28374 14.1758 4.49161 14.0007 4.66671L5.00065 13.6667L1.33398 14.6667L2.33398 11L11.334 2.00004Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )
        }
        userEmail={userEmail}
        actions={
          <Button variant="secondary" onClick={handleBack}>
            ← Back
          </Button>
        }
      />

      <main className="corpusView__body">
        {/* Corpus Column (Knowledge Facts) */}
        <div className="corpusView__knowledgeColumn">
          <div className="corpusView__regionHeader">Knowledge Base</div>
          <div className="corpusView__knowledgeColumnInner">
            <div className="corpusView__knowledgeColumnContent">
              {knowledgeFacts.length === 0 ? (
                <div className="corpusView__emptyState">
                  <p>No knowledge facts yet</p>
                </div>
              ) : (
                <div className="corpusView__factsList">
                  {knowledgeFacts.map((fact) => (
                    <FactCard
                      key={fact.id}
                      fact={fact}
                      onUpdate={handleUpdateFact}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="corpusView__knowledgeColumnActions">
              <Button
                className="corpusView__addFactButton"
                onClick={handleAddKnowledgeFact}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Global Facts Region */}
        <div className="corpusView__globalFactsRegion">
          <div className="corpusView__regionHeader">Global Facts</div>
          <div className="corpusView__globalFactsRegionInner">
            <div className="corpusView__globalFactsRegionContent">
              {globalFacts.length === 0 ? (
                <div className="corpusView__emptyState">
                  <p>No global facts yet</p>
                </div>
              ) : (
                <div className="corpusView__factGrid">
                  {globalFacts.map((fact) => (
                    <FactCard
                      key={fact.id}
                      fact={fact}
                      onUpdate={handleUpdateFact}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="corpusView__globalFactsRegionActions">
              <Button
                className="corpusView__addFactButton"
                onClick={handleAddGlobalFact}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Builder Facts Region */}
        <div className="corpusView__builderFactsRegion">
          <div className="corpusView__regionHeader">Builder Facts</div>
          <div className="corpusView__builderFactsRegionInner">
            <div className="corpusView__builderFactsRegionContent">
              {builderFacts.length === 0 ? (
                <div className="corpusView__emptyState">
                  <p>No builder facts yet</p>
                </div>
              ) : (
                <div className="corpusView__factGrid">
                  {builderFacts.map((fact) => (
                    <FactCard
                      key={fact.id}
                      fact={fact}
                      onUpdate={handleUpdateFact}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="corpusView__builderFactsRegionActions">
              <Button
                className="corpusView__addFactButton"
                onClick={handleAddBuilderFact}
              >
                +
              </Button>
            </div>
          </div>
        </div>
      </main>

      <PageFooter
        llmInput={llmInput}
        onLlmInputChange={setLlmInput}
        isListening={isListening}
        onToggleListening={toggleListening}
        llmInputRef={llmInputRef}
      />
    </div>
  );
};
