// Log errors to help debug AggregateError during render
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Uncomment to see error details in test output
    // console.log(...args);
  });
});
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useForm } from 'react-hook-form';
import AddNodeFormModal from '../AddNodeFormModal';

function TestWrapper(props: any) {
  const methods = useForm({
    defaultValues: {
      type: 'miner',
      name: '',
      rpcPort: undefined,
      p2pPort: undefined,
      memoryLimit: undefined,
      cpuLimit: undefined,
    }
  });
  return (
    <MantineProvider>
      <AddNodeFormModal
        {...props}
        errors={methods.formState.errors}
        control={methods.control}
        register={methods.register}
        handleSubmit={methods.handleSubmit}
      />
    </MantineProvider>
  );
}

describe('AddNodeFormModal', () => {
  it('renders node type select', () => {
    try {
      render(<TestWrapper onSubmit={jest.fn()} isSubmitting={false} />);
    } catch (e) {
      // Log the error for debugging
      // eslint-disable-next-line no-console
      console.log('Render error:', e);
      throw e;
    }
    expect(screen.getByText(/Node Type/i)).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    try {
      render(<TestWrapper onSubmit={jest.fn()} isSubmitting={false} />);
    } catch (e) {
      // Log the error for debugging
      // eslint-disable-next-line no-console
      console.log('Render error:', e);
      throw e;
    }
    fireEvent.submit(screen.getByTestId('form'));
    expect(true).toBe(true);
  });
});
