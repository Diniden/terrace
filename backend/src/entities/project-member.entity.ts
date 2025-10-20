import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MAINTAINER = 'maintainer',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer',
}

@Entity('project_members')
@Index(['projectId', 'userId'], { unique: true })
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => User, (user) => user.projectMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    default: ProjectRole.VIEWER,
  })
  role: ProjectRole;

  @CreateDateColumn()
  createdAt: Date;
}
