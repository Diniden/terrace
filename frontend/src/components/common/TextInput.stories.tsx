import type { Meta, StoryObj } from '@storybook/react';
import { TextInput } from './TextInput';

const meta: Meta<typeof TextInput> = {
  title: 'Common/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Username',
    value: 'john.doe',
    type: 'text',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Field',
    type: 'text',
    value: 'Cannot edit this',
    disabled: true,
  },
};

export const NoLabel: Story = {
  args: {
    placeholder: 'Search...',
    type: 'text',
  },
};

export const Required: Story = {
  args: {
    label: 'Required Field',
    type: 'text',
    required: true,
    placeholder: 'This field is required',
  },
};
