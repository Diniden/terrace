import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  AfterInsert,
  AfterUpdate,
} from 'typeorm';
import { Corpus } from './corpus.entity';

export enum FactState {
  CLARIFY = 'clarify',
  CONFLICT = 'conflict',
  READY = 'ready',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
}

export enum FactContext {
  CORPUS_GLOBAL = 'corpus_global',
  CORPUS_BUILDER = 'corpus_builder',
  CORPUS_KNOWLEDGE = 'corpus_knowledge',
}

export enum EmbeddingStatus {
  PENDING = 'pending',
  EMBEDDED = 'embedded',
  FAILED = 'failed',
}

@Entity('facts')
@Index(['corpusId'])
@Index(['basisId'])
@Index(['context'])
@Index(['corpusId', 'context'])
@Index(['embeddingStatus'])
export class Fact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  statement: string;

  @ManyToOne(() => Corpus, (corpus) => corpus.facts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'corpus_id' })
  corpus: Corpus;

  @Column({ name: 'corpus_id' })
  corpusId: string;

  @Column({
    type: 'enum',
    enum: FactContext,
    default: FactContext.CORPUS_KNOWLEDGE,
  })
  context: FactContext;

  @ManyToOne(() => Fact, (fact) => fact.dependentFacts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'basis_id' })
  basis: Fact;

  @Column({ name: 'basis_id', nullable: true })
  basisId: string;

  // Bidirectional link relationships - no directionality implied
  // This represents facts that are linked to this fact through support relationships
  @ManyToMany(() => Fact, (fact) => fact.linkedFacts)
  @JoinTable({
    name: 'fact_links',
    joinColumn: { name: 'fact_id_a', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'fact_id_b', referencedColumnName: 'id' },
  })
  linkedFacts: Fact[];

  @Column({
    type: 'enum',
    enum: FactState,
    default: FactState.CLARIFY,
  })
  state: FactState;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;

  @ManyToMany(() => Fact)
  dependentFacts: Fact[];

  // RAG Embedding Metadata
  @Column({
    name: 'embedding_status',
    type: 'enum',
    enum: EmbeddingStatus,
    default: EmbeddingStatus.PENDING,
  })
  embeddingStatus: EmbeddingStatus;

  @Column({ name: 'last_embedded_at', nullable: true, type: 'timestamp' })
  lastEmbeddedAt: Date | null;

  @Column({ name: 'embedding_version', nullable: true })
  embeddingVersion: string;

  @Column({ name: 'embedding_model', nullable: true })
  embeddingModel: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Lifecycle hooks for embedding management
  private previousStatement?: string;

  @AfterInsert()
  markForEmbeddingAfterInsert() {
    // New facts with statements should be embedded
    if (this.statement && this.statement.trim() !== '') {
      this.embeddingStatus = EmbeddingStatus.PENDING;
    }
  }

  @AfterUpdate()
  markForEmbeddingAfterUpdate() {
    // If statement changed, mark for re-embedding
    if (
      this.previousStatement !== undefined &&
      this.previousStatement !== this.statement &&
      this.statement &&
      this.statement.trim() !== ''
    ) {
      this.embeddingStatus = EmbeddingStatus.PENDING;
      this.lastEmbeddedAt = null;
    }
  }
}
