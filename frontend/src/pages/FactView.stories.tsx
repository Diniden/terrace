import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { FactView } from './FactView';
import { AuthProvider } from '../context/AuthContext';
import type { Fact } from '../types';
import { FactState, FactContext } from '../types';

// Mock the API module
const mockFactsApi = {
  getOne: async (_id: string): Promise<Fact> => {
    // Return mock data based on the story
    return {
      id: '1',
      statement: 'This is the main fact being viewed',
      corpusId: 'corpus-1',
      corpus: {
        id: 'corpus-1',
        name: 'Test Corpus',
        projectId: 'project-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      state: FactState.READY,
      context: FactContext.CORPUS_KNOWLEDGE,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
  },
  getOneWithRelationships: async (_id: string): Promise<Fact> => {
    // Return mock data for fact with relationships
    return {
      id: '1',
      statement: 'This is a fact without a basis',
      corpusId: 'corpus-2',
      corpus: {
        id: 'corpus-2',
        name: 'Child Corpus',
        projectId: 'project-1',
        basisCorpusId: 'corpus-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      state: FactState.READY,
      context: FactContext.CORPUS_KNOWLEDGE,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
  },
  getAll: async (_corpusId?: string): Promise<{ data: Fact[] }> => {
    // Return mock parent corpus facts for basis selection
    return {
      data: [
        {
          id: 'parent-fact-1',
          statement: 'This is a parent fact that can be selected as a basis',
          corpusId: 'corpus-1',
          state: FactState.CONFIRMED,
          context: FactContext.CORPUS_KNOWLEDGE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'parent-fact-2',
          statement: 'Another parent fact available for selection',
          corpusId: 'corpus-1',
          state: FactState.READY,
          context: FactContext.CORPUS_KNOWLEDGE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'parent-fact-3',
          statement: 'A third parent fact to demonstrate scrolling',
          corpusId: 'corpus-1',
          state: FactState.CLARIFY,
          context: FactContext.CORPUS_KNOWLEDGE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    };
  },
  update: async (id: string, data: any): Promise<Fact> => {
    return {
      id,
      statement: data.statement || 'Updated fact',
      corpusId: 'corpus-1',
      basisId: data.basisId,
      state: data.state || FactState.READY,
      context: FactContext.CORPUS_KNOWLEDGE,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
  },
  create: async (data: any): Promise<Fact> => {
    return {
      id: 'new-fact-id',
      statement: data.statement || '',
      corpusId: data.corpusId,
      state: data.state || FactState.CLARIFY,
      context: data.context,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
  },
  linkFacts: async (factId: string, _linkedFactId: string): Promise<Fact> => {
    return {
      id: factId,
      statement: 'Main fact',
      corpusId: 'corpus-1',
      state: FactState.READY,
      context: FactContext.CORPUS_KNOWLEDGE,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
  },
};

// Mock corpusesApi
const mockCorpusesApi = {
  getAll: async (_projectId: string) => {
    return {
      data: [
        {
          id: 'corpus-1',
          name: 'Parent Corpus',
          projectId: 'project-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'corpus-2',
          name: 'Child Corpus',
          projectId: 'project-1',
          basisCorpusId: 'corpus-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    };
  },
};

// Mock the modules
jest.mock('../api/facts', () => ({
  factsApi: mockFactsApi,
}));

jest.mock('../api/corpuses', () => ({
  corpusesApi: mockCorpusesApi,
}));

const meta = {
  title: 'Pages/FactView',
  component: FactView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <BrowserRouter>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </BrowserRouter>
    ),
  ],
} satisfies Meta<typeof FactView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Story: Fact with no relationships (empty states)
export const NoRelationships: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays a fact with no basis, supporting facts, or derived facts.',
      },
    },
  },
};

// Story: Fact with only basis
export const WithBasisOnly: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays a fact that has a basis fact but no supporting or derived facts.',
      },
    },
  },
};

// Story: Fact with only linked facts
export const WithLinkedFactsOnly: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays a fact with linked facts but no basis or derived facts.',
      },
    },
  },
};

// Story: Fact with only derived facts
export const WithDerivedFactsOnly: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays a fact with derived facts but no basis or supporting facts.',
      },
    },
  },
};

// Story: Fact with all relationship types
export const AllRelationships: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays a fact with basis, linked facts, and derived facts.',
      },
    },
  },
};

// Story: Loading state
export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays the loading spinner while fetching fact data.',
      },
    },
  },
};

// Story: Fact without basis (showing "+ Set basis" button)
export const NoBasisWithParent: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Displays a fact without a basis. Shows the "+ Set basis" button that allows selecting a basis from the parent corpus.',
      },
    },
  },
};
