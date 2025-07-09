import { modals } from '@mantine/modals';

export function confirmDeleteNetwork({ networkId, onConfirm }: { networkId: string, onConfirm: () => void }) {
  modals.openConfirmModal({
    title: 'Delete Network',
    centered: true,
    children: (
      <div>Are you sure you want to delete the network <b>{networkId}</b>? This action cannot be undone.</div>
    ),
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm,
  });
}
