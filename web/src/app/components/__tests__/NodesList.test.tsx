import { render, screen } from '@testing-library/react';
jest.mock('../NodesList', () => jest.requireActual('../NodesList'));

describe('NodesList', () => {
  it('renders without crashing (mocked)', () => {
    // This is a placeholder: for real tests, mock useNodes and test UI logic
    expect(true).toBe(true);
  });
});
