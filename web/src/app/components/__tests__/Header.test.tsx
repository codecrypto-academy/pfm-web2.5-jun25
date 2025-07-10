import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import Header from '../Header';

describe('Header', () => {
  it('renders title and buttons', () => {
    render(
      <MantineProvider>
        <Header onAddNetwork={jest.fn()} onRefresh={jest.fn()} />
      </MantineProvider>
    );
    expect(screen.getByText('Besu Network Manager')).toBeInTheDocument();
    expect(screen.getByText('Add Network')).toBeInTheDocument();
    expect(screen.getByText('Refresh Networks')).toBeInTheDocument();
  });

  it('calls onAddNetwork when Add Network is clicked', () => {
    const onAddNetwork = jest.fn();
    render(
      <MantineProvider>
        <Header onAddNetwork={onAddNetwork} onRefresh={jest.fn()} />
      </MantineProvider>
    );
    fireEvent.click(screen.getByText('Add Network'));
    expect(onAddNetwork).toHaveBeenCalled();
  });

  it('calls onRefresh when Refresh Networks is clicked', () => {
    const onRefresh = jest.fn();
    render(
      <MantineProvider>
        <Header onAddNetwork={jest.fn()} onRefresh={onRefresh} />
      </MantineProvider>
    );
    fireEvent.click(screen.getByText('Refresh Networks'));
    expect(onRefresh).toHaveBeenCalled();
  });
});
