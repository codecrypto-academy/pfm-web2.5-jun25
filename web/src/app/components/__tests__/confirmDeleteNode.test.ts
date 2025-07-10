import { confirmDeleteNode } from '../confirmDeleteNode';

jest.mock('@mantine/modals', () => ({
  modals: { openConfirmModal: jest.fn() }
}));
const { modals } = require('@mantine/modals');

describe('confirmDeleteNode', () => {
  it('calls modals.openConfirmModal with correct arguments', () => {
    const onConfirm = jest.fn();
    confirmDeleteNode({ nodeId: 'node-1', onConfirm });
    expect(modals.openConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Node',
        onConfirm,
        children: expect.anything(),
        labels: expect.any(Object),
      })
    );
  });
});
