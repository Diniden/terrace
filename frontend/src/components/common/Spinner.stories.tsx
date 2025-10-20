import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta = {
  title: 'Components/Common/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default spinner
export const Default: Story = {
  args: {},
};

// Spinner in a container context
export const InContainer: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ width: '300px', height: '200px', border: '1px dashed var(--color-grey-300)' }}>
        <Story />
      </div>
    ),
  ],
};

// Spinner with custom container height
export const CustomHeight: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ width: '400px', height: '400px', border: '1px dashed var(--color-grey-300)' }}>
        <Story />
      </div>
    ),
  ],
};

// Spinner in a card-like context
export const InCard: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div
        style={{
          width: '350px',
          padding: 'var(--spacing-lg)',
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Loading...</h3>
        <Story />
      </div>
    ),
  ],
};

// Spinner with minimal container
export const MinimalContainer: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ width: '100px', height: '100px' }}>
        <Story />
      </div>
    ),
  ],
};
