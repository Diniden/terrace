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
const createMockStack = (supportCount: number, statement: string): FactStackType => ({
  topFact: {
    id: '1',
    statement,
    state: 'confirmed',
    context: 'corpus_knowledge',
    corpusId: 'corpus-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  supportCount,
  supportingFacts: [],
});

// Default stack with a few supporting facts
export const Default: Story = {
  args: {
    stack: createMockStack(3, 'This is a standard fact with three supporting facts'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Single fact (no stack)
export const SingleFact: Story = {
  args: {
    stack: createMockStack(0, 'This is a single fact with no supporting facts'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Stack with single digit count
export const SingleDigitCount: Story = {
  args: {
    stack: createMockStack(5, 'Stack with single digit count (5 supporting facts)'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Stack with double digit count - demonstrates pill shape
export const DoubleDigitCount: Story = {
  args: {
    stack: createMockStack(12, 'Stack with double digit count (12 supporting facts) - badge should form a pill shape'),
    viewContext: 'project',
    dependentsCount: 0,
  },
};

// Stack with triple digit count - demonstrates pill expansion
export const TripleDigitCount: Story = {
  args: {
    stack: createMockStack(123, 'Stack with triple digit count (123 supporting facts) - badge should expand to accommodate'),
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
    stack: {
      topFact: {
        id: '2',
        statement: 'Fact in clarify state with supporting facts',
        state: 'clarify',
        context: 'corpus_knowledge',
        corpusId: 'corpus-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      supportCount: 4,
      supportingFacts: [],
    },
    viewContext: 'project',
    dependentsCount: 0,
  },
};

export const ConflictState: Story = {
  args: {
    stack: {
      topFact: {
        id: '3',
        statement: 'Fact in conflict state with supporting facts',
        state: 'conflict',
        context: 'corpus_knowledge',
        corpusId: 'corpus-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      supportCount: 2,
      supportingFacts: [],
    },
    viewContext: 'project',
    dependentsCount: 0,
  },
};

export const RejectedState: Story = {
  args: {
    stack: {
      topFact: {
        id: '4',
        statement: 'Fact in rejected state with supporting facts',
        state: 'rejected',
        context: 'corpus_knowledge',
        corpusId: 'corpus-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      supportCount: 1,
      supportingFacts: [],
    },
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
      supportCount: 8,
      supportingFacts: [],
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
