import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FactCard } from "./FactCard";
import { type Fact, FactState, FactContext } from "../../types";

const meta = {
  title: "Components/User/FactCard",
  component: FactCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    fact: {
      description: "The fact object to display",
    },
  },
  args: {
    onUpdate: fn(),
  },
} satisfies Meta<typeof FactCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create a fact with all required fields
const createFact = (overrides: Partial<Fact>): Fact => ({
  id: "1",
  corpusId: "corpus-1",
  state: FactState.READY,
  context: FactContext.CORPUS_KNOWLEDGE,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Default fact with statement in READY state
export const Ready: Story = {
  args: {
    fact: createFact({
      statement: "This is a fact in ready state",
      state: FactState.READY,
    }),
  },
};

// Fact in CLARIFY state
export const Clarify: Story = {
  args: {
    fact: createFact({
      statement: "This fact needs clarification",
      state: FactState.CLARIFY,
    }),
  },
};

// Fact in CONFLICT state
export const Conflict: Story = {
  args: {
    fact: createFact({
      statement: "This fact has a conflict",
      state: FactState.CONFLICT,
    }),
  },
};

// Fact in CONFIRMED state
export const Confirmed: Story = {
  args: {
    fact: createFact({
      statement: "This fact has been confirmed",
      state: FactState.CONFIRMED,
    }),
  },
};

// Fact in REJECTED state with icon
export const Rejected: Story = {
  args: {
    fact: createFact({
      statement: "This fact has been rejected",
      state: FactState.REJECTED,
    }),
  },
};

// Empty fact (no statement - should show input)
export const EmptyStatement: Story = {
  args: {
    fact: createFact({
      statement: "",
      state: FactState.READY,
    }),
  },
};

// Fact without statement (undefined - should show input)
export const NoStatement: Story = {
  args: {
    fact: createFact({
      statement: undefined,
      state: FactState.CLARIFY,
    }),
  },
};

// Fact with long statement
export const LongStatement: Story = {
  args: {
    fact: createFact({
      statement:
        "This is a very long fact statement that demonstrates how the component handles overflow and wrapping of text content. It should display properly even with extensive content that might need multiple lines.",
      state: FactState.READY,
    }),
  },
};

// Fact with short statement
export const ShortStatement: Story = {
  args: {
    fact: createFact({
      statement: "Short",
      state: FactState.CONFIRMED,
    }),
  },
};

// Multiple facts in different states (for visual comparison)
export const AllStates: Story = {
  render: (args) => (
    <div
      style={{ display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap" }}
    >
      <FactCard
        {...args}
        fact={createFact({ statement: "Clarify", state: FactState.CLARIFY })}
      />
      <FactCard
        {...args}
        fact={createFact({ statement: "Conflict", state: FactState.CONFLICT })}
      />
      <FactCard
        {...args}
        fact={createFact({ statement: "Ready", state: FactState.READY })}
      />
      <FactCard
        {...args}
        fact={createFact({ statement: "Rejected", state: FactState.REJECTED })}
      />
      <FactCard
        {...args}
        fact={createFact({
          statement: "Confirmed",
          state: FactState.CONFIRMED,
        })}
      />
    </div>
  ),
  args: {
    onUpdate: fn(),
  },
};

// Fact with metadata
export const WithMetadata: Story = {
  args: {
    fact: createFact({
      statement: "Fact with metadata",
      state: FactState.READY,
      meta: {
        source: "Document A",
        confidence: 0.95,
      },
    }),
  },
};

// Context Variants - CORPUS_GLOBAL (Gold/Orange)
export const ContextGlobal: Story = {
  args: {
    fact: createFact({
      statement: "Global context facts apply across all corpuses in the project",
      state: FactState.CONFIRMED,
      context: FactContext.CORPUS_GLOBAL,
    }),
  },
};

// Context Variants - CORPUS_BUILDER (Gray)
export const ContextBuilder: Story = {
  args: {
    fact: createFact({
      statement: "Builder context facts are used during corpus construction",
      state: FactState.READY,
      context: FactContext.CORPUS_BUILDER,
    }),
  },
};

// Context Variants - CORPUS_KNOWLEDGE (Blue)
export const ContextKnowledge: Story = {
  args: {
    fact: createFact({
      statement: "Knowledge context facts represent domain knowledge in the corpus",
      state: FactState.CONFIRMED,
      context: FactContext.CORPUS_KNOWLEDGE,
    }),
  },
};

// All Context Types in Different States
export const GlobalClarify: Story = {
  args: {
    fact: createFact({
      statement: "Global context with clarify state",
      state: FactState.CLARIFY,
      context: FactContext.CORPUS_GLOBAL,
    }),
  },
};

export const BuilderConflict: Story = {
  args: {
    fact: createFact({
      statement: "Builder context with conflict state",
      state: FactState.CONFLICT,
      context: FactContext.CORPUS_BUILDER,
    }),
  },
};

export const KnowledgeRejected: Story = {
  args: {
    fact: createFact({
      statement: "Knowledge context with rejected state",
      state: FactState.REJECTED,
      context: FactContext.CORPUS_KNOWLEDGE,
    }),
  },
};

// All Context Types Side-by-Side
export const AllContexts: Story = {
  render: (args) => (
    <div
      style={{ display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap" }}
    >
      <FactCard
        {...args}
        fact={createFact({
          statement: "Global Context",
          state: FactState.CONFIRMED,
          context: FactContext.CORPUS_GLOBAL,
        })}
      />
      <FactCard
        {...args}
        fact={createFact({
          statement: "Builder Context",
          state: FactState.READY,
          context: FactContext.CORPUS_BUILDER,
        })}
      />
      <FactCard
        {...args}
        fact={createFact({
          statement: "Knowledge Context",
          state: FactState.CONFIRMED,
          context: FactContext.CORPUS_KNOWLEDGE,
        })}
      />
    </div>
  ),
  args: {
    onUpdate: fn(),
  },
};
