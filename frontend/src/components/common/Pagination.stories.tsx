import type { Meta, StoryObj } from "@storybook/react";
import { useRef, useEffect } from "react";
import { Pagination } from "./Pagination";

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to simulate corpus elements
const PaginationDemo = ({ corpusCount }: { corpusCount: number }) => {
  const corpusRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const corpusIds = Array.from({ length: corpusCount }, (_, i) => `corpus-${i}`);

  useEffect(() => {
    // Initialize refs
    corpusIds.forEach((id) => {
      if (!corpusRefs.current[id]) {
        corpusRefs.current[id] = null;
      }
    });
  }, [corpusIds]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f5f5f5",
      }}
    >
      {/* Scrollable content area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          gap: "8px",
          padding: "16px",
        }}
      >
        {corpusIds.map((id, index) => (
          <div
            key={id}
            ref={(el) => {
              corpusRefs.current[id] = el;
            }}
            data-corpus-id={id}
            style={{
              minWidth: "300px",
              height: "100%",
              background: "white",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "600",
              color: "#616161",
            }}
          >
            Corpus {index + 1}
          </div>
        ))}
      </div>

      {/* Pagination component */}
      <Pagination corpusIds={corpusIds} corpusRefs={corpusRefs.current} />
    </div>
  );
};

// Default story with 3 corpuses
export const Default: Story = {
  args: {
    corpusIds: [],
    corpusRefs: {},
  },
  render: () => <PaginationDemo corpusCount={3} />,
};

// Story with many corpuses
export const ManyCorpuses: Story = {
  args: {
    corpusIds: [],
    corpusRefs: {},
  },
  render: () => <PaginationDemo corpusCount={8} />,
};

// Story with single corpus
export const SingleCorpus: Story = {
  args: {
    corpusIds: [],
    corpusRefs: {},
  },
  render: () => <PaginationDemo corpusCount={1} />,
};

// Story with two corpuses
export const TwoCorpuses: Story = {
  args: {
    corpusIds: [],
    corpusRefs: {},
  },
  render: () => <PaginationDemo corpusCount={2} />,
};
