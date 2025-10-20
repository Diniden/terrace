import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Fact } from './fact.entity';

@Entity('corpuses')
@Index(['projectId'])
export class Corpus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Project, (project) => project.corpuses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Corpus, (corpus) => corpus.dependentCorpuses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'basis_corpus_id' })
  basisCorpus: Corpus;

  @Column({ name: 'basis_corpus_id', nullable: true })
  basisCorpusId: string;

  @OneToMany(() => Corpus, (corpus) => corpus.basisCorpus)
  dependentCorpuses: Corpus[];

  @OneToMany(() => Fact, (fact) => fact.corpus)
  facts: Fact[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
