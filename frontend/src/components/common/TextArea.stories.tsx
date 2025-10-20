import type { Meta, StoryObj } from '@storybook/react';
import { TextArea } from './TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'Common/TextArea',
  component: TextArea,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    rows: {
      control: 'number',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter a description...',
    rows: 4,
  },
};

export const WithValue: Story = {
  args: {
    label: 'Project Description',
    value: 'This is a sample project description that spans multiple lines.\n\nIt can include paragraphs and other content.',
    rows: 4,
  },
};

export const WithError: Story = {
  args: {
    label: 'Description',
    value: 'Too short',
    error: 'Description must be at least 10 characters',
    rows: 3,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Field',
    value: 'This field cannot be edited',
    disabled: true,
    rows: 3,
  },
};

export const NoLabel: Story = {
  args: {
    placeholder: 'Enter notes...',
    rows: 3,
  },
};

export const Required: Story = {
  args: {
    label: 'Required Field',
    required: true,
    placeholder: 'This field is required',
    rows: 3,
  },
};

export const LargeTextArea: Story = {
  args: {
    label: 'Long Content',
    placeholder: 'Enter a long description...',
    rows: 8,
  },
};
