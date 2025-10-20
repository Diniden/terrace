import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Components/Common/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
      description: 'Visual style variant of the button',
    },
    type: {
      control: 'select',
      options: ['button', 'submit'],
      description: 'HTML button type attribute',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default primary button
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

// Secondary variant
export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

// Danger variant for destructive actions
export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

// Disabled primary button
export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    variant: 'primary',
    disabled: true,
  },
};

// Disabled secondary button
export const DisabledSecondary: Story = {
  args: {
    children: 'Disabled Button',
    variant: 'secondary',
    disabled: true,
  },
};

// Disabled danger button
export const DisabledDanger: Story = {
  args: {
    children: 'Disabled Delete',
    variant: 'danger',
    disabled: true,
  },
};

// Submit button type
export const SubmitType: Story = {
  args: {
    children: 'Submit Form',
    variant: 'primary',
    type: 'submit',
  },
};

// Button with long text
export const LongText: Story = {
  args: {
    children: 'This is a button with very long text content',
    variant: 'primary',
  },
};

// Button with short text
export const ShortText: Story = {
  args: {
    children: 'OK',
    variant: 'primary',
  },
};

// Button with icon (using text emoji as example)
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <span style={{ marginRight: 'var(--spacing-xs)' }}>+</span>
        Add Item
      </>
    ),
    variant: 'primary',
  },
};

// All variants side by side
export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="danger">
        Danger
      </Button>
    </div>
  ),
  args: {
    onClick: fn(),
  },
};

// Button group example
export const ButtonGroup: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
      <Button {...args} variant="secondary">
        Cancel
      </Button>
      <Button {...args} variant="primary">
        Save
      </Button>
    </div>
  ),
  args: {
    onClick: fn(),
  },
};

// Button with custom className
export const CustomClassName: Story = {
  args: {
    children: 'Custom Styled Button',
    variant: 'primary',
    className: 'custom-button-class',
  },
};
