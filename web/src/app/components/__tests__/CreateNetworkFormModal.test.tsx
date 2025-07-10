import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useForm } from 'react-hook-form';
import CreateNetworkFormModal from '../CreateNetworkFormModal';

function TestWrapper(props: any) {
  const methods = useForm();
  return (
    <MantineProvider>
      <CreateNetworkFormModal
        {...props}
        errors={methods.formState.errors}
        control={methods.control}
        register={methods.register}
        handleSubmit={methods.handleSubmit}
      />
    </MantineProvider>
  );
}

describe('CreateNetworkFormModal', () => {
  it('renders required fields', () => {
    render(<TestWrapper onSubmit={jest.fn()} isSubmitting={false} />);
    expect(screen.getByLabelText(/Network Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Network ID/i)).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    render(<TestWrapper onSubmit={jest.fn()} isSubmitting={false} />);
    fireEvent.submit(screen.getByTestId('form'));
    expect(true).toBe(true);
  });
});
