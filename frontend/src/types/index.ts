// Enums
export enum ApplicationRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MAINTAINER = 'maintainer',
  CONTRIBUTOR = 'contributor',
  VIEWER = 'viewer',
}

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

// User
export interface User {
  id: string;
  email: string;
  applicationRole: ApplicationRole;
  createdAt: string;
  updatedAt: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner?: User;
  members?: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user?: User;
  role: ProjectRole;
  createdAt: string;
}

// Corpus
export interface Corpus {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  project?: Project;
  basisCorpusId?: string;
  basisCorpus?: Corpus;
  facts?: Fact[];
  createdAt: string;
  updatedAt: string;
}

// Fact
export interface Fact {
  id: string;
  statement?: string;
  corpusId: string;
  corpus?: Corpus;
  basisId?: string;
  basis?: Fact;
  basisChain?: Partial<Fact>[];  // Complete chain from root to immediate parent (ordered)
  supports?: Fact[];  // Facts this fact supports (many-to-many support relationship)
  supportedBy?: Fact[];  // Facts that support this fact (many-to-many support relationship)
  dependentFacts?: Fact[];  // Facts that have this fact as their basis (derived facts)
  state: FactState;
  context: FactContext;
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthResponse {
  accessToken: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  applicationRole: ApplicationRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Chat
export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
}
