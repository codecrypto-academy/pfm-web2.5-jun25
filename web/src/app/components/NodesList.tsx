import React from "react";
import { Alert, Loader, Stack, Card, Group, Text, Badge, Button } from "@mantine/core";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showNotification } from "@mantine/notifications";
import { confirmDeleteNode } from "./confirmDeleteNode";

interface Node {
  id: string;
  type: string;
  ip: string;
  rpcPort: number;
  p2pPort: number;
  address: string;
  enode?: string;
  containerStatus?: {
    containerId: string;
    state: string;
    status: string;
  } | null;
}

interface NodesListProps {
  networkId: string;
}


import { useQuery } from "@tanstack/react-query";
const useNodes = (networkId: string) =>
  useQuery<{ success: boolean; nodes: any[]; error?: string }>({
    queryKey: ["nodes", networkId],
    queryFn: async () => {
      const res = await fetch(`/api/networks/${networkId}/nodes`);
      return res.json();
    },
    enabled: Boolean(networkId),
  });


const NodesList: React.FC<NodesListProps & { showFullAddress?: boolean }> = ({ networkId, showFullAddress }) => {
  // @ts-ignore
  const { data, isLoading, error } = useNodes(networkId);
  const queryClient = useQueryClient();

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const res = await fetch(`/api/networks/${networkId}/nodes/${nodeId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: (data, nodeId) => {
      if (data.success) {
        showNotification({
          title: "Node Deleted",
          message: `Node '${nodeId}' deleted successfully!`,
          color: "green",
          position: "bottom-right",
        });
        queryClient.invalidateQueries({ queryKey: ["nodes", networkId] });
      } else {
        showNotification({
          title: "Error",
          message: data.error || "Failed to delete node.",
          color: "red",
        });
      }
    },
    onError: (e: any) => {
      showNotification({
        title: "Error",
        message: e.message,
        color: "red",
      });
    },
  });

  const handleDeleteNode = (nodeId: string) => {
    confirmDeleteNode({
      nodeId,
      onConfirm: () => deleteNodeMutation.mutate(nodeId),
    });
  };

  if (isLoading) return <Loader size="sm" />;
  if (error)
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        color="red"
        title="Error loading nodes"
      >
        {(error as any)?.message || "Unknown error"}
      </Alert>
    );
  if (!data || !Array.isArray((data as any).nodes) || !(data as any).success)
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="API Error">
        {(data as any)?.error || "Failed to load nodes."}
      </Alert>
    );

  return (
    <Stack>
      {(data as any).nodes.length === 0 && (
        <Text color="dimmed">No nodes found for this network.</Text>
      )}
      {(data as any).nodes.map((node: Node) => (
        <Card key={node.id} shadow="xs" radius="md" withBorder>
          <Group style={{ justifyContent: "space-between", width: "100%" }}>
            <Text fw={500} style={{
              whiteSpace: 'nowrap',
              maxWidth: 120,
              width: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'inline-block',
            }}>{node.id}</Text>
            <Badge color={node.type === "miner" ? "yellow" : node.type === "validator" ? "teal" : "blue"}>{node.type}</Badge>
            <Badge color="gray">IP: {node.ip}</Badge>
            <Badge color="gray">RPC: {node.rpcPort}</Badge>
            <Badge color="gray">P2P: {node.p2pPort}</Badge>
            <Badge color="gray" style={{ maxWidth: 320, overflow: 'auto', textOverflow: 'ellipsis', whiteSpace: showFullAddress ? 'normal' : 'nowrap', wordBreak: showFullAddress ? 'break-all' : 'normal' }}>
              Address: {showFullAddress ? node.address : node.address.slice(0, 10) + '...'}
            </Badge>
            {node.containerStatus && (
              <Badge color={node.containerStatus.state === "running" ? "green" : "red"}>
                {node.containerStatus.state}
              </Badge>
            )}
            {node.type !== "bootnode" ? (
              <Button variant="subtle" color="red" size="xs" style={{ minWidth: 32, minHeight: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleDeleteNode(node.id)}>
                <IconTrash size={16} />
              </Button>
            ) : (
              <span style={{ display: 'inline-block', minWidth: 32, minHeight: 32 }} />
            )}
          </Group>
        </Card>
      ))}
    </Stack>
  );
};

export default NodesList;
