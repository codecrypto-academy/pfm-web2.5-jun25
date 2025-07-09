import { modals } from '@mantine/modals';

export function confirmDeleteNode({ nodeId, onConfirm }: { nodeId: string, onConfirm: () => void }) {
  modals.openConfirmModal({
    title: 'Delete Node',
    centered: true,
    children: (
      <div>Are you sure you want to delete the node <b>{nodeId}</b>? This action cannot be undone.</div>
    ),
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm,
  });
}
