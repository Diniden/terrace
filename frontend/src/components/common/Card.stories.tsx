import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Card } from './Card';

const meta = {
  title: 'Components/Common/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'text',
      description: 'Custom width for the card (e.g., "300px", "100%")',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default card with simple content
export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ marginBottom: '8px' }}>Card Title</h3>
        <p>This is a basic card with some content inside.</p>
      </div>
    ),
  },
};

// Card with custom width
export const CustomWidth: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ marginBottom: '8px' }}>Wide Card</h3>
        <p>This card has a custom width of 400px.</p>
      </div>
    ),
    width: '400px',
  },
};

// Clickable card
export const Clickable: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ marginBottom: '8px' }}>Clickable Card</h3>
        <p>Click this card to trigger an action.</p>
      </div>
    ),
    onClick: fn(),
  },
};

// Card with rich content
export const RichContent: Story = {
  args: {
    children: (
      <div>
        <h2 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>
          Product Title
        </h2>
        <p style={{ marginBottom: '16px', color: 'var(--color-grey-600)' }}>
          This is a card with more complex content including multiple elements.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '8px 16px' }}>Action 1</button>
          <button style={{ padding: '8px 16px' }}>Action 2</button>
        </div>
      </div>
    ),
    width: '350px',
  },
};

// Card with long content
export const LongContent: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ marginBottom: '8px' }}>Card with Long Content</h3>
        <p>
          This card demonstrates how the component handles longer text content. Lorem ipsum dolor
          sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
          dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
          nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
    ),
    width: '350px',
  },
};

// Card with minimal content
export const MinimalContent: Story = {
  args: {
    children: <p>Minimal</p>,
  },
};

// Card with custom styling
export const CustomStyling: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ marginBottom: '8px' }}>Custom Styled Card</h3>
        <p>This card has additional custom classes applied.</p>
      </div>
    ),
    className: 'custom-card-class',
  },
};
