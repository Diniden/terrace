import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

const meta = {
  title: 'Components/Common/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the modal is visible',
    },
    title: {
      control: 'text',
      description: 'Modal title displayed in the header',
    },
  },
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default modal with simple content
export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: (
      <div>
        <p>This is a basic modal with some content inside.</p>
      </div>
    ),
  },
};

// Modal with form content
export const WithForm: Story = {
  args: {
    isOpen: true,
    title: 'Create New Item',
    children: (
      <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>
            Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Enter name..."
            style={{
              width: '100%',
              padding: 'var(--spacing-sm)',
              border: '1px solid var(--color-grey-300)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        </div>
        <div>
          <label
            htmlFor="description"
            style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Enter description..."
            style={{
              width: '100%',
              padding: 'var(--spacing-sm)',
              border: '1px solid var(--color-grey-300)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Submit</Button>
        </div>
      </form>
    ),
  },
};

// Modal with long content
export const LongContent: Story = {
  args: {
    isOpen: true,
    title: 'Terms and Conditions',
    children: (
      <div>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
          nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
          deserunt mollit anim id est laborum.
        </p>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
          laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
          architecto beatae vitae dicta sunt explicabo.
        </p>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
          consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary">Accept</Button>
        </div>
      </div>
    ),
  },
};

// Modal with minimal content
export const MinimalContent: Story = {
  args: {
    isOpen: true,
    title: 'Confirm',
    children: (
      <div>
        <p style={{ marginBottom: 'var(--spacing-lg)' }}>Are you sure?</p>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>
      </div>
    ),
  },
};

// Modal closed state
export const Closed: Story = {
  args: {
    isOpen: false,
    title: 'This Modal is Closed',
    children: <p>You should not see this content.</p>,
  },
};

// Interactive modal with state management
export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Interactive Modal">
          <div>
            <p style={{ marginBottom: 'var(--spacing-lg)' }}>
              This modal can be opened and closed by clicking the button or the close icon.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Close Modal
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  },
};

// Modal with rich content
export const RichContent: Story = {
  args: {
    isOpen: true,
    title: 'Product Details',
    children: (
      <div>
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <img
            src="https://via.placeholder.com/400x200"
            alt="Product"
            style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Premium Product</h3>
        <p style={{ color: 'var(--color-grey-600)', marginBottom: 'var(--spacing-md)' }}>
          This is a high-quality product with amazing features and benefits for all your needs.
        </p>
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <strong style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-primary)' }}>
            $99.99
          </strong>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <Button variant="primary" style={{ flex: 1 }}>
            Add to Cart
          </Button>
          <Button variant="secondary">View Details</Button>
        </div>
      </div>
    ),
  },
};
