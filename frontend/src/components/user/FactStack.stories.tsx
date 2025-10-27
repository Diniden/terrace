import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FactStack } from './FactStack';
import type { FactStack as FactStackType } from '../../utils/factStackUtils';

const meta = {
  title: 'Components/FactStack',
  component: FactStack,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    viewContext: {
      control: 'select',
      options: ['project', 'corpus', 'fact'],
      description: 'The viewing context for the fact stack',
    },
    dependentsCount: {
      control: 'number',
      description: 'Number of dependent facts',
    },
  },
  args: {
    onUpdate: fn(),
    onNavigateToBasis: fn(),
    onNavigateToDependents: fn(),
  },
} satisfies Meta<typeof FactStack>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock stack data
const createMockStack = (linkedCount: number, statement: string): FactStackType => {
  const topFact = {
    id: '1',
    statement,
    state: 'confirmed' as const,
    context: 'corpus_knowledge' as const,
    corpusId: 'corpus-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  // Create linked facts array
  const linkedFacts = Array.from({ length: linkedCount }, (_, i) => ({
    id: `linked-${i + 1}`,
    statement: `Linked fact ${i + 1}`,
    state: 'confirmed' as const,
    context: 'corpus_knowledge' as const,
    corpusId: 'corpus-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }));

  return {
    topFact,
    linkedCount,
    facts: [topFact, ...linkedFacts],
  };
};

// Default stack with a few linked facts
export const Default: Story = {
  args: {
    stack: createMockStack(3, 'This is a standard fact with three linked facts'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Single fact (no stack)
export const SingleFact: Story = {
  args: {
    stack: createMockStack(0, 'This is a single fact with no linked facts'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Stack with single digit count
export const SingleDigitCount: Story = {
  args: {
    stack: createMockStack(5, 'Stack with single digit count (5 linked facts)'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Stack with double digit count - demonstrates pill shape
export const DoubleDigitCount: Story = {
  args: {
    stack: createMockStack(12, 'Stack with double digit count (12 linked facts) - badge should form a pill shape'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Stack with triple digit count - demonstrates pill expansion
export const TripleDigitCount: Story = {
  args: {
    stack: createMockStack(123, 'Stack with triple digit count (123 linked facts) - badge should expand to accommodate'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Long content to demonstrate background cards matching height
export const LongContent: Story = {
  args: {
    stack: createMockStack(
      7,
      'This is a very long fact statement that demonstrates how the stack behaves with more content. The background cards should match the height of the top card, not be fixed at 80px. This ensures the stacked effect looks correct regardless of content length.'
    ),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Different states
export const ClarifyState: Story = {
  args: {
    stack: createMockStack(4, 'Fact in clarify state with linked facts'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

export const ConflictState: Story = {
  args: {
    stack: {
      topFact: {
        id: '3',
        statement: 'Fact in conflict state with linked facts',
        state: 'conflict',
        context: 'corpus_knowledge',
        corpusId: 'corpus-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      linkedCount: 2,
      facts: [
        {
          id: '3',
          statement: 'Fact in conflict state with linked facts',
          state: 'conflict',
          context: 'corpus_knowledge',
          corpusId: 'corpus-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'linked-1',
          statement: 'Linked fact 1',
          state: 'confirmed',
          context: 'corpus_knowledge',
          corpusId: 'corpus-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'linked-2',
          statement: 'Linked fact 2',
          state: 'confirmed',
          context: 'corpus_knowledge',
          corpusId: 'corpus-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    },
    viewContext: 'project',
    dependentsCount: 0,
  },
};

export const RejectedState: Story = {
  args: {
    stack: createMockStack(1, 'Fact in rejected state with linked facts'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// With basis navigation
export const WithBasisButton: Story = {
  args: {
    stack: {
      topFact: {
        id: '5',
        statement: 'Fact with basis - shows basis navigation button',
        state: 'confirmed',
        context: 'corpus_knowledge',
        corpusId: 'corpus-1',
        basisId: 'basis-fact-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      linkedCount: 8,
      facts: [
        {
          id: '5',
          statement: 'Fact with basis - shows basis navigation button',
          state: 'confirmed',
          context: 'corpus_knowledge',
          corpusId: 'corpus-1',
          basisId: 'basis-fact-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `linked-${i + 1}`,
          statement: `Linked fact ${i + 1}`,
          state: 'confirmed' as const,
          context: 'corpus_knowledge' as const,
          corpusId: 'corpus-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
      ],
    },
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// With dependents
export const WithDependents: Story = {
  args: {
    stack: createMockStack(6, 'Fact with dependent facts'),
    viewContext: 'project',
    dependentsCount: 15,
  },
};

// Badge positioning test - demonstrates consistent positioning with status icon
export const BadgePositioningTest: Story = {
  args: {
    stack: createMockStack(99, 'Compare badge position (bottom-right) with status icon position (top-right) - both should have 4px padding from corners'),
    viewContext: 'project',
    dependentsCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'This story demonstrates that the stack count badge matches the size (14px) and padding (4px) of the status icon.',
      },
    },
  },
};
