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
} from 'typeorm';
import { Corpus } from './corpus.entity';

export enum FactState {
  CLARIFY = 'clarify',
  CONFLICT = 'conflict',
  READY = 'ready',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
}

@Entity('facts')
@Index(['corpusId'])
@Index(['basisId'])
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

  @ManyToOne(() => Fact, (fact) => fact.dependentFacts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'basis_id' })
  basis: Fact;

  @Column({ name: 'basis_id', nullable: true })
  basisId: string;

  @ManyToMany(() => Fact, (fact) => fact.supportedBy)
  @JoinTable({
    name: 'fact_support',
    joinColumn: { name: 'fact_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'support_id', referencedColumnName: 'id' },
  })
  supports: Fact[];

  @ManyToMany(() => Fact, (fact) => fact.supports)
  supportedBy: Fact[];

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
