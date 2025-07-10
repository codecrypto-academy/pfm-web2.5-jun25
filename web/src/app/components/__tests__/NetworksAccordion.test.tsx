import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetworksAccordion from '../NetworksAccordion';

const queryClient = new QueryClient();

describe('NetworksAccordion', () => {
  it('shows loader when loading', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <NetworksAccordion data={{ success: true, networks: [] }} error={null} isLoading={true} />
        </MantineProvider>
      </QueryClientProvider>
    );
    // Loader does not have a role, so check by class or test id
    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('shows error alert when error', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <NetworksAccordion data={{ success: true, networks: [] }} error={{ message: 'fail' }} isLoading={false} />
        </MantineProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText(/Error loading networks/i)).toBeInTheDocument();
  });

  it('shows API error alert when data is invalid', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <NetworksAccordion data={{ success: false, networks: [] }} error={null} isLoading={false} />
        </MantineProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText(/API Error/i)).toBeInTheDocument();
  });

  it('renders network accordions', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <NetworksAccordion
            data={{ success: true, networks: [{ networkId: 'net1', chainId: 1, subnet: '', gateway: '', nodesCount: 2, createdAt: '', updatedAt: '' }] }}
            error={null}
            isLoading={false}
          />
        </MantineProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText('net1')).toBeInTheDocument();
    expect(screen.getByText(/2 nodes/)).toBeInTheDocument();
  });
});
