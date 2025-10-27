import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { factsApi } from '../api/facts';
import { corpusesApi } from '../api/corpuses';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/common/PageHeader';
import { PageFooter } from '../components/common/PageFooter';
import { FactCard } from '../components/user/FactCard';
import type { Fact, FactState, Corpus } from '../types';
import { FactState as FactStateEnum } from '../types';
import './FactView.css';

export const FactView: React.FC = () => {
  const { corpusId, factId } = useParams<{ corpusId: string; factId: string }>();
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  const [fact, setFact] = useState<Fact | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCorpuses, setAllCorpuses] = useState<Corpus[]>([]);
  const [newlyCreatedFactId, setNewlyCreatedFactId] = useState<string | null>(null);
  const basisColumnContentRef = useRef<HTMLDivElement>(null);
  const factCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isSelectingBasis, setIsSelectingBasis] = useState(false);
  const [parentCorpusFacts, setParentCorpusFacts] = useState<Fact[]>([]);
  const [disableTransitions, setDisableTransitions] = useState(true);

  useEffect(() => {
    if (factId) {
      loadFactData();
    }
  }, [factId]);

  // Focus the newly created fact's input field after it's rendered
  useEffect(() => {
    if (newlyCreatedFactId && !loading) {
      // Wait for next tick to ensure DOM is updated (reduced from 100ms to 50ms)
      setTimeout(() => {
        const factCardElement = factCardRefs.current.get(newlyCreatedFactId);
        if (factCardElement) {
          // Find the textarea input within the fact card
          const textareaInput = factCardElement.querySelector('textarea');
          if (textareaInput) {
            textareaInput.focus();
            // Scroll the new fact into view instantly (changed from 'smooth' to 'auto')
            factCardElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
        }
        // Clear the newly created fact ID after focusing
        setNewlyCreatedFactId(null);
      }, 50);
    }
  }, [newlyCreatedFactId, loading]);

  const loadFactData = async () => {
    if (!factId) return;

    setLoading(true);
    // Disable transitions during initial data load
    setDisableTransitions(true);

    try {
      // Use getOneWithRelationships to load the complete basis chain
      const factData = await factsApi.getOneWithRelationships(factId);
      console.log('Loaded fact data:', factData);
      console.log('Basis chain length:', factData.basisChain?.length || 0);
      setFact(factData);

      // Load all corpuses from the project to determine hierarchy
      if (factData.corpus?.projectId) {
        const corpusesResponse = await corpusesApi.getAll(factData.corpus.projectId);
        setAllCorpuses(corpusesResponse.data);
      }
    } catch (err) {
      console.error('Failed to load fact data:', err);
      // Redirect to corpus view if fact not found
      if (corpusId) {
        navigate(`/corpus/${corpusId}`, { replace: true });
      } else {
        navigate('/projects', { replace: true });
      }
    } finally {
      setLoading(false);

      // Re-enable transitions after view has settled (reduced from typical 300ms to 100ms)
      setTimeout(() => {
        setDisableTransitions(false);
      }, 100);
    }
  };

  const handleUpdateFact = async (
    id: string,
    data: { statement?: string; state?: FactState }
  ) => {
    // Update the fact via API and get the updated fact in response
    const updatedFact = await factsApi.update(id, data);

    // Update local state with the response data
    if (id === fact?.id) {
      setFact(updatedFact);
    } else {
      // If updating related facts, reload to get fresh relationships
      await loadFactData();
    }
  };

  const handleAddLinkedFact = async () => {
    if (!corpusId || !fact) return;
    try {
      const newFact = await factsApi.create({
        corpusId,
        context: fact.context,
        state: FactStateEnum.CLARIFY,
      });

      // Establish link relationship: newFact is linked to the current fact (bidirectional)
      await factsApi.linkFacts(newFact.id, fact.id);

      // Store the newly created fact ID to focus it after reload
      setNewlyCreatedFactId(newFact.id);

      // Reload fact data to get updated relationships
      await loadFactData();
    } catch (err) {
      console.error('Failed to create linked fact:', err);
    }
  };

  const handleAddDerivedFact = async () => {
    if (!fact) return;

    // Find the child corpus (derived facts must be in a child corpus)
    const childCorpus = allCorpuses.find(c => c.basisCorpusId === fact.corpusId);

    if (!childCorpus) {
      console.error('Cannot create derived fact: no child corpus found');
      return;
    }

    try {
      // Create the new derived fact in the CHILD corpus with current fact as basis
      const newFact = await factsApi.create({
        corpusId: childCorpus.id, // Use child corpus, not current corpus
        context: fact.context,
        state: FactStateEnum.CLARIFY,
        basisId: fact.id,
      });

      // Store the newly created fact ID to focus it after reload
      setNewlyCreatedFactId(newFact.id);

      // Reload fact data to get updated relationships
      await loadFactData();
    } catch (err) {
      console.error('Failed to create derived fact:', err);
    }
  };

  const handleBackToProject = () => {
    if (fact?.corpus?.projectId) {
      navigate(`/projects/${fact.corpus.projectId}`);
    } else {
      navigate('/projects');
    }
  };

  const handleGoToCorpus = () => {
    if (corpusId) {
      navigate(`/corpus/${corpusId}`);
    } else if (fact?.corpusId) {
      navigate(`/corpus/${fact.corpusId}`);
    }
  };

  const handleOpenBasisSelection = async () => {
    if (!fact || !fact.corpus?.basisCorpusId) {
      console.error('Cannot select basis: no parent corpus found');
      return;
    }

    try {
      // Fetch all facts from the parent corpus
      const response = await factsApi.getAll(fact.corpus.basisCorpusId);
      setParentCorpusFacts(response.data);
      setIsSelectingBasis(true);
    } catch (err) {
      console.error('Failed to load parent corpus facts:', err);
    }
  };

  const handleSelectBasis = async (selectedFactId: string) => {
    if (!fact) return;

    try {
      // Update the fact with the selected basis
      await factsApi.update(fact.id, { basisId: selectedFactId });

      // Reload fact data to get updated basis chain
      await loadFactData();

      // Clear selection mode
      setIsSelectingBasis(false);
      setParentCorpusFacts([]);
    } catch (err) {
      console.error('Failed to set basis:', err);
    }
  };

  const handleCancelBasisSelection = () => {
    setIsSelectingBasis(false);
    setParentCorpusFacts([]);
  };

  if (loading) {
    return (
      <div className={`factView ${disableTransitions ? 'factView--noTransitions' : ''}`}>
        <Spinner />
      </div>
    );
  }

  if (!fact) {
    // Redirect if fact not found
    if (corpusId) {
      navigate(`/corpus/${corpusId}`, { replace: true });
    } else {
      navigate('/projects', { replace: true });
    }
    return null;
  }

  // Get all linked facts (bidirectional support relationship)
  const linkedFacts = (fact.linkedFacts || []).filter(f => f.context === fact.context);

  const derivedFacts = fact.dependentFacts?.filter(f => f.context === fact.context) || [];
  const basisChain = fact.basisChain || [];

  // Check if the selected fact's corpus has any child corpuses
  const hasChildCorpuses = allCorpuses.some(c => c.basisCorpusId === fact.corpusId);

  // Get the child corpus for derived facts display
  const childCorpus = allCorpuses.find(c => c.basisCorpusId === fact.corpusId);

  console.log('FactView render - basisChain:', basisChain);
  console.log('FactView render - fact.basisId:', fact.basisId);
  console.log('FactView render - showing basis column:', basisChain.length > 0 || fact.basisId);
  console.log('FactView render - hasChildCorpuses:', hasChildCorpuses);
  console.log('FactView render - childCorpus:', childCorpus);

  return (
    <div className={`factView ${disableTransitions ? 'factView--noTransitions' : ''}`}>
      <PageHeader
        title={`${fact.corpus?.name || 'Corpus'} - Fact`}
        userEmail={userEmail}
        actions={
          <>
            <Button variant="outline" onClick={handleBackToProject} title="Back to Project">
              ← Project
            </Button>
            <Button variant="outline" onClick={handleGoToCorpus} title="Go to Corpus">
              → Corpus
            </Button>
          </>
        }
      />

      <main className="factView__body">
        {/* Basis Chain Column (Far Left) - Always show selected fact */}
        <div className="factView__basisColumn">
          <div className="factView__basisColumnInner">
            {/* Display the currently selected fact at the top (fixed) */}
            <div className="factView__selectedFactContainer">
              <div className="factView__selectedFactLabel">Selected Fact</div>
              <FactCard
                fact={fact}
                onUpdate={handleUpdateFact}
                viewContext="fact"
              />
            </div>

            {/* Basis Chain / Basis Selection Section */}
            {!fact.basisId && !isSelectingBasis && fact.corpus?.basisCorpusId && (
              <>
                {/* Horizontal line separator */}
                <div className="factView__basisSeparator" />

                {/* Set Basis Button */}
                <div className="factView__basisChainSection">
                  <div className="factView__setBasisContainer">
                    <div className="factView__setBasisLabel">Set basis</div>
                    <Button
                      className="factView__setBasisButton"
                      onClick={handleOpenBasisSelection}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!fact.basisId && isSelectingBasis && (
              <>
                {/* Horizontal line separator */}
                <div className="factView__basisSeparator" />

                {/* Basis Selection Section */}
                <div className="factView__basisChainSection">
                  <div className="factView__regionHeader">
                    Select Basis
                    <Button
                      variant="outline"
                      onClick={handleCancelBasisSelection}
                      className="factView__cancelBasisButton"
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="factView__basisColumnContent" ref={basisColumnContentRef}>
                    {parentCorpusFacts.filter(f => f.context === 'corpus_knowledge').length === 0 ? (
                      <div className="factView__emptyState">
                        <p>No corpus_knowledge facts available in parent corpus</p>
                      </div>
                    ) : (
                      parentCorpusFacts
                        .filter((parentFact) => parentFact.context === 'corpus_knowledge')
                        .map((parentFact) => (
                          <div
                            key={parentFact.id}
                            className="factView__basisSelectableContainer"
                            onClick={() => handleSelectBasis(parentFact.id)}
                          >
                            <div className="factView__basisSelectableFactCard">
                              <div
                                className="factView__basisSelectableStateIndicator"
                                style={{
                                  backgroundColor:
                                    parentFact.state === 'clarify'
                                      ? 'var(--color-clarify)'
                                      : parentFact.state === 'conflict'
                                      ? 'var(--color-conflict)'
                                      : parentFact.state === 'ready'
                                      ? 'var(--color-ready)'
                                      : parentFact.state === 'rejected'
                                      ? 'var(--color-rejected)'
                                      : 'var(--color-confirmed)',
                                }}
                              />
                              <div className="factView__basisSelectableContent">
                                {parentFact.statement || '(No statement)'}
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </>
            )}

            {fact.basisId && (basisChain.length > 0 || fact.basisId) && (
              <>
                {/* Horizontal line separator */}
                <div className="factView__basisSeparator" />

                {/* Basis Chain Section */}
                <div className="factView__basisChainSection">
                  <div className="factView__regionHeader">Basis Chain</div>
                  {/* Display basis chain below (scrollable) - reversed to show immediate basis first */}
                  <div className="factView__basisColumnContent" ref={basisColumnContentRef}>
                    {[...basisChain].reverse().map((chainFact) => {
                      const corpusName = allCorpuses.find(c => c.id === chainFact.corpusId)?.name;
                      return (
                        <div key={chainFact.id} className="factView__basisFactContainer">
                          {corpusName && (
                            <div className="factView__basisFactCorpusLabel">
                              {corpusName}
                            </div>
                          )}
                          <FactCard
                            fact={chainFact as Fact}
                            onUpdate={handleUpdateFact}
                            viewContext="fact"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Linked Facts Region (Middle) */}
        <div className="factView__supportingFactsRegion">
          <div className="factView__regionHeader">Linked Facts</div>
          <div className="factView__supportingFactsRegionInner">
            <div className="factView__supportingFactsRegionContent">
              {linkedFacts.length === 0 ? (
                <div className="factView__emptyState">
                  <p>No linked facts yet</p>
                </div>
              ) : (
                <div className="factView__factGrid">
                  {linkedFacts.map((linkedFact) => (
                    <FactCard
                      key={linkedFact.id}
                      ref={(el) => {
                        if (el) {
                          factCardRefs.current.set(linkedFact.id, el);
                        } else {
                          factCardRefs.current.delete(linkedFact.id);
                        }
                      }}
                      fact={linkedFact}
                      onUpdate={handleUpdateFact}
                      viewContext="fact"
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="factView__supportingFactsRegionActions">
              <Button
                className="factView__addFactButton"
                onClick={handleAddLinkedFact}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Derived Facts Region (Far Right) - Only show if corpus has children */}
        {hasChildCorpuses && (
          <div className="factView__derivedFactsRegion">
            <div className="factView__regionHeader">Derived Facts</div>
            {childCorpus && (
              <div className="factView__corpusLabel">{childCorpus.name}</div>
            )}
            <div className="factView__derivedFactsRegionInner">
              <div className="factView__derivedFactsRegionContent">
                {derivedFacts.length === 0 ? (
                  <div className="factView__emptyState">
                    <p>No derived facts yet</p>
                  </div>
                ) : (
                  <div className="factView__factGrid">
                    {derivedFacts.map((derivedFact) => (
                      <FactCard
                        key={derivedFact.id}
                        ref={(el) => {
                          if (el) {
                            factCardRefs.current.set(derivedFact.id, el);
                          } else {
                            factCardRefs.current.delete(derivedFact.id);
                          }
                        }}
                        fact={derivedFact}
                        onUpdate={handleUpdateFact}
                        viewContext="fact"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="factView__derivedFactsRegionActions">
                <Button
                  className="factView__addFactButton"
                  onClick={handleAddDerivedFact}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <PageFooter
        llmInput=""
        onLlmInputChange={() => {}}
        isListening={false}
        onToggleListening={() => {}}
      />
    </div>
  );
};
