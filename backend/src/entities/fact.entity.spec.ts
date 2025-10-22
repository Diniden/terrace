import { Fact, FactState, FactContext, EmbeddingStatus } from './fact.entity';
import { Corpus } from './corpus.entity';

describe('Fact Entity', () => {
  describe('Embedding Metadata', () => {
    it('should have default embedding status as PENDING', () => {
      const fact = new Fact();
      fact.statement = 'Test statement';
      fact.corpusId = 'test-corpus-id';
      fact.context = FactContext.CORPUS_KNOWLEDGE;

      // Default should be PENDING
      expect(fact.embeddingStatus).toBeUndefined(); // Not set until persisted
    });

    it('should allow setting embedding status', () => {
      const fact = new Fact();
      fact.statement = 'Test statement';
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;

      expect(fact.embeddingStatus).toBe(EmbeddingStatus.EMBEDDED);
    });

    it('should allow setting last_embedded_at timestamp', () => {
      const fact = new Fact();
      const now = new Date();
      fact.lastEmbeddedAt = now;

      expect(fact.lastEmbeddedAt).toEqual(now);
    });

    it('should allow setting embedding version', () => {
      const fact = new Fact();
      fact.embeddingVersion = 'text-embedding-3-small-v1';

      expect(fact.embeddingVersion).toBe('text-embedding-3-small-v1');
    });

    it('should allow setting embedding model', () => {
      const fact = new Fact();
      fact.embeddingModel = 'openai/text-embedding-3-small';

      expect(fact.embeddingModel).toBe('openai/text-embedding-3-small');
    });

    it('should allow null values for embedding metadata', () => {
      const fact = new Fact();
      fact.lastEmbeddedAt = null;
      fact.embeddingVersion = null;
      fact.embeddingModel = null;

      expect(fact.lastEmbeddedAt).toBeNull();
      expect(fact.embeddingVersion).toBeNull();
      expect(fact.embeddingModel).toBeNull();
    });
  });

  describe('AfterInsert Hook', () => {
    it('should mark fact with statement as PENDING after insert', () => {
      const fact = new Fact();
      fact.statement = 'This is a valid statement';
      fact.corpusId = 'test-corpus-id';

      fact.markForEmbeddingAfterInsert();

      expect(fact.embeddingStatus).toBe(EmbeddingStatus.PENDING);
    });

    it('should not change status for fact without statement', () => {
      const fact = new Fact();
      fact.statement = null;
      fact.corpusId = 'test-corpus-id';
      fact.embeddingStatus = EmbeddingStatus.FAILED; // Pre-set status

      fact.markForEmbeddingAfterInsert();

      // Should not be changed to PENDING
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.FAILED);
    });

    it('should not change status for fact with empty statement', () => {
      const fact = new Fact();
      fact.statement = '   '; // Whitespace only
      fact.corpusId = 'test-corpus-id';
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;

      fact.markForEmbeddingAfterInsert();

      // Should not be changed to PENDING
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.EMBEDDED);
    });
  });

  describe('AfterUpdate Hook', () => {
    it('should mark fact as PENDING when statement changes', () => {
      const fact = new Fact();
      fact.statement = 'Original statement';
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
      fact.lastEmbeddedAt = new Date();

      // Simulate previous state
      fact['previousStatement'] = 'Original statement';

      // Update statement
      fact.statement = 'Updated statement';

      fact.markForEmbeddingAfterUpdate();

      expect(fact.embeddingStatus).toBe(EmbeddingStatus.PENDING);
      expect(fact.lastEmbeddedAt).toBeNull();
    });

    it('should not change status when statement unchanged', () => {
      const fact = new Fact();
      fact.statement = 'Same statement';
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
      const originalDate = new Date();
      fact.lastEmbeddedAt = originalDate;

      // Simulate previous state
      fact['previousStatement'] = 'Same statement';

      fact.markForEmbeddingAfterUpdate();

      // Should remain EMBEDDED
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.EMBEDDED);
      expect(fact.lastEmbeddedAt).toEqual(originalDate);
    });

    it('should not change status when non-statement fields change', () => {
      const fact = new Fact();
      fact.statement = 'Statement';
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
      fact.lastEmbeddedAt = new Date();
      fact.state = FactState.READY;

      // Change state, not statement
      fact.state = FactState.CONFIRMED;

      fact.markForEmbeddingAfterUpdate();

      // Should remain EMBEDDED
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.EMBEDDED);
    });

    it('should handle empty previous statement', () => {
      const fact = new Fact();
      fact.statement = 'New statement';
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
      fact['previousStatement'] = undefined;

      fact.markForEmbeddingAfterUpdate();

      // Should not change status when previousStatement is undefined
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.EMBEDDED);
    });

    it('should clear last_embedded_at when re-embedding needed', () => {
      const fact = new Fact();
      fact.statement = 'Original';
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
      fact.lastEmbeddedAt = new Date('2024-01-01');
      fact['previousStatement'] = 'Original';

      fact.statement = 'Modified';

      fact.markForEmbeddingAfterUpdate();

      expect(fact.lastEmbeddedAt).toBeNull();
    });
  });

  describe('Enum Values', () => {
    it('should have correct EmbeddingStatus values', () => {
      expect(EmbeddingStatus.PENDING).toBe('pending');
      expect(EmbeddingStatus.EMBEDDED).toBe('embedded');
      expect(EmbeddingStatus.FAILED).toBe('failed');
    });

    it('should support all embedding status transitions', () => {
      const fact = new Fact();

      // PENDING -> EMBEDDED
      fact.embeddingStatus = EmbeddingStatus.PENDING;
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.PENDING);

      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.EMBEDDED);

      // EMBEDDED -> PENDING (re-embed)
      fact.embeddingStatus = EmbeddingStatus.PENDING;
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.PENDING);

      // PENDING -> FAILED
      fact.embeddingStatus = EmbeddingStatus.FAILED;
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.FAILED);

      // FAILED -> PENDING (retry)
      fact.embeddingStatus = EmbeddingStatus.PENDING;
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.PENDING);
    });
  });

  describe('Integration with Existing Fact Properties', () => {
    it('should work alongside existing state enum', () => {
      const fact = new Fact();
      fact.state = FactState.READY;
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;

      expect(fact.state).toBe(FactState.READY);
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.EMBEDDED);
    });

    it('should work alongside context enum', () => {
      const fact = new Fact();
      fact.context = FactContext.CORPUS_KNOWLEDGE;
      fact.embeddingStatus = EmbeddingStatus.PENDING;

      expect(fact.context).toBe(FactContext.CORPUS_KNOWLEDGE);
      expect(fact.embeddingStatus).toBe(EmbeddingStatus.PENDING);
    });

    it('should support all fact properties with embedding metadata', () => {
      const fact = new Fact();
      fact.id = 'test-id';
      fact.statement = 'Test statement';
      fact.corpusId = 'corpus-id';
      fact.context = FactContext.CORPUS_KNOWLEDGE;
      fact.state = FactState.CONFIRMED;
      fact.embeddingStatus = EmbeddingStatus.EMBEDDED;
      fact.lastEmbeddedAt = new Date();
      fact.embeddingVersion = 'v1';
      fact.embeddingModel = 'test-model';

      expect(fact).toMatchObject({
        id: 'test-id',
        statement: 'Test statement',
        corpusId: 'corpus-id',
        context: FactContext.CORPUS_KNOWLEDGE,
        state: FactState.CONFIRMED,
        embeddingStatus: EmbeddingStatus.EMBEDDED,
        embeddingVersion: 'v1',
        embeddingModel: 'test-model',
      });
      expect(fact.lastEmbeddedAt).toBeInstanceOf(Date);
    });
  });
});
