import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CorpusView } from './CorpusView';
import { AuthProvider } from '../context/AuthContext';
import type { Corpus, Fact } from '../types';
import { FactContext, FactState } from '../types';

// Mock API calls
const mockCorpus: Corpus = {
  id: '1',
  name: 'Main Corpus',
  description: 'Primary corpus for the project',
  projectId: 'project-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockKnowledgeFacts: Fact[] = [
  {
    id: 'fact-k1',
    statement: 'Knowledge Fact 1',
    corpusId: '1',
    state: FactState.CONFIRMED,
    context: FactContext.CORPUS_KNOWLEDGE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fact-k2',
    statement: 'Knowledge Fact 2',
    corpusId: '1',
    state: FactState.READY,
    context: FactContext.CORPUS_KNOWLEDGE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockGlobalFacts: Fact[] = [
  {
    id: 'fact-g1',
    statement: 'Global Fact 1 - System Configuration',
    corpusId: '1',
    state: FactState.CONFIRMED,
    context: FactContext.CORPUS_GLOBAL,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fact-g2',
    statement: 'Global Fact 2 - API Endpoints',
    corpusId: '1',
    state: FactState.READY,
    context: FactContext.CORPUS_GLOBAL,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fact-g3',
    statement: 'Global Fact 3 - Authentication',
    corpusId: '1',
    state: FactState.CLARIFY,
    context: FactContext.CORPUS_GLOBAL,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockBuilderFacts: Fact[] = [
  {
    id: 'fact-b1',
    statement: 'Builder Fact 1 - Build Process',
    corpusId: '1',
    state: FactState.CONFIRMED,
    context: FactContext.CORPUS_BUILDER,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fact-b2',
    statement: 'Builder Fact 2 - Dependencies',
    corpusId: '1',
    state: FactState.READY,
    context: FactContext.CORPUS_BUILDER,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fact-b3',
    statement: 'Builder Fact 3 - Environment Variables',
    corpusId: '1',
    state: FactState.CONFLICT,
    context: FactContext.CORPUS_BUILDER,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fact-b4',
    statement: 'Builder Fact 4 - Testing Strategy',
    corpusId: '1',
    state: FactState.CLARIFY,
    context: FactContext.CORPUS_BUILDER,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// Story decorator with routing
const withRouter = (Story: any) => (
  <MemoryRouter initialEntries={['/corpus/1']}>
    <AuthProvider>
      <Routes>
        <Route path="/corpus/:corpusId" element={<Story />} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>
);

const meta = {
  title: 'Pages/CorpusView',
  component: CorpusView,
  decorators: [withRouter],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CorpusView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock API responses
const mockApiSuccess = () => {
  // Mock corpusesApi.getOne
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/corpuses/1')) {
      return Promise.resolve({
        ok: true,
        json: async () => mockCorpus,
      } as Response);
    }
    if (url.includes('/facts?corpusId=1')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [...mockKnowledgeFacts, ...mockGlobalFacts, ...mockBuilderFacts],
          total: 9,
          page: 1,
          limit: 1000,
        }),
      } as Response);
    }
    return Promise.reject(new Error('Not found'));
  }) as jest.Mock;
};

// Default story with all fact types
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default corpus view showing all three regions: Knowledge Base (left), Global Facts (middle), and Builder Facts (right).',
      },
    },
  },
  beforeEach: () => {
    mockApiSuccess();
  },
};

// Empty state - no facts
export const EmptyState: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view with no facts in any region, showing empty state messages.',
      },
    },
  },
  beforeEach: () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/corpuses/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCorpus,
        } as Response);
      }
      if (url.includes('/facts?corpusId=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [],
            total: 0,
            page: 1,
            limit: 1000,
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;
  },
};

// Only knowledge facts
export const OnlyKnowledgeFacts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view with only knowledge base facts, showing empty states for global and builder regions.',
      },
    },
  },
  beforeEach: () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/corpuses/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCorpus,
        } as Response);
      }
      if (url.includes('/facts?corpusId=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: mockKnowledgeFacts,
            total: mockKnowledgeFacts.length,
            page: 1,
            limit: 1000,
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;
  },
};

// Only global facts
export const OnlyGlobalFacts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view with only global facts, showing empty states for knowledge base and builder regions.',
      },
    },
  },
  beforeEach: () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/corpuses/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCorpus,
        } as Response);
      }
      if (url.includes('/facts?corpusId=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: mockGlobalFacts,
            total: mockGlobalFacts.length,
            page: 1,
            limit: 1000,
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;
  },
};

// Only builder facts
export const OnlyBuilderFacts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view with only builder facts, showing empty states for knowledge base and global regions.',
      },
    },
  },
  beforeEach: () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/corpuses/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCorpus,
        } as Response);
      }
      if (url.includes('/facts?corpusId=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: mockBuilderFacts,
            total: mockBuilderFacts.length,
            page: 1,
            limit: 1000,
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;
  },
};

// Loading state
export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view in loading state while fetching data.',
      },
    },
  },
  beforeEach: () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
  },
};

// Error state
export const ErrorState: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view when the corpus cannot be found or loaded.',
      },
    },
  },
  beforeEach: () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Corpus not found' }),
      } as Response)
    ) as jest.Mock;
  },
};

// Long corpus name
export const LongCorpusName: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view with a very long corpus name to test text wrapping and layout.',
      },
    },
  },
  beforeEach: () => {
    const longCorpus = {
      ...mockCorpus,
      name: 'This is a Very Long Corpus Name That Should Demonstrate How the UI Handles Extended Text',
    };
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/corpuses/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => longCorpus,
        } as Response);
      }
      if (url.includes('/facts?corpusId=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [...mockKnowledgeFacts, ...mockGlobalFacts, ...mockBuilderFacts],
            total: 9,
            page: 1,
            limit: 1000,
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;
  },
};

// Many facts
export const ManyFacts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Corpus view with many facts in each region to test scrolling and layout with extensive content.',
      },
    },
  },
  beforeEach: () => {
    const manyKnowledge = Array.from({ length: 10 }, (_, i) => ({
      ...mockKnowledgeFacts[0],
      id: `fact-k${i}`,
      statement: `Knowledge Fact ${i + 1} - ${i % 2 === 0 ? 'Short' : 'This is a longer fact statement that demonstrates how the card handles more extensive text content'}`,
    }));

    const manyGlobal = Array.from({ length: 15 }, (_, i) => ({
      ...mockGlobalFacts[0],
      id: `fact-g${i}`,
      statement: `Global Fact ${i + 1} - Testing ${i}`,
      state: [FactState.CLARIFY, FactState.READY, FactState.CONFIRMED, FactState.CONFLICT][i % 4],
    }));

    const manyBuilder = Array.from({ length: 20 }, (_, i) => ({
      ...mockBuilderFacts[0],
      id: `fact-b${i}`,
      statement: `Builder Fact ${i + 1}`,
      state: [FactState.CLARIFY, FactState.READY, FactState.CONFIRMED][i % 3],
    }));

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/corpuses/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCorpus,
        } as Response);
      }
      if (url.includes('/facts?corpusId=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [...manyKnowledge, ...manyGlobal, ...manyBuilder],
            total: 45,
            page: 1,
            limit: 1000,
          }),
        } as Response);
      }
      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;
  },
};
