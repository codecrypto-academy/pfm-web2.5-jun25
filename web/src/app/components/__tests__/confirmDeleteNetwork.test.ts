import { confirmDeleteNetwork } from '../confirmDeleteNetwork';

jest.mock('@mantine/modals', () => ({
  modals: { openConfirmModal: jest.fn() }
}));
const { modals } = require('@mantine/modals');

describe('confirmDeleteNetwork', () => {
  it('calls modals.openConfirmModal with correct arguments', () => {
    const onConfirm = jest.fn();
    confirmDeleteNetwork({ networkId: 'net-1', onConfirm });
    expect(modals.openConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Network',
        onConfirm,
        children: expect.anything(),
        labels: expect.any(Object),
      })
    );
  });
});
